# 02 — Architecture technique

## 1. Vue d'ensemble

```
                         ┌─────────────────────────────────────────┐
  Navigateur / PWA  ───► │ Vercel : Next.js (RSC + Route Handlers) │
  (FR/HE/EN, RTL)        │  • UI, i18n, auth session (cookies)      │
                         │  • Server Actions / API typées           │
                         │  • Rendu d'affiches (voir §8)            │
                         └───────┬──────────────────────┬──────────┘
                                 │ supabase-js (JWT)    │ jobs / webhooks
                         ┌───────▼──────────┐   ┌───────▼───────────┐
                         │ Supabase         │   │ Fournisseurs IA   │
                         │ • Postgres + RLS │   │ STT / LLM vision  │
                         │ • Auth (OAuth)   │   │ Image generation  │
                         │ • Storage (RLS)  │   └───────────────────┘
                         │ • Realtime       │   ┌───────────────────┐
                         │ • Edge Functions │   │ Resend (e-mail)   │
                         │ • pg_cron/queues │   │ Stripe (paiement) │
                         └──────────────────┘   └───────────────────┘
```

Principe : **un seul backend de données (Supabase)**, un seul déploiement applicatif (Vercel), des services tiers pour ce qui n'est pas notre métier (e-mail, paiement, IA).

## 2. Choix de stack et alternatives

### 2.1 Recommandation : Next.js + Supabase + Vercel

| Critère | Choix | Raison |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript strict** | Écosystème (shadcn/ui, next-intl), RSC/Suspense/streaming pour la fluidité, déploiement Vercel natif |
| BDD | **Postgres (Supabase)** | Relationnel solide, **RLS** pour l'isolation, extensions `pg_trgm`, `unaccent`, `postgis`, `pgvector` |
| Auth | **Supabase Auth** : e-mail magic link + mot de passe, **OAuth Google** (puis Microsoft/Apple), 2FA TOTP | Gratuit, intégré aux policies RLS |
| Fichiers | **Supabase Storage** (buckets privés, policies par `org_id`) | URLs signées, même modèle de sécurité |
| Temps réel | Supabase Realtime | Mise à jour des listes/notifications |
| Jobs asynchrones | `pgmq`/`pg_cron` + Edge Functions (ou Vercel Cron + route handlers) | Traitements IA longs, envois e-mails, rappels |
| UI | **Tailwind v4 + shadcn/ui (Radix)** + tokens CSS | Accessibilité, thématisation par variables, pas de dépendance lourde |
| Données client | **TanStack Query** (cache, optimistic) + **TanStack Table/Virtual** | Listes très rapides |
| Formulaires | React Hook Form + **Zod** (schémas partagés client/serveur/IA) | Une seule source de vérité de validation |
| i18n | **next-intl** (messages ICU, pluriels, RTL) | Routage `/fr /he /en`, dates/nombres via `Intl` |
| État d'URL | **nuqs** | Filtres partageables |
| Palette de commandes | **cmdk** | ⌘K |
| Carte | MapLibre GL + tuiles (MapTiler/OSM, palier gratuit) | Pas de coût Google Maps par défaut |
| PWA | Serwist | Installation mobile, brouillons hors-ligne |
| E-mail | **Resend** (ou Amazon SES si volume) | Domaines multiples, webhooks |
| Paiement | Stripe (+ option locale israélienne, voir §10) | Abonnements, quotas |
| Erreurs/analytics | Sentry (palier gratuit), PostHog (palier gratuit) | Observabilité produit |
| Rate limit / cache | Upstash Redis (palier gratuit) | Protection endpoints IA |
| Tests | Vitest, Playwright, **pgTAP** (tests RLS) | Isolation prouvée |

### 2.2 Alternative : PocketBase

| | PocketBase | Supabase (recommandé) |
|---|---|---|
| Coût | Très bas (un VPS à ~5 €/mois ou Fly.io), binaire unique | Gratuit en dev, ~25 $/mois en prod (Pro) |
| Rapidité de démarrage | Excellente | Très bonne |
| Multi-tenant | Possible via *API rules*, mais **pas de RLS base de données** : une règle oubliée = fuite entre agences | RLS natif au niveau Postgres, testable (pgTAP) |
| Scalabilité | SQLite, un seul nœud | Postgres managé, réplicas, PITR |
| Auth / OAuth | Oui | Oui + hooks de claims JWT |
| Storage | Local/S3 | Intégré + policies |
| Ops | **Vous êtes l'ops** (sauvegardes, mises à jour, sécurité, disponibilité) | Managé |
| Recherche | FTS SQLite limité | `pg_trgm`, `unaccent`, FTS, PostGIS, pgvector |

