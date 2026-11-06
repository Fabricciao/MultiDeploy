# Passation de session — état au 6 novembre 2026 (fin de journée)

> À lire en premier dans une nouvelle session. Aucun secret dans ce fichier : ils sont dans la configuration des projets Docker du VPS (lisibles par `vps_docker_get`, champ `environment`).

## Projet
CRM immobilier multi-agences (FR/HE/EN, RTL), revendable. Pilote : agence Eliezer.immo. Dépôt `fabricciao/multideploy`. **Branche de travail et de déploiement : `claude/zealous-allen-vhexg9`** (le VPS la suit via la variable `BRANCH` du projet `multideploy`). L'ancienne branche `claude/dreamy-thompson-gxqp1x` n'est plus suivie. Pas de PR sauf demande. Commits : trailers `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` et `Claude-Session: <url de la session>`.
Docs : `docs/spec/` (spec + résultats), `docs/DEPLOY-VPS.md`, `docs/KEYS.md`, `docs/SECURITY.md`. Tests : 273 unitaires, 144 assertions SQL, e2e phases 1-6 (voir `apps/web/e2e/README.md`). Vérifs avant push : `pnpm lint`, `pnpm typecheck`, `pnpm test` dans `apps/web`.

## Règles imposées par l'utilisateur
- **Aucun abonnement, achat ni dépense** (Hostinger ou ailleurs) sans son accord explicite à chaque fois.
- Ne jamais demander de secrets dans le chat. Ne pas réinitialiser/recréer le VPS : il héberge **n8n et Hermes** (à ne pas toucher, ni leur Traefik).
- Réponses en français, courtes, honnêtes sur ce qui est vérifié ou non.

## Adresses (domaine `nadlanhub.cloud`, enregistré le 6/11 via le crédit gratuit d'un an Hostinger, sans paiement)
- `https://nadlanhub.cloud` : **site vitrine du CRM, pas encore créé** (`@` pointe sur le VPS, qui renvoie 404 de Traefik en attendant). Prévu : page statique en conteneur sur le VPS (gratuit).
- `https://admin.nadlanhub.cloud` : console plateforme (administrateur, sans agence) **et** serveur d'authentification GoTrue (`/auth/v1`). Hôte réservé dans `tenant.ts` (« admin », « app », « www », etc. ne sont jamais des agences).
- `https://<slug>.nadlanhub.cloud` : une agence, connexion directe sur son adresse (l'agence est imposée par l'hôte). Aujourd'hui : `eliezerimmo`.
- DNS (Hostinger) : `@` et `*` en A vers 46.202.130.62 (TTL 300), `www` CNAME, + enregistrements Resend (voir plus bas).
- L'ancienne adresse `46.202.130.62.sslip.io` **ne sert plus le CRM** (`NEXT_PUBLIC_*` figé au build sur `admin.`).
- **Pas de certificat joker** : il exigerait la validation DNS, donc de modifier le Traefik de n8n (interdit). Chaque hôte a son propre routeur Traefik et son certificat Let's Encrypt (`tlschallenge`).

### Ajouter une agence (ex. `agence2`)
1. Créer l'agence dans la console `admin.` (slug = sous-domaine).
2. Dans le compose `mdapp` (service `web`, labels), ajouter un routeur copié de `md-eliezerimmo` (`md-agence2`, `Host(\`agence2.${DOMAIN}\`)`, `service=md-web`), puis `vps_docker_create` (voir pièges) et attendre le certificat. Pas de recompilation (le builder saute si le commit et l'URL sont inchangés).
3. Vérifier `https://agence2.nadlanhub.cloud/api/health` (200, certificat valide).
Pour la production (≈ 10 agences) : VPS dédié + Coolify (joker automatique).

## Infrastructure (Hostinger VPS KVM 2)
- VPS id **1282241**, IP 46.202.130.62, hostname srv1282241.hstgr.cloud, 2 vCPU / 8 Go. MCP : serveur `Hostinger` (outils `search`, `execute`, `multi-execute`). Hôte `mcp.hostinger.com` autorisé dans l'environnement cloud.
- Environnement cloud de la session : **« multideploy »** (personnel, réseau limité : `mcp.hostinger.com`, `admin.nadlanhub.cloud`, `eliezerimmo.nadlanhub.cloud`, + `api.resend.com` via credential). Un nouvel hôte d'agence à tester en HTTPS depuis la session doit y être ajouté (`update_environment`, carte d'approbation).
- Snapshot du 5/11 expiré ; sauvegardes hebdo Hostinger ; copie quotidienne `pg_dump` dans le volume `mdapp_md_backups` (14 jours) — **pas encore de copie hors VPS**.

