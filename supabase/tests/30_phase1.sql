\set ON_ERROR_STOP on
\set QUIET on

-- ---------- fixtures matching (superuser) ----------
select id as raanana from public.geo_places where name_fr = 'Raanana' \gset
select id as kfar from public.geo_places where name_fr = 'Kfar Saba' \gset

insert into public.contact_search_profiles (id, organization_id, contact_id, transaction, property_types, city_ids, price_max, rooms_min, rooms_max, must_have, nice_to_have)
values ('00000000-0000-0000-0000-0000000005a1', :'org_a', '00000000-0000-0000-0000-00000000a001', 'sale', '{apartment}', array[:'raanana'::uuid], 4000000, 3.5, 5, '{mamad,parking}', '{elevator}');

insert into public.properties (id, organization_id, transaction, property_type, status, agent_id, city_id, price, rooms, mamad, parking_count, elevator) values
 ('00000000-0000-0000-0000-0000000a0a01', :'org_a', 'sale', 'apartment', 'active', 'a0000000-0000-0000-0000-000000000001', :'raanana', 3500000, 4, true,  2, true),   -- parfait
 ('00000000-0000-0000-0000-0000000a0a02', :'org_a', 'sale', 'apartment', 'active', 'a0000000-0000-0000-0000-000000000001', :'raanana', 4800000, 4, true,  2, true),   -- +20 % : éliminé
 ('00000000-0000-0000-0000-0000000a0a03', :'org_a', 'sale', 'apartment', 'active', 'a0000000-0000-0000-0000-000000000001', :'raanana', 3200000, 4, false, 2, true),   -- sans mamad : éliminé
 ('00000000-0000-0000-0000-0000000a0a04', :'org_a', 'sale', 'apartment', 'active', 'a0000000-0000-0000-0000-000000000001', :'raanana', 4200000, 4, true,  1, false),  -- +5 %, sans ascenseur
 ('00000000-0000-0000-0000-0000000a0a05', :'org_a', 'sale', 'apartment', 'active', 'a0000000-0000-0000-0000-000000000001', :'kfar',    3000000, 4, true,  2, true),   -- autre ville : éliminé
 ('00000000-0000-0000-0000-0000000a0a06', :'org_a', 'sale', 'apartment', 'draft',  'a0000000-0000-0000-0000-000000000001', :'raanana', 3000000, 4, true,  2, true),   -- brouillon : éliminé
 ('00000000-0000-0000-0000-0000000a0b01', :'org_b', 'sale', 'apartment', 'active', 'b0000000-0000-0000-0000-000000000001', :'raanana', 3500000, 4, true,  2, true);   -- autre agence

-- ---------- 1. matching : pertinence ----------
begin;
select tests.login('a0000000-0000-0000-0000-000000000001', :'org_a');
select tests.assert((select count(*) from public.match_properties_for_contact('00000000-0000-0000-0000-00000000a001')) = 2, 'matching : exactement 2 biens retenus sur 6');
select tests.assert((select score from public.match_properties_for_contact('00000000-0000-0000-0000-00000000a001') where property_id = '00000000-0000-0000-0000-0000000a0a01') = 100, 'matching : bien parfait = 100');
select tests.assert((select score from public.match_properties_for_contact('00000000-0000-0000-0000-00000000a001') where property_id = '00000000-0000-0000-0000-0000000a0a04') = 84, 'matching : +5 % budget (−10) et sans ascenseur (−6) = 84');
select tests.assert(not exists (select 1 from public.match_properties_for_contact('00000000-0000-0000-0000-00000000a001') where property_id in
  ('00000000-0000-0000-0000-0000000a0a02','00000000-0000-0000-0000-0000000a0a03','00000000-0000-0000-0000-0000000a0a05','00000000-0000-0000-0000-0000000a0a06','00000000-0000-0000-0000-0000000a0b01')),
  'matching : éliminés (budget +20 %, sans mamad, autre ville, brouillon, autre agence)');
select tests.assert((select reasons @> '[{"code":"over_budget"}]' from public.match_properties_for_contact('00000000-0000-0000-0000-00000000a001') where property_id = '00000000-0000-0000-0000-0000000a0a04'), 'matching : raison over_budget exposée');
-- sens inverse
select tests.assert((select count(*) from public.match_contacts_for_property('00000000-0000-0000-0000-0000000a0a01')) = 1, 'matching inverse : 1 client pour le bien parfait');
select tests.assert((select count(*) from public.match_contacts_for_property('00000000-0000-0000-0000-0000000a0b01')) = 0, 'matching inverse : bien d''une autre agence → aucun client (RLS)');
rollback;