**Verdict** : PocketBase conviendrait à une seule agence. Pour **vendre à plusieurs agences avec cloisonnement**, l'isolation au niveau base + les sauvegardes managées + PostGIS/trigram pèsent plus que l'économie de 25 $/mois.

### 2.3 Autres options considérées
- **Cloudflare (Pages/Workers + D1/R2)** : très économique, mais écosystème Postgres/RLS moins mûr ; reste une option d'hébergement front si Vercel devient trop cher.
- **Auto-hébergement (Coolify sur VPS + Supabase self-hosted)** : moins cher à grande échelle, mais coût d'exploitation en temps. À reconsidérer au-delà de ~20 agences.

## 3. Multi-tenant : modèle d'isolation

**Modèle retenu : base partagée, schéma partagé, colonne `organization_id` + RLS.**
Compromis optimal coût/simplicité pour des dizaines d'agences. Une base par agence n'est pas justifiée (coût, migrations ×N).

- Toute table métier porte `organization_id uuid not null` (FK, indexée en tête des index composites).
- RLS **activée et forcée** sur toutes les tables du schéma `public`; aucun accès `service_role` côté client.
- L'organisation active est portée par le **JWT** via un *Custom Access Token Hook* (claims `org_id`, `role`) ; changement d'agence = rafraîchissement de session.
- Policies de la forme :
  ```sql
  using (organization_id = (select (auth.jwt() ->> 'org_id')::uuid))
  ```
  (appel enveloppé dans `select` pour être mis en cache par le planificateur — gain de perf important).
