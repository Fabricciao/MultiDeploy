-- Tests d'isolation multi-tenant (SQL pur, sans pgTAP). Échec = exception = code de sortie ≠ 0.
\set ON_ERROR_STOP on
\set QUIET on

create schema tests;
-- Helper : se met dans la peau d'un utilisateur Supabase avec un org_id actif.
create function tests.login(uid uuid, org uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'org_id', org)::text, true);
  execute 'set local role authenticated';
end $$;
create function tests.logout() returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('request.jwt.claims', '', true); end $$;
create function tests.assert(ok boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(ok,false) then raise exception 'ÉCHEC: %', msg; end if; raise notice 'ok  - %', msg; end $$;
create function tests.throws(sql text, msg text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then raise notice 'ok  - % (%)', msg, sqlerrm; return; end;
  raise exception 'ÉCHEC (aucune erreur levée): %', msg;
end $$;
grant usage on schema tests to public;
grant execute on all functions in schema tests to public;

-- ---------- fixtures (superuser) ----------
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001','owner-a@a.test'),
  ('a0000000-0000-0000-0000-000000000002','agent-a@a.test'),
  ('b0000000-0000-0000-0000-000000000001','owner-b@b.test'),
  ('c0000000-0000-0000-0000-000000000001','multi@both.test'),
  ('d0000000-0000-0000-0000-000000000001','nobody@x.test');

select public.provision_organization('agence-a','Agence A','סוכנות א','Agency A','fr','a0000000-0000-0000-0000-000000000001') as org_a \gset
select public.provision_organization('agence-b','Agence B','סוכנות ב','Agency B','he','b0000000-0000-0000-0000-000000000001') as org_b \gset

update public.organizations set plan = 'pro';   -- les fixtures ont besoin de plus de 3 sièges
insert into public.memberships (organization_id, user_id, role) values
  (:'org_a','a0000000-0000-0000-0000-000000000002','agent'),
  (:'org_a','c0000000-0000-0000-0000-000000000001','agent'),
  (:'org_b','c0000000-0000-0000-0000-000000000001','admin');

insert into public.contacts (id, organization_id, first_name, phones, owner_id) values
  ('00000000-0000-0000-0000-00000000a001', :'org_a', 'Alice',  '[{"e164":"+972501110001"}]', 'a0000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-00000000a002', :'org_a', 'Agnès',  '[{"e164":"+972501110002"}]', 'a0000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-00000000b001', :'org_b', 'Boaz',   '[{"e164":"+972501110001"}]', 'b0000000-0000-0000-0000-000000000001');
insert into public.properties (id, organization_id, transaction, property_type, agent_id, price, rooms) values
  ('00000000-0000-0000-0000-0000000000a1', :'org_a', 'sale', 'apartment', 'a0000000-0000-0000-0000-000000000001', 2500000, 4),
  ('00000000-0000-0000-0000-0000000000b1', :'org_b', 'rent', 'apartment', 'b0000000-0000-0000-0000-000000000001', 6000, 3.5);

-- ---------- 1. lecture croisée ----------
begin;
select tests.login('a0000000-0000-0000-0000-000000000001', :'org_a');
select tests.assert((select count(*) from public.contacts) = 2, 'owner A voit uniquement les 2 contacts de A');
select tests.assert((select count(*) from public.contacts where id = '00000000-0000-0000-0000-00000000b001') = 0, 'contact de B invisible pour A');
select tests.assert((select count(*) from public.properties) = 1, 'owner A ne voit que le bien de A');
select tests.assert((select count(*) from public.properties where id='00000000-0000-0000-0000-0000000000b1') = 0, 'bien de B invisible pour A');
select tests.assert((select count(*) from public.organizations) = 1, 'owner A ne voit que son organisation');
select tests.assert((select count(*) from public.memberships) = 3, 'memberships limitées à l''agence A');
select tests.assert((select count(*) from public.brand_kits) = 1, 'brand kit de A uniquement');
select tests.assert((select count(*) from public.audit_log where organization_id = :'org_b') = 0, 'audit de B invisible');
rollback;

-- ---------- 2. écriture croisée ----------
begin;
select tests.login('a0000000-0000-0000-0000-000000000001', :'org_a');
select tests.throws($$insert into public.contacts (organization_id, first_name) values ('$$ || :'org_b' || $$', 'Intrus')$$, 'INSERT dans l''agence B refusé');
select tests.throws($$insert into public.properties (organization_id, transaction, property_type) values ('$$ || :'org_b' || $$','sale','house')$$, 'INSERT bien dans B refusé');
with u as (update public.contacts set first_name = 'Pwned' where id = '00000000-0000-0000-0000-00000000b001' returning 1)
select tests.assert((select count(*) from u) = 0, 'UPDATE du contact de B affecte 0 ligne');
with d as (delete from public.contacts where id = '00000000-0000-0000-0000-00000000b001' returning 1)
select tests.assert((select count(*) from d) = 0, 'DELETE du contact de B affecte 0 ligne');
-- sortie de tenant par UPDATE (déplacer une ligne vers B)
select tests.throws($$update public.contacts set organization_id = '$$ || :'org_b' || $$' where id = '00000000-0000-0000-0000-00000000a001'$$, 'déplacement d''une ligne de A vers B refusé');
rollback;

-- ---------- 3. rôles ----------
begin;
select tests.login('a0000000-0000-0000-0000-000000000002', :'org_a');
select tests.assert((select count(*) from public.contacts) = 2, 'agent voit tous les contacts (read_all par défaut)');
select tests.throws($$insert into public.memberships (organization_id,user_id,role) values ('$$ || :'org_a' || $$','d0000000-0000-0000-0000-000000000001','agent')$$, 'agent ne peut pas gérer les membres');
select tests.throws($$insert into public.memberships (organization_id,user_id,role) values ('$$ || :'org_a' || $$','d0000000-0000-0000-0000-000000000001','owner')$$, 'personne ne crée un owner par SQL direct');
with u as (update public.organizations set name_fr = 'Hack' returning 1)
select tests.assert((select count(*) from u) = 0, 'agent ne peut pas modifier l''organisation');
with u as (update public.contacts set notes = 'x' where id = '00000000-0000-0000-0000-00000000a001' returning 1)
select tests.assert((select count(*) from u) = 0, 'agent ne modifie pas le contact d''un autre agent');
with u as (update public.contacts set notes = 'x' where id = '00000000-0000-0000-0000-00000000a002' returning 1)
select tests.assert((select count(*) from u) = 1, 'agent modifie son propre contact');
select tests.assert((select count(*) from public.audit_log) = 0, 'agent ne lit pas le journal d''audit');
select tests.throws($$insert into public.audit_log (action) values ('forge')$$, 'agent ne peut pas écrire dans l''audit');
with u as (update public.role_capabilities set granted = true returning 1)
select tests.assert((select count(*) from u) = 0, 'agent ne peut pas modifier les capacités');
rollback;
