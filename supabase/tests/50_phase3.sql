\set ON_ERROR_STOP on
\set QUIET on

-- ---------- sièges (plan) ----------
insert into auth.users (id, email) values ('f0000000-0000-0000-0000-000000000001','t1@t.test'),('f0000000-0000-0000-0000-000000000002','t2@t.test'),('f0000000-0000-0000-0000-000000000003','t3@t.test'),('f0000000-0000-0000-0000-000000000004','t4@t.test');
select public.provision_organization('essai','Essai','ניסוי','Trial','fr','f0000000-0000-0000-0000-000000000001') as org_t \gset
insert into public.memberships (organization_id, user_id, role) values (:'org_t','f0000000-0000-0000-0000-000000000002','agent'),(:'org_t','f0000000-0000-0000-0000-000000000003','agent');
select tests.throws($$insert into public.memberships (organization_id, user_id, role) values ('$$ || :'org_t' || $$','f0000000-0000-0000-0000-000000000004','agent')$$, 'plan Essai : 4e siège refusé (limite 3)');
update public.organizations set settings = '{"seats_override": 4}' where id = :'org_t';
insert into public.memberships (organization_id, user_id, role) values (:'org_t','f0000000-0000-0000-0000-000000000004','agent');
select tests.assert(true, 'surcharge de sièges par la plateforme acceptée');

-- ---------- dernier owner ----------
select tests.throws($$update public.memberships set role = 'agent' where organization_id = '$$ || :'org_t' || $$' and user_id = 'f0000000-0000-0000-0000-000000000001'$$, 'dernier owner : rétrogradation refusée');
select tests.throws($$delete from public.memberships where organization_id = '$$ || :'org_t' || $$' and user_id = 'f0000000-0000-0000-0000-000000000001'$$, 'dernier owner : suppression refusée');
select tests.throws($$update public.memberships set status = 'disabled' where organization_id = '$$ || :'org_t' || $$' and user_id = 'f0000000-0000-0000-0000-000000000001'$$, 'dernier owner : désactivation refusée');
update public.organizations set settings = '{"seats_override": 5}' where id = :'org_t';
insert into public.memberships (organization_id, user_id, role) select :'org_t', id, 'owner' from auth.users where email = 'multi@both.test';
update public.memberships set role = 'agent' where organization_id = :'org_t' and user_id = 'f0000000-0000-0000-0000-000000000001';
select tests.assert(true, 'avec un 2e owner, le premier peut être rétrogradé');

-- ---------- invitations ----------
begin;
select tests.login('a0000000-0000-0000-0000-000000000001', :'org_a');
insert into public.invitations (organization_id, email, role, token_hash, created_by) values (:'org_a', 'newbie@a.test', 'agent', encode(extensions.digest('tok-123', 'sha256'), 'hex'), 'a0000000-0000-0000-0000-000000000001');
select tests.assert((select count(*) from public.invitations) = 1, 'invitation créée par l''owner');
select tests.throws($$insert into public.invitations (organization_id, email, role, token_hash, created_by) values ('$$ || :'org_a' || $$','x@a.test','owner','h','a0000000-0000-0000-0000-000000000001')$$, 'un tenant ne peut pas inviter un owner');
rollback;
insert into auth.users (id, email) values ('f1000000-0000-0000-0000-000000000001','newbie@a.test'),('f1000000-0000-0000-0000-000000000002','other@a.test');
insert into public.invitations (organization_id, email, role, token_hash) values (:'org_a', 'newbie@a.test', 'agent', encode(extensions.digest('tok-ok', 'sha256'), 'hex')),
  (:'org_a', 'newbie@a.test', 'agent', encode(extensions.digest('tok-old', 'sha256'), 'hex'));
update public.invitations set expires_at = now() - interval '1 day' where token_hash = encode(extensions.digest('tok-old', 'sha256'), 'hex');
begin;
select tests.login('f1000000-0000-0000-0000-000000000002', :'org_a');
select tests.throws($$select public.accept_invitation('tok-ok')$$, 'invitation : un autre compte ne peut pas l''accepter');
rollback;
begin;
select tests.login('f1000000-0000-0000-0000-000000000001', :'org_a');
select tests.throws($$select public.accept_invitation('tok-old')$$, 'invitation expirée refusée');
select tests.throws($$select public.accept_invitation('nope')$$, 'jeton inconnu refusé');
select tests.assert(public.accept_invitation('tok-ok') = :'org_a'::uuid, 'invitation acceptée par le bon compte');
select tests.throws($$select public.accept_invitation('tok-ok')$$, 'invitation à usage unique');
rollback;

