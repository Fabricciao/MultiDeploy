# E2E

```bash
bash supabase/dev-db.sh reset
BRAND_FETCH_ALLOW_PRIVATE=1 pnpm --filter @multideploy/web dev -p 3120 &   # le flag n'existe qu'hors production
node apps/web/e2e/phase1.cjs && node apps/web/e2e/phase2.cjs
```