- Policies par capacité (lecture/écriture) en complément pour les restrictions de rôle (ex. agent ne voit que ses contacts si le réglage l'impose).
- **Storage** : chemin `org/{org_id}/...` et policies sur `storage.objects` vérifiant le préfixe.
- **Realtime** : canaux filtrés par RLS ; jamais de broadcast global.
- **Clés de cache/Redis/files** préfixées par `org_id`.
- **Pas de requêtes sans org** : helper serveur `withOrg(ctx)`; lint custom interdisant `from('...')` sans passer par le client authentifié.

### Tests d'isolation (bloquants en CI)
1. Pour **chaque table** : un test pgTAP crée 2 orgs, 2 utilisateurs, et vérifie `SELECT/INSERT/UPDATE/DELETE` croisés = 0 ligne / erreur.
2. Test de couverture automatique : échec de CI si une table `public` n'a pas RLS activée ou si elle n'a pas de colonne `organization_id` (hors liste d'exceptions documentée).
3. Test e2e Playwright : deux sessions navigateur, URL d'objets de l'autre agence → 404.
4. Test Storage : URL signée d'un fichier de l'autre agence refusée.

### Provisioning d'une nouvelle agence (P6)
1. Super-admin crée l'organisation (nom, slug, langue, plan).
2. Transaction SQL `provision_organization()` : crée `organizations`, injecte pipeline par défaut, sources, motifs de perte, modèles d'e-mails FR/HE/EN, champs personnalisés par défaut, brand kit neutre.
3. Invitation e-mail à l'owner (magic link).
4. Assistant d'onboarding : import de la charte depuis l'URL du site, ajout des membres, import des contacts.
5. Sous-domaine `slug.<domaine>` (domaine générique wildcard sur Vercel) ; **domaine personnalisé** `crm.agence.co.il` en option payante (API domaines Vercel).

### Cycle de vie
- **Suspension** (impayé) : lecture seule puis blocage, données conservées.
- **Offboarding** : export complet (ZIP : CSV + médias), puis suppression définitive après délai contractuel, avec journal.
- **Impersonation support** : lecture seule par défaut, session limitée (30 min), entrée dans `audit_log` visible par l'owner de l'agence.

## 4. Authentification & sessions
- OAuth Google en premier (les agents ont presque tous un compte Google), Apple/Microsoft ensuite ; magic link pour les autres.
- Invitations : lien à usage unique, expiration 7 j, rôle prédéfini ; l'e-mail invité doit correspondre.
- 2FA TOTP obligatoire configurable pour admins/owners.
- Sessions via cookies HTTP-only (`@supabase/ssr`), rotation des refresh tokens.
- Protection : rate-limit sur login/invitation, détection d'abus, liste de domaines autorisés optionnelle par agence (SSO léger : « tout @agence.co.il rejoint comme agent après approbation »).

## 5. Couche applicative
- **Server Components** pour les pages (HTML rapide), **Server Actions** typées pour les mutations, **Route Handlers** pour webhooks, uploads et endpoints IA.
- Schémas Zod partagés : formulaire ↔ validation serveur ↔ schéma de sortie structurée de l'IA.
- Types de base de données générés (`supabase gen types`) → aucune dérive de schéma.
- Erreurs normalisées (`Result<T, AppError>`), messages traduits, journalisation Sentry avec `org_id` (jamais de données personnelles).
- Pagination par curseur (keyset) pour les grandes listes ; compteur approximatif pour les totaux.

### Fluidité de navigation (exigence UX forte)
- Préchargement des routes au survol/viewport, `loading.tsx` + Suspense par zone (le squelette apparaît immédiatement).
- Mutations **optimistes** (changer statut, assigner, cocher une tâche) avec rollback + toast « Annuler ».
- Listes virtualisées (10 000+ lignes sans lag), recherche débouncée, requêtes annulables.
- View Transitions API pour les changements de vue lorsque supporté (progressive enhancement).
- Panneau latéral (fiche en *drawer*) pour éviter les allers-retours de page ; clavier : `j/k`, `e`, `/`, `g d`…
- Budgets de performance : **LCP < 1,5 s** (4G), **INP < 200 ms**, JS initial par route < 200 kB gzip ; vérifiés en CI (Lighthouse CI).

## 6. Recherche
- Postgres : colonne `search_text` normalisée (minuscules, `unaccent`, **suppression des niqqud hébreux**, translittérations) + index **GIN trigram**.
- Table `geo_aliases` pour variantes de villes/quartiers/rues (Tel-Aviv / תל אביב / Tel Aviv-Yafo).
- Filtres structurés via index B-tree composites `(organization_id, status, city_id, price)`.
- Recherche géographique : PostGIS (`geography(Point)`), index GiST.
- Recherche sémantique (« appartement calme avec vue dégagée près d'un parc ») : `pgvector` sur description + critères — **phase 4**, optionnelle.

## 7. Jobs asynchrones & IA
- File de jobs `ai_jobs` (statut : queued → running → needs_review → done/failed), retries exponentiels, idempotence.
- Traitements > 10 s (génération d'images, transcription longue) hors requête HTTP : Edge Function / worker déclenché par `pgmq`, résultat poussé en Realtime vers l'UI (« Votre affiche est prête »).
- Chaque appel IA écrit dans `ai_usage` (tenant, user, fournisseur, modèle, tokens/secondes/images, coût estimé) → **crédits IA par agence**.
- Garde-fous : taille max audio/image, types MIME, timeout, rate-limit, blocage si crédits épuisés (message clair + lien d'achat de crédits).

## 8. Rendu d'affiches (point technique à valider tôt)
Moteur de template déterministe (HTML/CSS ou JSX) → image.
- Option A : **Satori + resvg** (`@vercel/og`) — rapide et léger, **mais gestion du texte bidirectionnel/hébreu à tester** (spike obligatoire en phase 0).
- Option B : **Chromium headless** (Playwright) dans un conteneur dédié (Fly.io / Cloud Run / Railway, quelques $/mois) ou service de rendu — rendu fidèle navigateur (RTL, ligatures, polices variables), un peu plus lent.
- Décision : spike de 1 jour en phase 0 avec une affiche test en hébreu + français + chiffres/ILS ; on garde A si OK, sinon B derrière une interface `PosterRenderer`.

## 9. Sécurité & conformité

**Sécurité**
- RLS partout + tests ; secrets via variables d'environnement Vercel/Supabase, jamais dans le dépôt ; rotation documentée.
- Validation Zod en entrée ; limites de taille ; contrôle MIME réel (magic bytes) ; **suppression des métadonnées EXIF/GPS** des photos publiées.
- SSRF : l'import de charte depuis une URL passe par un fetcher durci (blocage des IP privées/metadata, timeouts, taille max, redirections limitées).
- CSP stricte, headers de sécurité, protection CSRF native Server Actions, cookies `SameSite`.
- Liens publics : tokens aléatoires 128 bits, expiration/révocation, pas d'énumération, `noindex`.
- Journal d'audit immuable (qui/quoi/quand/ancienne→nouvelle valeur) pour objets sensibles.
- Sauvegardes : PITR Supabase (plan Pro) + dump chronologique quotidien vers un stockage objet externe (R2/Backblaze) — **restauration testée** trimestriellement.
- Dépendances : Dependabot + `npm audit` en CI ; GitHub secret scanning.

**Conformité (à valider avec un juriste israélien avant commercialisation)**
- **Loi israélienne sur la protection de la vie privée** (amendement 13, entré en vigueur en 2025) : registre des traitements, base légale, droits d'accès/rectification/suppression, sécurité adaptée ; prévoir un DPA (accord de sous-traitance) type pour les agences clientes (vous êtes sous-traitant, l'agence est responsable de traitement).
- **Envois commerciaux** : la législation israélienne sur les communications exige un consentement préalable (opt-in) pour les messages publicitaires (e-mail/SMS/WhatsApp) → opt-in horodaté, désinscription en un clic, blocage technique.
- **Loi sur le courtage immobilier** : exigences d'écrit pour certains mandats/exclusivités, mentions obligatoires sur les annonces (ex. identification du courtier) → champ « mentions légales » imposé dans le brand kit et apposé sur chaque affiche.
- Si clients européens : RGPD (transferts, DPA fournisseurs IA).
- **IA** : fournisseurs contractuellement exclus de l'entraînement sur vos données (API entreprise), suppression des audios après traitement (rétention par défaut 30 j, réglable à 0), information claire dans l'UI.

## 10. Facturation SaaS
- Plans : **Starter / Pro / Agence+** (utilisateurs inclus, stockage, crédits IA mensuels, domaine personnalisé, white-label).
- Stripe Billing (abonnement par siège + crédits IA additionnels) ; Stripe est utilisable pour des entreprises israéliennes.
- **Facture légale israélienne** : prévoir un connecteur vers un logiciel de facturation local (ex. Green Invoice/Morning, iCount, Cardcom/PayPlus selon préférence) — **à trancher selon votre statut fiscal**.
- Tolérance : essai gratuit 14 j sans carte, période de grâce 7 j après échec de paiement.

## 11. Structure du dépôt (monorepo simple)

```
/
├─ apps/
│  └─ web/                    # Next.js
│     ├─ src/app/[locale]/(app)/…       # CRM (agence)
│     ├─ src/app/[locale]/(platform)/…  # Console super-admin
│     ├─ src/app/[locale]/p/[token]/    # Pages publiques de biens
│     ├─ src/features/{contacts,properties,deals,posters,ai,…}
│     ├─ src/lib/{supabase,i18n,authz,ai,render}
│     └─ messages/{fr,he,en}.json
├─ packages/
│  ├─ db/                     # types générés, helpers
│  ├─ schemas/                # Zod partagés
│  └─ ui/                     # design system (tokens + composants)
├─ supabase/
│  ├─ migrations/             # SQL versionné
│  ├─ tests/                  # pgTAP (RLS)
│  ├─ seed.sql
│  └─ functions/              # Edge Functions (jobs IA)
├─ docs/spec/                 # ce dossier
└─ .github/workflows/         # CI
```

## 12. Environnements, CI/CD, qualité
- **Environnements** : `local` (Supabase CLI + Docker) → `preview` (branche Supabase éphémère par PR) → `staging` → `production`.
- **Migrations** : uniquement par fichiers SQL versionnés (`supabase db diff`), jamais de modification manuelle en prod ; revue obligatoire ; migrations rétro-compatibles (expand/contract).
- **CI GitHub Actions** : lint, typecheck, tests unitaires, pgTAP (RLS), build, Playwright smoke, Lighthouse CI, scan de secrets.
- **CD** : Vercel (preview par PR, prod sur `main`), migrations appliquées avant déploiement via workflow protégé.
- **Feature flags** simples (table `feature_flags` par tenant) pour déployer des fonctions à un seul client d'abord.
- **Observabilité** : Sentry (erreurs), PostHog (usage produit, entonnoirs d'onboarding), logs structurés, alerte sur taux d'échec IA et latence.

## 13. API & intégrations sortantes
- Webhooks signés (HMAC) : `property.created`, `contact.created`, `deal.stage_changed`…
- API REST publique (phase 3+) avec clés par organisation, scopes, rate-limit → connexion n8n/Zapier/Make.
- **Synchronisation site web** : endpoint public en lecture `/api/public/{org}/properties` (biens publiés, cache CDN) + widget embarquable → affichage automatique sur le site de l'agence (Eliezer.immo en premier cas d'usage), formulaire de contact qui crée un lead dans le CRM.
- Import/export CSV générique pour passerelles vers les portails.