-- ---------- impersonation (lecture seule, administrateurs de plateforme uniquement) ----------
insert into auth.users (id, email) values ('99000000-0000-0000-0000-000000000001','root@platform.test');
insert into public.platform_admins values ('99000000-0000-0000-0000-000000000001');
begin;
select set_config('request.jwt.claims', json_build_object('sub','99000000-0000-0000-0000-000000000001','role','authenticated','org_id', :'org_a'::text)::text, true); set local role authenticated;
select tests.assert((select count(*) from public.contacts) = 0, 'plateforme SANS claim imp : aucune donnée d''agence');
rollback;
begin;
select set_config('request.jwt.claims', json_build_object('sub','99000000-0000-0000-0000-000000000001','role','authenticated','org_id', :'org_a'::text, 'imp','1')::text, true); set local role authenticated;
select tests.assert((select count(*) from public.contacts) >= 1, 'impersonation : l''admin plateforme lit les données de l''agence');
select tests.assert(app.role() = 'viewer', 'impersonation : rôle effectif = lecture seule');
select tests.throws($$insert into public.contacts (organization_id, first_name) values ('$$ || :'org_a' || $$','Pirate')$$, 'impersonation : écriture refusée');
with u as (update public.contacts set notes = 'x' returning 1) select tests.assert((select count(*) from u) = 0, 'impersonation : modification sans effet');
rollback;
begin;  -- un simple agent qui forge imp=1 n'obtient rien
select set_config('request.jwt.claims', json_build_object('sub','b0000000-0000-0000-0000-000000000001','role','authenticated','org_id', :'org_a'::text, 'imp','1')::text, true); set local role authenticated;
select tests.assert((select count(*) from public.contacts) = 0, 'claim imp forgé par un non-admin plateforme : ignoré');
rollback;

-- ---------- clés d'API / webhooks ----------
begin;
select tests.login('a0000000-0000-0000-0000-000000000001', :'org_a');
insert into public.api_keys (organization_id, name, key_prefix, key_hash) values (:'org_a', 'site', 'mdk_abc', 'hash-a');
insert into public.webhook_endpoints (organization_id, url, events) values (:'org_a', 'https://hooks.example.test/in', '{property.created}');
select tests.throws($$insert into public.webhook_endpoints (organization_id, url) values ('$$ || :'org_a' || $$','http://insecure.test')$$, 'webhook : URL non-HTTPS refusée');
select tests.assert((select count(*) from public.api_keys) = 1 and (select count(*) from public.webhook_endpoints) = 1, 'owner : gère clés et webhooks');
rollback;
insert into public.api_keys (organization_id, name, key_prefix, key_hash) values (:'org_a', 'site', 'mdk_abc', 'hash-a');
insert into public.webhook_endpoints (id, organization_id, url, events) values ('00000000-0000-0000-0000-0000000e0001', :'org_a', 'https://hooks.example.test/in', '{property.created}');
begin;
select tests.login('a0000000-0000-0000-0000-000000000002', :'org_a');
select tests.assert((select count(*) from public.api_keys) = 0 and (select count(*) from public.webhook_endpoints) = 0, 'agent : ne voit ni clés ni webhooks');
rollback;
begin;
select tests.login('b0000000-0000-0000-0000-000000000001', :'org_b');
select tests.assert((select count(*) from public.api_keys) = 0 and (select count(*) from public.webhook_endpoints) = 0, 'autre agence : ne voit pas les clés/webhooks de A');
rollback;
insert into public.properties (organization_id, transaction, property_type) values (:'org_a', 'sale', 'apartment');
select tests.assert((select count(*) from public.webhook_deliveries where endpoint_id = '00000000-0000-0000-0000-0000000e0001') = 1, 'outbox : la création d''un bien déclenche 1 livraison webhook');
insert into public.contacts (organization_id, first_name) values (:'org_a', 'Evt');
select tests.assert((select count(*) from public.webhook_deliveries where endpoint_id = '00000000-0000-0000-0000-0000000e0001') = 1, 'outbox : l''endpoint abonné seulement à property.created ne reçoit pas contact.created');
insert into public.properties (organization_id, transaction, property_type) values (:'org_b', 'sale', 'apartment');
select tests.assert((select count(*) from public.webhook_deliveries where endpoint_id = '00000000-0000-0000-0000-0000000e0001') = 1, 'outbox : un événement de l''agence B n''atteint pas le webhook de A');