-- ---------- 2. matching : respect de la visibilité des contacts ----------
insert into public.role_capabilities (organization_id, role, capability, granted) values (:'org_a', 'agent', 'contacts.read_all', false);
begin;
select tests.login('a0000000-0000-0000-0000-000000000002', :'org_a');   -- agent A2, ne voit que ses contacts
select tests.assert((select count(*) from public.match_contacts_for_property('00000000-0000-0000-0000-0000000a0a01')) = 0, 'matching inverse : un agent ne voit pas les clients des autres (visibilité restreinte)');
select tests.assert((select count(*) from public.match_properties_for_contact('00000000-0000-0000-0000-00000000a001')) = 0, 'matching : critères d''un contact invisible → rien');
rollback;
delete from public.role_capabilities where organization_id = :'org_a';

-- ---------- 3. envoi déjà fait → exclu du matching ----------
begin;
select tests.login('a0000000-0000-0000-0000-000000000001', :'org_a');
insert into public.shares (organization_id, contact_id, channel, property_ids, status)
  values (:'org_a', '00000000-0000-0000-0000-00000000a001', 'email', array['00000000-0000-0000-0000-0000000a0a01'::uuid], 'sent');
select tests.assert((select count(*) from public.match_properties_for_contact('00000000-0000-0000-0000-00000000a001')) = 1, 'matching : un bien déjà envoyé n''est plus proposé');
rollback;

-- ---------- 4. pipeline / deals / tâches : isolation ----------
select tests.assert((select count(*) from public.pipeline_stages where organization_id = :'org_a') = 8, 'provisioning : 8 étapes de pipeline par défaut');
select stage_id from (select id as stage_id from public.pipeline_stages where organization_id = :'org_a' order by position limit 1) s \gset
select id as stage_b from public.pipeline_stages where organization_id = :'org_b' order by position limit 1 \gset
insert into public.deals (id, organization_id, contact_id, stage_id, agent_id, value) values
  ('00000000-0000-0000-0000-0000000de001', :'org_a', '00000000-0000-0000-0000-00000000a001', :'stage_id', 'a0000000-0000-0000-0000-000000000001', 3500000),
  ('00000000-0000-0000-0000-0000000de002', :'org_b', '00000000-0000-0000-0000-00000000b001', :'stage_b', 'b0000000-0000-0000-0000-000000000001', 2000000);
insert into public.tasks (organization_id, title, assignee_id, created_by) values
  (:'org_a', 'Tâche owner', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  (:'org_a', 'Tâche agent', 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002');
begin;
select tests.login('a0000000-0000-0000-0000-000000000001', :'org_a');
select tests.assert((select count(*) from public.deals) = 1, 'deals : owner A ne voit que les affaires de A');
select tests.assert((select count(*) from public.pipeline_stages) = 8, 'étapes : seules celles de A');
select tests.throws($$insert into public.deals (organization_id, contact_id, stage_id, value) values ('$$ || :'org_a' || $$','00000000-0000-0000-0000-00000000b001','$$ || :'stage_id' || $$', 1)$$, 'deal sur un contact d''une autre agence refusé');
select tests.throws($$insert into public.deals (organization_id, contact_id, stage_id, value) values ('$$ || :'org_b' || $$','00000000-0000-0000-0000-00000000b001','$$ || :'stage_b' || $$', 1)$$, 'deal dans l''agence B refusé');
select tests.assert((select count(*) from public.tasks) = 2, 'tâches : owner voit toutes les tâches de l''agence');
rollback;
begin;
select tests.login('a0000000-0000-0000-0000-000000000002', :'org_a');
select tests.assert((select count(*) from public.tasks) = 1, 'tâches : un agent ne voit que les siennes');
select tests.throws($$insert into public.tasks (organization_id, title, assignee_id) values ('$$ || :'org_a' || $$','Pour le boss','a0000000-0000-0000-0000-000000000001')$$, 'un agent ne peut pas assigner une tâche à un autre');
rollback;
begin;
select tests.login('b0000000-0000-0000-0000-000000000001', :'org_b');
select tests.assert((select count(*) from public.deals) = 1 and (select count(*) from public.tasks) = 0, 'agence B : ne voit ni les affaires ni les tâches de A');
select tests.assert((select count(*) from public.contact_search_profiles) = 0, 'agence B : ne voit pas les critères de A');
rollback;
\echo ''
\echo '=== TESTS PHASE 1 PASSENT ==='
