# Déploiement sur un VPS (open source, sans abonnement Supabase ni Vercel)

Cible : VPS Hostinger KVM 2 (≈ 2 vCPU / 8 Go). Aucun abonnement ne doit être souscrit sans accord explicite du propriétaire.

## Architecture
| Conteneur | Rôle | Mémoire indicative |
|---|---|---|
| Supabase auto-hébergé (Postgres, Auth/GoTrue, Storage, API/Kong) | base, connexion, fichiers | 2–3 Go (désactiver Studio, analytics, edge-runtime, imgproxy si besoin) |
| `web` (apps/web/Dockerfile) | application Next.js | 0,3–0,6 Go |
| `renderer` (apps/renderer) | Chromium : affiches et PDF | ≤ 1 Go (limité) |
| `cron` | tâches planifiées (crédits, purge, webhooks) | négligeable |
| Panneau (Dokploy ou Coolify) + proxy Traefik | domaines, certificats, déploiements | 0,5–1 Go |

Fichiers : `deploy/docker-compose.yml`, `deploy/.env.example`, `deploy/backup.sh`, `apps/web/Dockerfile`, `apps/renderer/Dockerfile`.
**Non vérifié ici** : aucun démon Docker n'était disponible, donc les images n'ont pas été construites ; la sortie « standalone » de Next a, elle, été lancée et répond (`/api/health`, `/fr/login`).

## Étapes
1. **Domaine** : enregistrements DNS `A` pour `domaine` et `*.domaine` vers l'IP du VPS (un sous-domaine par agence). Certificats Let's Encrypt gérés par Traefik ; le wildcard demande le challenge DNS (Cloudflare gratuit convient) ; sinon un certificat par sous-domaine.
2. **Panneau** : installer Dokploy (ou Coolify) sur le VPS.
3. **Supabase** : déployer la pile officielle auto-hébergée ; générer `JWT_SECRET`, clés anon et service ; configurer Google (connexion) et le hook JWT `custom_access_token` ; créer le bucket privé `agency-files`.
4. **Migrations** : appliquer `supabase/migrations/*.sql` dans l'ordre (jusqu'à 000018) avec `psql`.
5. **Application** : déployer `deploy/docker-compose.yml` avec les variables de `deploy/.env.example` (`BILLING_MODE=manual`).
6. **Première agence** : console plateforme `/fr/platform` (ajouter votre `user_id` dans `platform_admins`), créer l'agence, fixer plan et échéance, inviter le propriétaire.
7. **Sauvegardes** : `deploy/backup.sh` chaque nuit (cron du VPS) **et** copie hors du VPS. Tester une restauration avant le lancement.
8. **Supervision** : sonde `/api/health`, alertes du panneau, mises à jour de l'OS et des images.

## Compromis assumés
Vous économisez les abonnements mais vous assurez les sauvegardes, les mises à jour et la sécurité du serveur. Un seul VPS = un seul point de défaillance : prévoir des sauvegardes externes. E-mails : Hostinger bloque souvent le port 25 ; l'envoi passe par Resend (API HTTP) ou par le Gmail de chaque agent.
