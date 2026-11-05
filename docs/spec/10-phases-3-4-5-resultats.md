# Résultats phases 3 à 5 (SaaS, productivité, intégrations)

**Livré et vérifié** : multi-agences (plans, sièges, invitations, domaines, console plateforme, impersonation lecture seule, audit), facturation Stripe (adaptateur), API publique + webhooks + widget, rétention/RGPD, palette ⌘K + recherche naturelle, vues enregistrées, import CSV, envoi groupé, agenda (Chabbat/fêtes, conflits, ICS), rapports, connexions chiffrées (WhatsApp/Facebook/Instagram/Google Agenda), webhook WhatsApp entrant, envoi WhatsApp API, publication Meta des affiches, bon de visite signé (PDF Chromium), PWA, descriptions par modèle + traduction IA (1 crédit), rendu déporté (`apps/renderer`, vérifié en local), `/api/health`, CSP/HSTS, anti-abus connexion.

**Vérifications** : 144 assertions SQL ; 269 tests unitaires ; e2e phases 1, 2, 3, 4a, 4b, 5, 6 (base fraîche, enchaînées) ; build de production OK ; CSP sans violation.

**Corrigé en cours de route** : l'effacement d'un contact n'effaçait pas réellement notes/partages (pas de politique UPDATE sur `activities`) → migration 16.

**Non testé sans comptes** : Supabase Auth/JWT hook, Google OAuth, OpenAI, Anthropic, Resend, Stripe, Meta/WhatsApp réels, Supabase Storage, déploiement Vercel/renderer, CI GitHub. Traductions hébreues à relire par un natif ; textes juridiques à valider par un avocat.


## Ajouts suivants
Facturation **manuelle** par défaut (plan, échéance et note fixés par la plateforme ; plan/statut/échéance protégés par un déclencheur SQL, y compris contre l'API REST), tableau de bord plateforme (recherche, filtres, états de facturation, propriétaire, rôles), connexion Gmail par agent (envoi depuis son adresse), copie des visites vers Google Agenda, fournisseurs IA interchangeables (compatible OpenAI : DeepSeek, Groq, auto-hébergé), fichiers Docker/VPS (`docs/DEPLOY-VPS.md`, non construits faute de démon Docker ici).
