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

## Choix de design appliqués
- Une couleur de marque + neutres ; couleurs sémantiques fixes (statuts) ; arrondis 6 px ; bordures fines plutôt que grosses ombres (ombres réservées aux couches flottantes).
- RTL natif : propriétés CSS logiques uniquement, icônes directionnelles inversées, numéros de téléphone / références / pourcentages isolés en LTR (`unicode-bidi: isolate`), unités `מ״ר` en hébreu.
- Contenu **réellement traduit** (pas seulement miroir) : formulations, ordre des mots, formats de nombres via `Intl`.
- Les couleurs d'Eliezer.immo sont un **exemple** (teal sur l'écran 6) ; la vraie charte sera extraite du site.

## Régénérer
```bash
node apps/web/scripts/mockups/build.mjs      # HTML (fr/he)
node apps/web/scripts/mockups/shots.cjs      # PNG (Chromium)
```

## Non couvert (à décider)
Version **mobile** (dictée en plein écran, barre d'onglets, fiche client compacte), mode sombre, états vides / erreur / chargement, écran de liste en mode carte.
