# MultiDeploy — CRM immobilier multi-agences (FR / HE / EN)

Spec complet : [`docs/spec/`](docs/spec/README.md). Résultats : [phase 0](docs/spec/07-phase0-resultats.md) · [phase 1](docs/spec/08-phase1-resultats.md) · [phases 3-5](docs/spec/10-phases-3-4-5-resultats.md) · [déploiement VPS](docs/DEPLOY-VPS.md) · [Vercel/Supabase](docs/DEPLOY.md) · [clés à fournir](docs/KEYS.md) · [sécurité](docs/SECURITY.md). Maquettes : [`docs/mockups/`](docs/mockups/README.md).

## Démarrer (sans Docker ni compte Supabase)
```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # DATABASE_URL pointe déjà sur la base locale
pnpm db:reset                                  # Postgres local + migrations + données de démo fictives
pnpm dev                                       # http://localhost:3000/fr  (/he, /en)
```
En développement (hors production, sans Supabase configuré), un sélecteur « dev » permet d'endosser Yaël (propriétaire) ou un agent pour tester les droits.

## Vérifications (identiques à la CI)
```bash
pnpm check        # lint (RTL + i18n), typecheck, tests unitaires, tests d'isolation SQL
pnpm test:db      # tests d'isolation / matching / garde-fous (Postgres jetable, aucun Docker requis)
pnpm e2e          # parcours réels navigateur + base de démo (serveur dev lancé, voir apps/web/e2e/phase1.cjs)
```

## Structure
- `apps/web` — Next.js 16, Tailwind 4, next-intl (FR/HE/EN, RTL), thème par agence, auth Supabase
- `supabase/migrations` — schéma multi-tenant + RLS + provisioning d'agence
- `supabase/tests` — tests d'isolation (SQL pur) ; `run.sh` lance un Postgres éphémère
- `spikes` — essais techniques de la phase 0
