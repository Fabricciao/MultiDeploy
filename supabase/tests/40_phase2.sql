\set ON_ERROR_STOP on
\set QUIET on

-- ---------- crédits IA ----------
begin;
select tests.login('a0000000-0000-0000-0000-000000000001', :'org_a');
select tests.assert(public.ai_balance() = 50, 'crédits : 50 crédits d''essai offerts à la création de l''agence');
select tests.assert(public.ai_spend(6, 'poster_creative') = 44, 'crédits : débit de 6 → solde 44');
select tests.assert(public.ai_spend(0, 'poster_faithful') = 44, 'crédits : affiche « fidèle » gratuite (0) sans écriture');
select tests.throws($$select public.ai_spend(100, 'too_much')$$, 'crédits : solde insuffisant refusé');
select tests.assert(public.ai_balance() = 44, 'crédits : le refus n''a rien débité');
select tests.throws($$select public.ai_spend(-5, 'free_money')$$, 'crédits : coût négatif refusé (pas de crédit créé par l''appelant)');
select tests.throws($$insert into public.ai_credit_ledger (organization_id, delta, reason) values ('$$ || :'org_a' || $$', 1000, 'hack')$$, 'crédits : écriture directe dans le grand livre refusée');
rollback;
begin;
select tests.login('a0000000-0000-0000-0000-000000000001', :'org_a');
select tests.assert((select count(*) from public.ai_credit_ledger) >= 1 and (select count(*) from public.ai_credit_ledger where organization_id = :'org_b') = 0, 'crédits : le grand livre de B est invisible pour A');
rollback;
-- un viewer ne peut pas dépenser
insert into auth.users (id, email) values ('e0000000-0000-0000-0000-000000000001','viewer@a.test');
insert into public.memberships (organization_id, user_id, role) values (:'org_a', 'e0000000-0000-0000-0000-000000000001', 'viewer');
begin;
select tests.login('e0000000-0000-0000-0000-000000000001', :'org_a');
select tests.throws($$select public.ai_spend(1, 'x')$$, 'crédits : un « lecture seule » ne peut pas dépenser');
rollback;
-- ai_grant réservé au service
begin;
select tests.login('a0000000-0000-0000-0000-000000000001', :'org_a');
select tests.throws($$select public.ai_grant('$$ || :'org_a' || $$', 999, 'self')$$, 'crédits : un utilisateur ne peut pas s''attribuer des crédits');
rollback;

-- ---------- ai_jobs : visibles par leur auteur (et les gestionnaires) ----------
insert into public.ai_jobs (id, organization_id, kind, target, created_by, status) values
 ('00000000-0000-0000-0000-0000000a1001', :'org_a', 'intake_text', 'contact', 'a0000000-0000-0000-0000-000000000001', 'needs_review'),
 ('00000000-0000-0000-0000-0000000a1002', :'org_a', 'intake_text', 'contact', 'a0000000-0000-0000-0000-000000000002', 'needs_review');
begin;
select tests.login('a0000000-0000-0000-0000-000000000002', :'org_a');
select tests.assert((select count(*) from public.ai_jobs) = 1, 'ai_jobs : un agent ne voit que ses propres dictées');
rollback;
begin;
select tests.login('a0000000-0000-0000-0000-000000000001', :'org_a');
select tests.assert((select count(*) from public.ai_jobs) = 2, 'ai_jobs : le propriétaire voit celles de l''agence');
select tests.throws($$insert into public.ai_jobs (organization_id, kind, target, created_by) values ('$$ || :'org_a' || $$','intake_text','contact','a0000000-0000-0000-0000-000000000002')$$, 'ai_jobs : impossible de créer une tâche au nom d''un autre');
rollback;
begin;
select tests.login('b0000000-0000-0000-0000-000000000001', :'org_b');
select tests.assert((select count(*) from public.ai_jobs) = 0, 'ai_jobs : invisibles pour l''autre agence');
rollback;

-- ---------- charte : versionnage automatique ----------
begin;
select tests.login('a0000000-0000-0000-0000-000000000001', :'org_a');
update public.brand_kits set colors = '{"primary":"#0f766e","accent":"#d99a2b"}' where organization_id = :'org_a';
select tests.assert((select version from public.brand_kits where organization_id = :'org_a') = 2, 'charte : la version passe à 2 après modification');
select tests.assert((select count(*) from public.brand_kit_versions where organization_id = :'org_a') = 1, 'charte : l''ancienne version est archivée');
update public.brand_kits set updated_at = now() where organization_id = :'org_a';
select tests.assert((select version from public.brand_kits where organization_id = :'org_a') = 2, 'charte : une écriture sans changement ne crée pas de version');
rollback;
begin;
select tests.login('a0000000-0000-0000-0000-000000000002', :'org_a');
with u as (update public.brand_kits set colors = '{"primary":"#ff0000"}' returning 1) select tests.assert((select count(*) from u) = 0, 'charte : un agent ne peut pas modifier la charte');
select tests.assert((select count(*) from public.brand_kit_versions) = 0, 'charte : un agent ne lit pas l''historique');
rollback;

-- ---------- affiches ----------
begin;
select tests.login('a0000000-0000-0000-0000-000000000002', :'org_a');
insert into public.poster_generations (organization_id, property_id, format, locale, template, output_path, width, height)
  values (:'org_a', '00000000-0000-0000-0000-0000000a0a01', 'portrait', 'he', 'A', 'x/y.png', 1080, 1350);
select tests.throws($$insert into public.poster_generations (organization_id, property_id, format, locale, template, output_path, width, height) values ('$$ || :'org_a' || $$','00000000-0000-0000-0000-0000000a0b01','square','fr','A','x.png',1,1)$$, 'affiches : impossible de générer pour un bien d''une autre agence');
select tests.assert((select count(*) from public.poster_generations) = 1, 'affiches : visibles dans l''agence');
rollback;
begin;
select tests.login('b0000000-0000-0000-0000-000000000001', :'org_b');
select tests.assert((select count(*) from public.poster_generations) = 0, 'affiches : invisibles pour l''autre agence');
rollback;
select tests.throws($$insert into public.poster_generations (organization_id, property_id, format, locale, template, output_path, width, height, params, created_by) values ('$$ || :'org_a' || $$','00000000-0000-0000-0000-0000000a0a01','square','fr','A','x',1,1,to_jsonb('s'::text),'a0000000-0000-0000-0000-000000000001')$$, 'affiches : params doit être un objet JSON');
\echo '=== TESTS PHASE 2 PASSENT ==='
