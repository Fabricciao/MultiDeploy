# MultiDeploy — CRM immobilier multi-agences (FR / HE / EN)

Spec complet : [`docs/spec/`](docs/spec/README.md). Résultats de la phase 0 : [`docs/spec/07-phase0-resultats.md`](docs/spec/07-phase0-resultats.md).

## Démarrer
```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # puis renseigner Supabase (optionnel pour parcourir l'UI)
pnpm dev                                       # http://localhost:3000/fr  (/he, /en, /fr/design)
```

## Vérifications (identiques à la CI)
```bash
pnpm check        # lint (RTL + i18n), typecheck, tests unitaires, tests d'isolation SQL
pnpm test:db      # uniquement les tests d'isolation multi-tenant (Postgres jetable, aucun Docker requis)
```

## Structure
- `apps/web` — Next.js 16, Tailwind 4, next-intl (FR/HE/EN, RTL), thème par agence, auth Supabase
- `supabase/migrations` — schéma multi-tenant + RLS + provisioning d'agence
- `supabase/tests` — tests d'isolation (SQL pur) ; `run.sh` lance un Postgres éphémère
- `spikes` — essais techniques de la phase 0
