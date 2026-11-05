# Déploiement

## 1. Supabase
1. Créer le projet. `supabase link` puis `supabase db push` (applique `supabase/migrations/*`, dans l'ordre, jusqu'à 000016).
2. Auth → Providers : Google (client OAuth) ; Email (magic link). URL du site + redirections : `https://<domaine>/auth/callback`.
3. Auth → Hooks : « Custom access token » = `public.custom_access_token_hook` (claim `org_id`).
4. Storage : bucket **privé** `agency-files` (`STORAGE_BUCKET`).
5. Créer le compte plateforme : insérer votre `user_id` dans `platform_admins` (voir `supabase/seed.sql`, ne jamais exécuter le seed en production).
6. Activer sauvegardes quotidiennes + PITR ; tester une restauration avant le lancement.

## 2. Rendu (apps/renderer)
`docker build -t md-renderer apps/renderer` → hébergeur de conteneurs, variable `RENDER_TOKEN`, 1 Go RAM minimum, `/health` pour la sonde. Renseigner `POSTER_RENDER_URL` (racine du service) et `POSTER_RENDER_TOKEN` côté web. *(Image Playwright non testée ici : vérifier que le tag correspond à la version de `playwright-core`.)*

## 3. Vercel
- Racine du projet : `apps/web`. Variables : voir `apps/web/.env.example` / `docs/KEYS.md`.
- Domaines : `<domaine>` et `*.<domaine>` ; `APP_DOMAINS=<domaine>`.
- Cron (`apps/web/vercel.json`) : quotidien (crédits, purge, webhooks) + `*/5` pour les webhooks (**nécessite le plan Pro** ; sinon planificateur externe appelant `/api/cron/webhooks` avec `Authorization: Bearer $CRON_SECRET`).
- Sonde : `GET /api/health`.

## 4. Stripe / Resend / Meta
Stripe : webhook `checkout.session.completed`, `customer.subscription.*`, `invoice.*` → `/api/webhooks/stripe`. Resend : DNS du domaine d'envoi. Meta : webhook WhatsApp → `/api/webhooks/whatsapp` (jeton de vérification = `WHATSAPP_VERIFY_TOKEN`).

## 5. Première agence
Console plateforme (`/fr/platform`) → créer l'agence (pilote : Eliezer.immo), inviter le propriétaire, importer ses données (Import CSV), renseigner la charte et la mention légale (obligatoire pour les affiches).

## 6. Exploitation
Rollback : redéployer l'ancien build Vercel (les migrations sont additives ; ne jamais supprimer de colonne dans la même version). Surveillance : sonde `/api/health`, logs Vercel, alertes Supabase. Rotation de `INTEGRATIONS_KEY` : impose de reconnecter WhatsApp/Meta/Google.
