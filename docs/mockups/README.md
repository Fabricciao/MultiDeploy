# Maquettes — 8 écrans prioritaires (FR + HE)

Ouvrir `index.html` (galerie) ou directement `fr/*.html` / `he/*.html`. Captures dans `png/`.
Données fictives (noms, prix, numéros inventés). Aucune image réelle : les photos de biens sont des placeholders.

| # | Écran | Ce qu'il démontre |
|---|---|---|
| 1 | Liste des biens | Tableau dense, filtres en « chips », popover de prix (histogramme + double curseur), vues enregistrées, barre d'actions en masse (envoyer / affiches / assigner) |
| 2 | Fiche bien | Galerie, caractéristiques israéliennes (mamad, soukka, arnona, va'ad bayit, tabou), description trilingue avec badge « traduit par IA », clients correspondants avec score → envoi en 1 clic |
| 3 | Fiche client | Actions rapides (appel / WhatsApp / e-mail / envoyer), critères de recherche, biens correspondants avec raisons du score, timeline, consentements |
| 4 | Dictée & revue IA | Transcription surlignée par catégorie, formulaire pré-rempli, champ « à vérifier » avec l'extrait de la dictée qui le justifie, requis manquant bloquant, recherche de doublons |
| 5 | Générateur d'affiche | Formats, langue, 3 niveaux d'IA avec coût en crédits, 3 variantes rendues avec la charte, légende, pack multi-formats |
| 6 | Onboarding & charte | Analyse du site, palette, polices, contrôles de contraste AA, **aperçu en direct** (CRM + affiches) avec un thème d'agence différent |
| 7 | Pipeline kanban | Étapes, valeurs par colonne, relances en retard, carte en cours de glissement, commissions du mois |
| 8 | Console super-admin | Agences, quotas IA, MRR, détail avec fonctionnalités par agence, impersonation en lecture seule tracée |

## Version mobile (PWA agent terrain)
`galerie-mobile.html` (autonome) ou `mobile/{fr,he}/*.html` ; captures dans `png/mobile/`. Viewport 390 × 844, cibles tactiles ≥ 44 px, barre d'onglets avec action centrale **+**.

| # | Écran | Idée clé |
|---|---|---|
| m1 | Aujourd'hui | Prochaine visite avec itinéraire / appel en un tap, tâches, nouveaux matchs → envoi direct, note Chabbat |
| m2 | Menu « Nouveau » | **Dicter** et **Scanner** en tête, avant la saisie manuelle |
| m3 | Dictée | Plein écran sombre, un seul geste, aide-mémoire des infos à citer |
| m4 | Revue IA | Requis manquant en tête, champ ambigu avec l'extrait de la dictée, enregistrement collant en bas |
| m5 | Scanner un papier | Détection de la page, redressement, multi-pages, import galerie |
| m6 | Biens | Recherche + filtres en puces, cartes à grande photo, envoi en un tap |
| m7 | Fiche client | Actions rapides (appeler / WhatsApp / e-mail / envoyer), prochaine tâche, biens en carrousel |
| m8 | Fiche bien + envoi | Feuille d'envoi : canal, clients cochés, langue propre à chaque client |
| m9 | Affiche & partage | Aperçu, niveau d'IA, partage système (WhatsApp, Instagram) |

La barre d'état reste en LTR en hébreu, comme sur un vrai téléphone ; tout le reste est miroité.

## Choix de design appliqués
- Une couleur de marque + neutres ; couleurs sémantiques fixes (statuts) ; arrondis 6 px ; bordures fines plutôt que grosses ombres (ombres réservées aux couches flottantes).
- RTL natif : propriétés CSS logiques uniquement, icônes directionnelles inversées, numéros de téléphone / références / pourcentages isolés en LTR (`unicode-bidi: isolate`), unités `מ״ר` en hébreu.
- Contenu **réellement traduit** (pas seulement miroir) : formulations, ordre des mots, formats de nombres via `Intl`.
- Les couleurs d'Eliezer.immo sont un **exemple** (teal sur l'écran 6) ; la vraie charte sera extraite du site.

## Régénérer
```bash
node apps/web/scripts/mockups/build-mobile.mjs && node apps/web/scripts/mockups/shots-mobile.cjs   # mobile
node apps/web/scripts/mockups/build.mjs      # HTML (fr/he)
node apps/web/scripts/mockups/shots.cjs      # PNG (Chromium)
```

## Non couvert (à décider)
Mode sombre, états vides / erreur / chargement, écran de liste en mode carte.
