# E2E

Ordre obligatoire (chaque suite prépare l'état de la suivante) sur une base fraîche :

```bash
bash supabase/dev-db.sh reset
export INTEGRATIONS_KEY=$(head -c 32 /dev/urandom | base64) APP_SECRET=app_secret_e2e_0123456789abcdef \
  META_APP_SECRET=meta_secret_e2e WHATSAPP_VERIFY_TOKEN=verify_e2e META_GRAPH_BASE=http://127.0.0.1:3199 \
  CRON_SECRET=cron_e2e STRIPE_WEBHOOK_SECRET=whsec_e2e APP_DOMAINS=multideploy.test BRAND_FETCH_ALLOW_PRIVATE=1
pnpm --filter @multideploy/web dev -p 3120 &      # ces variables n'ont d'effet que hors production
for n in 1 2 3 4a 4b 5; do node apps/web/e2e/phase$n.cjs; done
```
Redémarrer le serveur entre deux passes complètes (limiteurs de débit en mémoire). Chaque suite doit rester sous ~2 minutes.
Si le mode dev boucle en rechargement (« Fast Refresh rebuilding »), supprimer `apps/web/.next` et relancer.
La suite 5 démarre elle-même un faux serveur Graph API (Meta) sur le port 3199 : aucun compte réel n'est nécessaire.