-- ---------- crédits mensuels, rétention, effacement ----------
update public.organizations set plan = 'starter' where id = :'org_a';
select tests.assert(public.grant_monthly_credits() >= 1, 'crédits mensuels : attribués');
select tests.assert(public.grant_monthly_credits() = 0, 'crédits mensuels : idempotent dans le mois');
insert into public.contacts (id, organization_id, first_name, deleted_at) values ('00000000-0000-0000-0000-0000000d0001', :'org_a', 'Vieux', now() - interval '40 days'), ('00000000-0000-0000-0000-0000000d0002', :'org_a', 'Récent', now() - interval '2 days');
select public.purge_trash() as purged \gset
select tests.assert(:purged >= 1 and not exists (select 1 from public.contacts where id = '00000000-0000-0000-0000-0000000d0001') and exists (select 1 from public.contacts where id = '00000000-0000-0000-0000-0000000d0002'), 'corbeille : purge > 30 j, garde les récents');
begin;
select tests.login('a0000000-0000-0000-0000-000000000001', :'org_a');
insert into public.activities (organization_id, kind, contact_id, summary, payload) values (:'org_a', 'whatsapp', '00000000-0000-0000-0000-00000000a001', 'Bonjour je cherche un 4 pièces', '{"wa_id":"x1"}');
select public.anonymize_contact('00000000-0000-0000-0000-00000000a001');
select tests.assert((select summary is null and payload is null from public.activities where kind = 'whatsapp' and contact_id = '00000000-0000-0000-0000-00000000a001' limit 1), 'effacement : messages WhatsApp entrants purgés');
select tests.assert((select first_name is null and phones = '[]'::jsonb and do_not_contact and notes is null from public.contacts where id = '00000000-0000-0000-0000-00000000a001') is not false, 'effacement : données personnelles supprimées');
rollback;
begin;
select tests.login('b0000000-0000-0000-0000-000000000001', :'org_b');
select tests.throws($$select public.anonymize_contact('00000000-0000-0000-0000-00000000a001')$$, 'effacement : impossible sur le contact d''une autre agence');
select app.scrub_contact_activities('00000000-0000-0000-0000-00000000a001');
select tests.assert((select count(*) from public.activities where contact_id = '00000000-0000-0000-0000-00000000a001') = 0, 'effacement : le nettoyage direct ne touche pas une autre agence');
rollback;
select tests.assert(app.org_feature(:'org_a', 'api') = false and app.org_feature(:'org_t', 'custom_domain') = false, 'fonctionnalités par plan : starter sans API');
update public.organizations set plan = 'agency_plus' where id = :'org_a';
select tests.assert(app.org_feature(:'org_a', 'custom_domain'), 'fonctionnalités par plan : Agence+ avec domaine personnalisé');
select public.purge_organization(:'org_t', '99000000-0000-0000-0000-000000000001');
select tests.assert(not exists (select 1 from public.organizations where id = :'org_t') and exists (select 1 from public.platform_audit_log where action = 'purge_organization'), 'purge d''agence : supprimée en cascade + journal plateforme');
\echo '=== TESTS PHASE 3 PASSENT ==='

