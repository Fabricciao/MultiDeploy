# E2E

Ordre obligatoire (chaque suite prépare l'état de la suivante) sur une base fraîche :

```bash
bash supabase/dev-db.sh reset
CRON_SECRET=cron_e2e STRIPE_WEBHOOK_SECRET=whsec_e2e APP_DOMAINS=multideploy.test BRAND_FETCH_ALLOW_PRIVATE=1 \
  pnpm --filter @multideploy/web dev -p 3120 &      # ces variables n'ont d'effet que hors production
for n in 1 2 3 4a 4b; do node apps/web/e2e/phase$n.cjs; done
```
Redémarrer le serveur entre deux passes complètes (limiteurs de débit en mémoire).
