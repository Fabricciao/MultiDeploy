# Marque blanche

Une agence choisit une couleur, un logo et un rayon. Le reste ne bouge pas.

| Change avec l'agence | Ne change jamais |
|---|---|
| `rail`, `rail-hover`, `rail-active`, `rail-text`, `rail-muted` | `bg`, `surface`, `border`, `text` |
| `accent`, `accent-hover`, `accent-soft`, `accent-text`, `focus-ring` | `success`, `warning`, `danger`, `info` |
| Logo, nom, rayon de 4 à 10 px | `signal` (Tapuz), typographie, icônes |

- Le rail prend le pas 950 de l'échelle de l'agence. Sa clarté est fixe : toute couleur donne un rail sombre et lisible.
- `accent` prend le pas le plus clair qui atteint 4,5:1 sur blanc, comme le fait déjà `themeCss`.
- Le thème par défaut de NadlanHub fixe `accent` sur `yam-700`, un pas plus profond que ce calcul.
- Une couleur d'agence proche d'une couleur de statut reste possible, car un statut porte toujours un mot et un point.
- Une couleur d'agence orange reste distincte de Tapuz en interface, car Tapuz n'apparaît que sur les scores et les propositions de l'IA.
- Sur les supports clients, la couleur et le logo de l'agence remplacent entièrement ceux de NadlanHub.
- Le logo de l'agence, dans le rail, se pose sur une pastille `surface` : il reste lisible quelle que soit sa couleur.
