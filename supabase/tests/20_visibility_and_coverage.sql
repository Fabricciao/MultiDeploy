\set ON_ERROR_STOP on
\set QUIET on

-- ---------- 4. visibilité réglable des contacts (surcharge par agence) ----------
insert into public.role_capabilities (organization_id, role, capability, granted)
values (:'org_a', 'agent', 'contacts.read_all', false);
begin;
select tests.login('a0000000-0000-0000-0000-000000000002', :'org_a');
select tests.assert((select count(*) from public.contacts) = 1, 'surcharge : l''agent ne voit plus que ses contacts');
rollback;
insert into public.contact_shares (contact_id, user_id, organization_id)
values ('00000000-0000-0000-0000-00000000a001','a0000000-0000-0000-0000-000000000002', :'org_a');
begin;
select tests.login('a0000000-0000-0000-0000-000000000002', :'org_a');
select tests.assert((select count(*) from public.contacts) = 2, 'un contact partagé redevient visible');
rollback;
-- la surcharge d'une agence n'affecte pas l'autre
delete from public.contact_shares;
begin;
select tests.login('c0000000-0000-0000-0000-000000000001', :'org_b');
select tests.assert((select count(*) from public.contacts) = 1, 'multi-membre : seule l''agence B active est visible');
rollback;

delete from public.role_capabilities where organization_id = :'org_a';

-- ---------- 5. claims périmés / usurpés ----------
begin;  -- utilisateur sans aucune appartenance, claim vers A
select tests.login('d0000000-0000-0000-0000-000000000001', :'org_a');
select tests.assert((select count(*) from public.contacts) = 0 and (select count(*) from public.properties) = 0
  and (select count(*) from public.organizations) = 0, 'non-membre avec org_id forgé = aucune donnée');
select tests.throws($$insert into public.contacts (organization_id, first_name) values ('$$ || :'org_a' || $$','X')$$, 'non-membre ne peut pas écrire');
rollback;
begin;  -- retrait d'un membre : accès coupé immédiatement malgré un token encore valide
update public.memberships set status = 'disabled' where user_id = 'a0000000-0000-0000-0000-000000000002' and organization_id = :'org_a';
select tests.login('a0000000-0000-0000-0000-000000000002', :'org_a');
select tests.assert((select count(*) from public.contacts) = 0, 'membre désactivé : accès coupé sans attendre l''expiration du JWT');
rollback;
begin;  -- agence suspendue
update public.organizations set status = 'suspended' where id = :'org_b';
select tests.login('b0000000-0000-0000-0000-000000000001', :'org_b');
select tests.assert((select count(*) from public.properties) = 0, 'agence suspendue : plus d''accès aux données');
rollback;
begin;  -- sélecteur d'agence : le multi-membre bascule
select tests.login('c0000000-0000-0000-0000-000000000001', :'org_a');
select tests.assert((select count(*) from public.contacts) = 2 and (select count(*) from public.organizations) = 2, 'multi-membre sur A voit A (+ liste de ses 2 agences)');
select tests.login('c0000000-0000-0000-0000-000000000001', :'org_b');
select tests.assert((select count(*) from public.properties) = 1, 'même utilisateur sur B voit B');
rollback;

-- ---------- 6. anonyme ----------
begin;
set local role anon;
select tests.throws('select count(*) from public.contacts', 'anon ne peut rien lire (privilèges révoqués)');
rollback;

-- ---------- 7. unicité téléphone par agence ----------
-- même numéro autorisé dans A et B (fixtures), refusé en doublon dans la même agence
select tests.throws($$insert into public.contacts (organization_id, first_name, phones) values ('$$ || :'org_a' || $$','Dup','[{"e164":"+972501110001"}]')$$, 'doublon de téléphone refusé dans la même agence');

-- ---------- 8. hook JWT ----------
select tests.assert(
  (public.custom_access_token_hook(jsonb_build_object('user_id','c0000000-0000-0000-0000-000000000001','claims','{}'::jsonb))
     -> 'claims' ->> 'org_id') is not null, 'hook : org_id ajouté aux claims');

-- ---------- 9. référence auto + recherche hébreu ----------
begin;
select tests.login('a0000000-0000-0000-0000-000000000001', :'org_a');
insert into public.properties (organization_id, transaction, property_type, street)
  values (:'org_a', 'sale', 'apartment', 'רחוב הַרְצֵל') returning reference \gset
select tests.assert(:'reference' ~ '^P-[0-9]{4}-0001$' or :'reference' ~ '^P-[0-9]{4}-0002$', 'référence auto générée: ' || :'reference');
select tests.assert((select count(*) from public.properties where search_text like '%הרצל%') = 1, 'recherche hébreu insensible aux niqqud');
rollback;

-- ---------- 10. couverture structurelle ----------
select tests.assert(not exists (
  select 1 from pg_tables where schemaname='public' and not rowsecurity),
  'toutes les tables public ont RLS activée');
select tests.assert(not exists (
  select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r'
    and not exists (select 1 from pg_policy p where p.polrelid=c.oid)
    and c.relname not in ('platform_admins','org_counters','billing_events','platform_audit_log','outbox_events','webhook_deliveries')),
  'toute table public a au moins une policy (sauf liste blanche service-only)');
select tests.assert(not exists (
  select 1 from information_schema.tables t
  where t.table_schema='public' and t.table_type='BASE TABLE'
    and t.table_name not in ('organizations','profiles','platform_admins','geo_places','plans','billing_events','webhook_deliveries')
    and not exists (select 1 from information_schema.columns c
      where c.table_schema='public' and c.table_name=t.table_name and c.column_name='organization_id')
    and t.table_name <> 'contact_shares'),
  'toute table métier porte organization_id');
select tests.assert(not exists (
  select 1 from information_schema.columns c
  where c.table_schema='public' and c.column_name='organization_id' and c.is_nullable='YES'
    and c.table_name not in ('role_capabilities','audit_log','platform_audit_log')),
  'organization_id est NOT NULL partout (sauf défauts globaux et audit)');
select tests.assert(not has_table_privilege('anon','public.contacts','select'), 'anon sans privilège sur contacts');
\echo ''
\echo '=== TOUS LES TESTS D''ISOLATION PASSENT ==='
