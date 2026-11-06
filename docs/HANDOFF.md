# Passation de session — état au 6 novembre 2026

> À lire en premier dans une nouvelle session. Aucun secret dans ce fichier : ils sont dans la configuration des projets Docker du VPS (lisibles par `vps_docker_get`, champ `environment`).

## Projet
CRM immobilier multi-agences (FR/HE/EN, RTL), revendable. Pilote : agence Eliezer.immo. Branche de travail : `claude/dreamy-thompson-gxqp1x` (dépôt `fabricciao/multideploy`). Pas de PR sauf demande. Commits : trailers `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` et `Claude-Session: <url de la session>`.
Docs : `docs/spec/` (spec + résultats), `docs/DEPLOY-VPS.md`, `docs/KEYS.md`, `docs/SECURITY.md`. Tests : 269 unitaires, 144 assertions SQL, e2e phases 1-6 (voir `apps/web/e2e/README.md`).

## Règles imposées par l'utilisateur
- **Aucun abonnement, achat ni dépense** (Hostinger ou ailleurs) sans son accord explicite à chaque fois.
- Ne jamais demander de secrets dans le chat (utiliser `request_credential`). Ne pas réinitialiser/recréer le VPS : il héberge **n8n et Hermes** (à ne pas toucher).
- Réponses en français, courtes, honnêtes sur ce qui est vérifié ou non.

## Infrastructure (Hostinger VPS KVM 2)
- VPS id **1282241**, IP 46.202.130.62, hostname srv1282241.hstgr.cloud, 2 vCPU / 8 Go. MCP : serveur `Hostinger` (outils `search`, `execute`, `multi-execute`). Hôte `mcp.hostinger.com` déjà autorisé dans l'environnement ; si le MCP ne se connecte pas, relancer la session.
- URL du CRM (temporaire, sans domaine) : **https://46.202.130.62.sslip.io** (HTTPS via le Traefik de n8n, certificat Let's Encrypt par `tlschallenge`, réseau Docker externe `n8n_default`, resolver `mytlschallenge`). Ne jamais modifier la config du Traefik de n8n.
- Snapshot pris le 5/11 (expire 24 h après) ; sauvegardes hebdo Hostinger ; copie quotidienne `pg_dump` dans le volume `mdapp_md_backups` (14 jours) — **pas encore de copie hors VPS**.

### Projets Docker (créés via `vps_docker_create`, contenu ≤ 8192 caractères !)
- **`multideploy`** : `db` (supabase/postgres:15.8.1.060, rôle app `postgres`, superuser `supabase_admin`), `init` (mots de passe des rôles), `code` (clone/fetch du dépôt par clé de déploiement SSH en lecture seule, volume `md_src`), `migrate` (applique `supabase/migrations/*.sql`, idempotent via `public._md_migrations`), `gotrue` (v2.180.0, route `/auth/v1` via Traefik avec stripprefix). Pas de Kong/Storage : fichiers sur disque (`STORAGE_DRIVER=local`).
- **`mdapp`** : `builder` (pnpm install + next build → volume `md_app`, saute si le commit est déjà compilé), `web` (node server.js standalone, healthcheck `/api/health`), `renderer` (playwright v1.64.1-noble + apps/renderer/server.mjs), `cron` (webhooks/5 min, quotidien), `dbbackup`.
- Variables : `BILLING_MODE=manual`, `APP_DOMAINS=<HOST>`, `NEXT_PUBLIC_*` figées au build.