### Projets Docker (créés via `vps_docker_create`, contenu ≤ 8192 caractères !)
- **`multideploy`** : `db` (supabase/postgres:15.8.1.060, rôle app `postgres`, superuser `supabase_admin`), `init`, `code` (clone/fetch du dépôt par clé de déploiement SSH en lecture seule, volume `md_src`, branche = `BRANCH`), `migrate` (idempotent via `public._md_migrations`), `gotrue` (v2.180.0, route `/auth/v1` via Traefik avec stripprefix, **SMTP Resend** : `smtp.resend.com:465`, utilisateur `resend`, mot de passe = `RESEND_API_KEY`, expéditeur `no-reply@${DOMAIN}`). `GOTRUE_URI_ALLOW_LIST` = `https://${HOST}/**,https://*.${DOMAIN}/**`.
- **`mdapp`** : `builder` (pnpm install + next build → volume `md_app` ; **saute seulement si le commit ET `NEXT_PUBLIC_SITE_URL` sont inchangés** — marqueur `/app/.built`), `web` (node server.js standalone, healthcheck `/api/health`, un routeur Traefik par hôte), `renderer` (playwright), `cron` (webhooks/5 min, quotidien), `dbbackup`.
- Variables des deux projets : `HOST=admin.nadlanhub.cloud`, `DOMAIN=nadlanhub.cloud`, `RESEND_API_KEY` (clé d'envoi Resend, voir plus bas), secrets applicatifs (POSTGRES_PASSWORD, JWT_SECRET, APP_SECRET, INTEGRATIONS_KEY, CRON_SECRET, RENDER_TOKEN, clés Supabase), `BRANCH`/`REPO`/`DEPLOY_KEY_B64` (multideploy). `APP_DOMAINS=${DOMAIN}`, `EMAIL_FROM="NadlanHub <no-reply@${DOMAIN}>"`, `BILLING_MODE=manual`.

### Procédures
- **Mettre à jour le code** : push sur `claude/zealous-allen-vhexg9` ; `vps_docker_create`/`start` sur `multideploy` (relance `code`+`migrate`) ; puis `vps_docker_update` sur `mdapp` (recrée `builder` → recompile si le commit a changé → `web`). Vérifier par `vps_docker_containers`, les logs (`vps_docker_logs`, verbeux) et `curl https://admin.nadlanhub.cloud/api/health`.
- **Changer une variable ou le compose** : `vps_docker_create` avec le **contenu complet + l'environnement complet** (il remplace tout ; `vps_docker_update` ne prend aucune nouvelle config). Les conteneurs sont recréés, les volumes nommés (dont `md_db`) sont conservés — vérifié : log « Skipping initialization » et migrations en « skip ». Relire d'abord la config avec `vps_docker_get` (les secrets y figurent : ne jamais les recopier dans le chat ni dans git).
- **Pas d'exec direct** sur le VPS : pour inspecter la base ou générer un lien, créer un projet temporaire `mdprobe` (image `curlimages/curl`, réseau externe `multideploy_default`, clé service en `environment`), lire ses logs, puis le **supprimer** (`vps_docker_delete`).
- **Lien de connexion à usage unique** (secours) : `POST http://gotrue:9999/admin/generate_link` (`{"type":"magiclink","email":…}`, clé service) depuis `mdprobe`, puis `https://admin.nadlanhub.cloud/auth/callback?token_hash=<hashed_token>&type=magiclink&next=/fr` (≈ 1 h, usage unique).
- **Pièges** : `sleep` > ~20 s bloqué dans l'outil Bash ; logs Hostinger renvoyés en bloc ; `$` doublé (`$$`) dans les commandes compose ; Next derrière proxy → `lib/origin.ts` (`publicOrigin`) ; un fichier `"use server"` ne peut exporter que des fonctions async ; le mode dev Next boucle si `.next` est périmé ; le proxy du bac à sable bloque les hôtes non autorisés (403 « CONNECT tunnel failed »).

## E-mails (Resend) — fait et vérifié
- Domaine `nadlanhub.cloud` créé chez Resend (région `eu-west-1`, plan gratuit) et **vérifié** (DKIM `resend._domainkey`, SPF `send` MX+TXT, CNAME `rsend`, tous posés dans le DNS Hostinger). Domaine Resend id `089f330f-7971-48ee-8b49-b8138f457849`.
- Clé d'envoi dédiée `nadlanhub-crm-sending` (droit d'envoi uniquement, limitée au domaine), créée via l'API avec une clé Full access temporaire ; sa valeur est dans `RESEND_API_KEY` des deux projets.
- **Leçon** : `request_credential` ne donne jamais la valeur au modèle (le proxy l'injecte seulement dans ses requêtes vers l'hôte). Pour qu'une clé arrive dans la config du VPS, créer une clé restreinte par l'API de l'éditeur avec une clé admin temporaire, ou la saisir à la main dans hPanel.
- **À confirmer avec l'utilisateur** : la clé Resend « Full access » temporaire doit être **supprimée** dans le tableau de bord Resend (puis retirer le credential `api.resend.com` des secrets réseau de l'environnement « multideploy »).
- Connexion testée par l'utilisateur : e-mail reçu, **lien et code à usage unique fonctionnent** (le code se saisit sur la page de connexion, ajouté dans le commit `32a8fc8` : cookie `md_login_email` de 10 min, limites par IP et par adresse).

