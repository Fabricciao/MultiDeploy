# 08 — Phase 1 : CRM cœur (résultats)

## Livré et vérifié
| Domaine | Contenu | Preuve |
|---|---|---|
| **Base de données** | Critères de recherche, pipeline (8 étapes par défaut), affaires, tâches, visites, envois, vues enregistrées, liens bien↔contact, référentiel de 20 villes (FR/HE/EN), garde-fous de forme JSON | migrations 5–7, `pnpm test:db` |
| **Matching** (SQL, `security invoker`) | Éliminatoires : transaction, statut, type, ville, pièces, indispensables, budget > +15 %. Score 0–100 avec raisons (budget dépassé, équipement manquant…). Exclut les biens déjà envoyés. Respecte la visibilité des contacts (RLS) | 11 assertions dédiées |
| **Biens** | Liste (recherche normalisée hébreu/accents, filtres ville / transaction / pièces / prix / équipements / statut / agent / mandat, tri, pagination, état dans l'URL), fiche, création, édition, archivage, descriptions FR/HE/EN | E2E |
| **Clients** | Liste + filtres, fiche 360° (critères, biens correspondants, envois, tâches, notes, timeline, affaires), création avec critères, édition, **détection de doublon par téléphone** normalisé E.164 | E2E |
| **Envoi** | Sélection biens↔clients → e-mail dans la **langue du client** (RTL en hébreu) ou lien WhatsApp ; consentement vérifié côté serveur ; page publique de sélection par jeton (sans donnée interne, adresse selon visibilité) ; ouverture tracée ; désinscription en 2 temps | E2E + tests unitaires du gabarit |
| **Pipeline** | Kanban glisser-déposer + sélecteur accessible, mise à jour optimiste, journal des changements d'étape | E2E |
| **Aujourd'hui** | KPI, tâches du jour / en retard, visites, mandats exclusifs qui expirent, nouveaux biens avec clients intéressés | E2E |
| **Droits** | Agent à visibilité restreinte : clients des autres en 404, bien d'un collègue non modifiable (bouton absent **et** refus en base) | E2E |
| **i18n** | 309 clés × 3 langues, contrôle de parité + contrôle « toute clé utilisée existe » en CI | `pnpm lint` |

**Chiffres** : 61 → **63 assertions SQL**, 38 tests unitaires, **34 vérifications E2E** (navigateur réel, base réelle).

## Bugs trouvés par les tests (et corrigés)
- JSON **double-encodé** (chaîne au lieu d'objet) sur téléphones/e-mails/consentement/mandat → corrigé + **contraintes `CHECK` en base** pour que ça ne puisse plus se reproduire silencieusement.
- Tableaux d'énumérations Postgres renvoyés sous forme de chaîne → cast explicite.

## Architecture de la couche de données (écart assumé par rapport au spec)
Le spec prévoyait `supabase-js`. J'ai choisi des **requêtes SQL directes** (`postgres.js`) exécutées dans une transaction qui prend l'identité de l'utilisateur (`set local role authenticated` + claims JWT) : la **RLS s'applique exactement comme via l'API Supabase**, et tout est testable sans Docker. En production : chaîne de connexion du *pooler* Supabase (mode transaction, `prepare:false`). L'authentification reste Supabase Auth (session validée par `getUser()`).

## Non fait / limites connues (à lire)
- **Auth Supabase réelle non testée** (pas de projet Supabase ici) : le code Google OAuth / magic link et la lecture de session sont écrits mais seul le mode « usurpation de dev » a été exécuté. Idem pour le hook JWT en conditions réelles.
- **Envoi d'e-mails réel non testé** (pas de clé Resend) : en l'absence de clé, l'envoi est journalisé en `dry_run`. Le gabarit HTML est testé, pas la délivrabilité (DKIM/SPF de l'agence à configurer).
- **Photos** : pas d'upload (Supabase Storage) — aperçus illustratifs. Prévu avant la mise en production.
- **Pas encore fait de la liste Phase 1 du spec** : ⌘K, vues enregistrées (table prête, pas d'UI), carte, agenda/visites (affichage seulement), import CSV, rapports, journal d'audit en UI, gestion des membres/invitations, sélection multiple depuis la liste.
- **Matching** : pondérations v1 simples (voir `match_eval`) ; à calibrer avec de vrais agents.
- E2E en CI écrit mais **pas encore exécuté sur GitHub Actions**.
- Les traductions hébraïques sont de moi : relecture native nécessaire.