### Procédures
- **Mettre à jour le code** : push sur la branche ; `vps_docker_start` sur `multideploy` (relance `code`+`migrate`) ; puis `vps_docker_update` sur `mdapp` (recrée `builder` → recompile → `web`). Vérifier via logs (`vps_docker_logs`, verbeux) et `vps_docker_containers`.
- **Relancer un job « one-shot »** : `vps_docker_start` du projet (les conteneurs arrêtés se relancent).
- **Pas d'exec direct** sur le VPS : pour inspecter la base ou générer un lien, créer un projet temporaire `mdprobe` (alpine/postgres, réseau externe `multideploy_default`, secrets en `environment`), lire ses logs, puis le **supprimer** (`vps_docker_delete`).
- **Lien de connexion à usage unique** (pas d'e-mail encore) : appeler GoTrue `POST http://gotrue:9999/admin/generate_link` (clé service) depuis un projet temporaire, puis `https://<HOST>/auth/callback?token_hash=<hashed_token>&type=magiclink&next=/fr` (valable ~1 h). Le callback accepte `token_hash` (voir `apps/web/src/app/auth/callback/route.ts`).
- **Pièges rencontrés** : `sleep` > ~20 s bloqué dans l'outil Bash ; les logs Hostinger sont renvoyés en bloc (attendre la fin du job avant de lire) ; `$` doit être doublé (`$$`) dans les commandes compose ; Next derrière proxy → utiliser `lib/origin.ts` (`publicOrigin`) pour les redirections ; le mode dev Next boucle en rechargement si `.next` est périmé (supprimer le dossier).

## État fonctionnel (vérifié)
- Migrations 1-18 appliquées sur un vrai Postgres Supabase ; GoTrue OK ; CRM en ligne (health 200, login 200) ; rendu actif ; sauvegarde quotidienne OK.
- Compte administrateur plateforme : `fabrice.delpec@gmail.com` (connecté avec succès par lien magique).
- Agence pilote créée par l'utilisateur : slug `eliezerimmo`, plan essai, propriétaire `contact@eliezer.immo` (compte créé, **aucune invitation envoyée**). Un lien de connexion à usage unique a été donné à l'utilisateur ; le nom hébreu de l'agence est encore en lettres latines.
- **Non testé en réel** : création de biens/clients/affiches/bon de visite sur le serveur, envoi d'e-mails, Google, Meta/WhatsApp, IA, Stripe (désactivé, facturation manuelle).

## Décisions prises
- Pas de Coolify/Dokploy sur ce VPS (ports 80/443 pris par le Traefik de n8n). Plus tard, pour la production (≈ 10 agences) : VPS dédié + Coolify ; la migration = `pg_dump`/restore + volume de fichiers + **mêmes secrets** (APP_SECRET, INTEGRATIONS_KEY, JWT_SECRET) + DNS.
- Facturation manuelle (plan/échéance fixés dans la console plateforme), pas de paiement dans le CRM.
- Lien WhatsApp prérempli par défaut ; WhatsApp API par agence en option ; Gmail connectable par agent.
- IA : fournisseurs interchangeables (Anthropic ou compatible OpenAI type DeepSeek/Groq pour le texte ; DeepSeek ne lit pas les images ; transcription par `STT_BASE_URL`).

## À faire (dans l'ordre conseillé)
1. **Domaine `nadlanhub.com`** (choisi par l'utilisateur) : réclamation du domaine gratuit **non aboutie** (compte Hostinger : crédit « free_domain » en `pending_setup`, profil WHOIS créé id 16488868 pour .com, société « Social marketing », Samuel Rouch, Jérusalem). `domains_portfolio_claim-free` → erreur 2037 ; `complete-setup` accepté mais sans effet. Options : l'utilisateur active le crédit dans hPanel, ou autre extension couverte, ou achat (à valider avec lui, prix d'abord). Après enregistrement : DNS `A` pour le domaine et `*.domaine` vers 46.202.130.62, certificat joker (validation DNS) ou routes explicites, `APP_DOMAINS`, `NEXT_PUBLIC_*`, redirections.
2. **Resend** : l'utilisateur **a ouvert son compte**. Il faut : domaine vérifié (SPF/DKIM via DNS Hostinger), clé API via `request_credential` (hôte `api.resend.com`, ne jamais dans le chat), puis configurer `RESEND_API_KEY` + `EMAIL_FROM` dans `mdapp` et SMTP de GoTrue (`GOTRUE_SMTP_*`, Resend SMTP `smtp.resend.com:465`, user `resend`) pour les liens de connexion/invitations.
3. Vérifier le CRM de bout en bout avec l'utilisateur (bien, client, affiche, bon de visite, import CSV d'Eliezer.immo) ; corriger le nom hébreu de l'agence ; fixer l'échéance d'essai.
4. Copie des sauvegardes hors VPS ; régénérer les secrets en fin de mise en place si l'utilisateur le souhaite ; supprimer la clé de déploiement GitHub une fois une autre méthode de mise à jour en place.
5. Optionnel : connexion Google (OAuth, nécessite domaine), clés IA (Anthropic/DeepSeek, STT), Meta/WhatsApp ; relecture des traductions hébraïques et des textes juridiques par des humains.
6. Idées non faites (doc 06) : calculateur mas rechisha, brief du matin, alerte d'exclusivité, rapport propriétaire, etc.
