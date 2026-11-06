# MultiDeploy — CRM immobilier multi-agences (NadlanHub)

**Avant toute chose, lire `docs/HANDOFF.md` en entier** : état du projet, infrastructure (VPS Hostinger, domaine `nadlanhub.cloud`), procédures de déploiement, pièges rencontrés et liste « À faire ». Il est tenu à jour à chaque fin de session ; le mettre à jour (et le pousser) à la fin de chaque session de travail.

Règles permanentes de l'utilisateur :
- Aucune dépense ni abonnement sans accord explicite à chaque fois.
- Jamais de secret dans le chat, dans le dépôt ni dans un commit (ils sont dans la configuration des projets Docker du VPS).
- Ne jamais toucher à n8n ni à Hermes (autres projets sur le même VPS, dont le Traefik de n8n).
- Accord explicite avant d'écrire à un tiers ; ne pas partager l'e-mail de l'utilisateur.
- Réponses en français, courtes, honnêtes sur ce qui est vérifié ou non.

Application : `apps/web` (Next.js). Avant un push : `pnpm lint && pnpm typecheck && pnpm test` dans `apps/web`. Ne pas commiter `apps/web/next-env.d.ts`. Commits : trailers `Co-Authored-By` et `Claude-Session`. Pas de PR sauf demande.