## État fonctionnel (vérifié)
- Migrations 1-18 appliquées ; GoTrue OK ; CRM en ligne sur `admin.` et `eliezerimmo.` (health 200, login 200, certificats valides) ; rendu actif ; sauvegarde quotidienne OK.
- Compte administrateur plateforme : `fabrice.delpec@gmail.com` (connexion par lien et par code OK sur `admin.`).
- Agence pilote : slug `eliezerimmo`, plan essai, propriétaire `contact@eliezer.immo` (compte créé, **aucune invitation envoyée** ; l'envoi d'e-mails est maintenant possible). Le nom hébreu de l'agence est encore en lettres latines.
- **Non testé en réel** : connexion d'un propriétaire d'agence sur `eliezerimmo.nadlanhub.cloud`, invitations par e-mail, création de biens/clients/affiches/bon de visite, Google, Meta/WhatsApp, IA, Stripe (désactivé, facturation manuelle).
- Connu : les liens générés côté agence (invitations d'équipe, etc.) utilisent `NEXT_PUBLIC_SITE_URL` (= `admin.`) : l'invité arrive sur `admin.` (fonctionne, l'agence active étant déduite de son profil) plutôt que sur le sous-domaine de son agence. À corriger si gênant.

## Décisions prises
- Architecture d'adresses ci-dessus (vitrine / `admin.` / une adresse par agence, pas de portail commun ni cookie partagé).
- Pas de Coolify/Dokploy sur ce VPS (ports 80/443 pris par le Traefik de n8n). Pour la production : VPS dédié + Coolify ; migration = `pg_dump`/restore + volume de fichiers + **mêmes secrets** (APP_SECRET, INTEGRATIONS_KEY, JWT_SECRET) + DNS.
- Facturation manuelle (plan/échéance dans la console plateforme), pas de paiement dans le CRM.
- Lien WhatsApp prérempli par défaut ; WhatsApp API par agence en option ; Gmail connectable par agent.
- IA : fournisseurs interchangeables (Anthropic ou compatible OpenAI type DeepSeek/Groq pour le texte ; DeepSeek ne lit pas les images ; transcription par `STT_BASE_URL`).

## À faire (dans l'ordre conseillé)
1. **Supprimer la clé Resend Full access** (voir plus haut) et confirmer.
2. **Page d'attente de la vitrine** sur `nadlanhub.cloud` (conteneur statique + routeur Traefik + certificat), gratuite ; contenu définitif à fournir (site de présentation du CRM). Ajouter aussi `www` si voulu.
3. **Inviter le propriétaire de l'agence pilote** (`contact@eliezer.immo`) et vérifier la connexion sur `eliezerimmo.nadlanhub.cloud` ; corriger le nom hébreu ; fixer l'échéance d'essai.
4. Vérifier le CRM de bout en bout avec l'utilisateur (bien, client, affiche, bon de visite, import CSV d'Eliezer.immo).
5. Copie des sauvegardes hors VPS ; régénérer les secrets en fin de mise en place si souhaité ; supprimer la clé de déploiement GitHub une fois une autre méthode de mise à jour en place ; décider quelle branche devient la branche de production.
6. Optionnel : connexion Google (OAuth, domaine maintenant disponible), clés IA (Anthropic/DeepSeek, STT), Meta/WhatsApp ; DMARC pour le domaine d'envoi ; relecture des traductions hébraïques et des textes juridiques par des humains.
7. Idées non faites (doc 06) : calculateur mas rechisha, brief du matin, alerte d'exclusivité, rapport propriétaire, etc.