-- ---------- corbeille : suppression logique sous RLS ----------
begin;
select tests.login('a0000000-0000-0000-0000-000000000001', :'org_a');
with u as (update public.properties set deleted_at = now(), status = 'withdrawn' where id = '00000000-0000-0000-0000-0000000a0a01' returning 1) select tests.assert((select count(*) from u) = 1, 'corbeille : archiver un bien (soft delete) fonctionne sous RLS');
with u as (update public.contacts set deleted_at = now() where id = '00000000-0000-0000-0000-00000000a002' returning 1) select tests.assert((select count(*) from u) = 1, 'corbeille : archiver un contact fonctionne sous RLS');
select tests.assert((select count(*) from public.match_properties_for_contact('00000000-0000-0000-0000-00000000a001') where property_id = '00000000-0000-0000-0000-0000000a0a01') = 0, 'corbeille : un bien archivé sort du matching');
rollback;
begin;  -- un viewer ne voit pas la corbeille
select tests.login('e0000000-0000-0000-0000-000000000001', :'org_a');
select tests.assert((select count(*) from public.properties where deleted_at is not null) = 0, 'corbeille : invisible pour un rôle sans droit d''écriture');
rollback;
begin;  -- l'autre agence ne voit jamais la corbeille de A
select tests.login('b0000000-0000-0000-0000-000000000001', :'org_b');
select tests.assert((select count(*) from public.properties where organization_id = :'org_a') = 0, 'corbeille : cloisonnée entre agences');
rollback;
\echo '=== CORBEILLE OK ==='

-- ---------- règles sur les owners ----------
insert into auth.users (id, email) values ('f2000000-0000-0000-0000-000000000001','adm@a.test');
insert into public.memberships (organization_id, user_id, role) values (:'org_a','f2000000-0000-0000-0000-000000000001','admin');
begin;
select tests.login('f2000000-0000-0000-0000-000000000001', :'org_a');
with u as (update public.memberships set role = 'agent' where organization_id = :'org_a' and user_id = 'a0000000-0000-0000-0000-000000000001' returning 1) select tests.assert((select count(*) from u) = 0, 'un admin ne peut pas rétrograder un owner');
select tests.throws($$update public.memberships set role = 'owner' where organization_id = '$$ || :'org_a' || $$' and user_id = 'f2000000-0000-0000-0000-000000000001'$$, 'un admin ne peut pas se promouvoir owner');
with u as (update public.memberships set role = 'assistant' where organization_id = :'org_a' and user_id = 'a0000000-0000-0000-0000-000000000002' returning 1) select tests.assert((select count(*) from u) = 1, 'un admin gère les agents');
rollback;
begin;
select tests.login('a0000000-0000-0000-0000-000000000001', :'org_a');
with u as (update public.memberships set role = 'owner' where organization_id = :'org_a' and user_id = 'a0000000-0000-0000-0000-000000000002' returning 1) select tests.assert((select count(*) from u) = 1, 'un owner peut promouvoir un autre owner');
rollback;
\echo '=== RÈGLES OWNER OK ==='

-- ---------- livraisons webhook : lecture cloisonnée ----------
begin;
select tests.login('a0000000-0000-0000-0000-000000000001', :'org_a');
select tests.assert((select count(*) from public.webhook_deliveries) >= 1, 'livraisons : l''owner voit celles de ses endpoints');
select tests.throws($$update public.webhook_deliveries set status = 'delivered'$$, 'livraisons : aucune écriture par l''utilisateur');
rollback;
begin;
select tests.login('b0000000-0000-0000-0000-000000000001', :'org_b');
select tests.assert((select count(*) from public.webhook_deliveries) = 0, 'livraisons : invisibles pour une autre agence');
rollback;
\echo '=== LIVRAISONS OK ==='

-- ---------- connexions externes : secrets chiffrés inaccessibles au client ----------
insert into public.org_integrations (organization_id, provider, config_enc, public_meta) values (:'org_a', 'whatsapp', 'v1.fake.fake.fake', '{"phone_number_id":"123"}');
begin;
select tests.login('a0000000-0000-0000-0000-000000000001', :'org_a');
select tests.throws($$select config_enc from public.org_integrations$$, 'le client ne peut pas lire la colonne chiffrée (config_enc)');
select tests.assert((select count(*) from public.org_integrations_meta) = 1, 'métadonnées non secrètes lisibles par l''admin');
select tests.throws($$update public.org_integrations set status = 'error'$$, 'aucune écriture directe par le client');
rollback;
begin;
select tests.login('a0000000-0000-0000-0000-000000000002', :'org_a');
select tests.assert((select count(*) from public.org_integrations_meta) = 0, 'un agent ne voit pas les connexions de l''agence');
rollback;
begin;
select tests.login('b0000000-0000-0000-0000-000000000001', :'org_b');
select tests.assert((select count(*) from public.org_integrations_meta) = 0, 'autre agence : connexions invisibles');
rollback;
\echo '=== CONNEXIONS OK ==='
