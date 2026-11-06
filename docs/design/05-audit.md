# Audit de l'interface actuelle

Constats relevés dans le code et les captures du dépôt, et réponse de cette charte.

| Sujet | Constat | Réponse |
|---|---|---|
| Identité | Le produit s'affiche encore « MultiDeploy » dans le manifeste et les textes. Le logo est une lettre sur un carré bleu. | Nom, logo, icônes d'application |
| Contraste | Badge Actif 4,10:1, badge Sous offre 3,40:1, texte `--faint` 2,97:1, bordure de champ 1,5:1. Le spec exige AA. | 66 paires vérifiées dans les deux thèmes, `border-control` à 3:1 |
| Mode sombre | Les fonds `--ok-soft`, `--warn-soft`, `--bad-soft` et l'accent ne changent pas en sombre. `#fff` est écrit en dur sur l'accent. | Thème sombre complet, token `on-accent` |
| Hiérarchie | Titre de page à 20 px, prix sans mise en avant, tout au même poids. | `t-page` à 28 px, prix en gras aligné à la fin |
| Tableau | « Non exclusif » est répété sur presque chaque ligne, avec le même poids que les vraies alertes. | Texte discret, badge réservé aux mandats à traiter |
| Pipeline | Liste déroulante dans chaque carte, en-têtes qui se cassent, 7ᵉ colonne coupée. | Glisser-déposer, en-têtes sur deux lignes fixes, six colonnes à l'écran |
| Matching | Tous les scores valent 100 sur les données de démo, et l'anneau est bleu comme le reste. | Anneau Tapuz, score toujours expliqué par un texte. Le calcul reste à vérifier côté produit. |
| Filtres | Un bouton Appliquer est nécessaire, alors que le spec vise 300 ms. | Application à la frappe |
| Accueil | L'assistant de démarrage occupe la meilleure place, même une fois l'agence lancée. | Prochaine visite en tête |
| Écriture | « 3.5 pièces » dans les titres et « 3,5 » dans les colonnes. « 0/6 » au lieu de RDC. | Une seule forme, voir Ton et écriture |
| Barre supérieure | Le sélecteur de développement est visible dans les captures. | Absent de la production |
| Police | Inter pour le latin, Heebo pour l'hébreu : deux dessins différents. | IBM Plex Sans et sa version hébraïque, un seul dessin |
