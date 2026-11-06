# Charte graphique NadlanHub

Référence visuelle complète : https://claude.ai/artifact/VmHGqWxsm2cjnYcwSxw9er (privée). Tokens : `apps/web/src/app/globals.css`. Composants : `apps/web/src/app/ui.css`. Thème par agence : `apps/web/src/lib/theme.ts`. Logos : `docs/design/logos/`.

NadlanHub est le CRM des agences immobilières en Israël. Il s'utilise en français, en hébreu et en anglais, sur ordinateur et sur téléphone, sous la marque de chaque agence. Sa promesse tient en une phrase : **Chaque bien trouve son client.**

## Principes

1. **Le travail avant le décor.** Les photos des biens sont la seule image légitime de l'interface. Le reste est typographie, alignement et silence.
2. **La couleur signifie.** Yam agit, Tapuz signale une opportunité, les couleurs de statut informent. Une couleur sans sens n'a pas sa place.
3. **Une marque, deux sens de lecture.** Chaque écran est dessiné pour le français et pour l'hébreu. Un écran qui casse en RTL n'est pas terminé.
4. **Trois profondeurs, jamais perdu.** Liste, aperçu, fiche. Le contexte reste visible, l'URL garde l'état.
5. **L'agence d'abord.** Le client final voit la marque de l'agence. NadlanHub reste discret, à sa place d'outil.

## Ton et écriture

- Écrivez comme un collègue compétent : court, concret, dans le vocabulaire du métier (mamad, machsan, arnona, va'ad bayit, Tabou).
- Vouvoyez l'utilisateur. Écrivez au présent et à la voix active.
- Commencez un bouton par un verbe qui dit ce qui se passe : « Envoyer à 3 clients », « Élargir de 3 % ».
- Une erreur dit quoi corriger : « Il manque 5 chiffres. » Elle n'accuse pas et ne s'excuse pas.
- Mettez des capitales de phrase uniquement. Pas de point d'exclamation, pas d'emoji, pas de slogan dans l'application.
- Écrivez les nombres métier sous une seule forme : `3,5 pièces`, `RDC`, `3 170 000 ₪` en français, `₪3,170,000` en hébreu, `050-123-4567` pour un téléphone.
- Le mot « IA » reste rare : l'interface dit ce qui a été fait (« 11 champs remplis »), pas qui l'a fait.
- L'hébreu est relu par un locuteur natif avant toute mise en production.

## Couleur

- Utilisez les tokens d'usage (`bg`, `surface`, `text`, `accent`). Les échelles `yam-*`, `even-*`, `tapuz-*` servent à construire les tokens et les supports de marque.
- Posez `text` sur `bg`, `surface`, `surface-raised` et `surface-sunken`. Posez `text-muted` sur `bg`, `surface` et `surface-sunken`.
- Sur `accent`, le texte est `on-accent`, jamais du blanc en dur : en sombre, l'accent s'éclaircit et demande un texte foncé.
- Réservez `signal` (Tapuz) au Match et à l'IA. Il ne signifie jamais un statut, une erreur ou un bouton courant.
- `success`, `warning`, `danger` et `info` s'utilisent en texte sur leur fond `*-soft`, avec un mot et un point ou une icône.
- Les champs et les cases utilisent `border-control`, qui atteint 3:1. `border` sert seulement à séparer des zones.
- Le focus clavier est un anneau plein `focus-ring` de 2 px, décalé de 2 px. Il n'est jamais supprimé.

## Typographie

- Titrez les pages en `t-page` avec Frank Ruhl Libre : un seul titre de ce type par écran. Réservez `t-display` et `t-title` aux supports clients et à la connexion.
- Tout le reste de l'interface utilise IBM Plex Sans et IBM Plex Sans Hebrew, en `t-body`, `t-small` et `t-caption`. Le corps de base est 14 px sur ordinateur, 16 px sur mobile.
- Les prix, surfaces et références utilisent `font-variant-numeric: tabular-nums`, alignés à la fin de la colonne.
- `t-over` passe en capitales espacées en latin uniquement. L'hébreu n'a pas de capitales : le même rôle se compose en 12 px sans espacement.
- Le mot-symbole NadlanHub n'est pas du texte. Utilisez toujours les fichiers du groupe Logos.

## Espace et forme

- Tout s'aligne sur une grille de 4 px : `space-1` à `space-16`. Marge de page `space-7`, gouttière `space-3`.
- Rayons : `radius-sm`, `radius`, `radius-lg`. Jamais plus de 12 px dans l'interface de travail. `radius-xl` est réservé aux feuilles mobiles.
- `radius-door` s'applique à un seul angle, sur la photo principale. C'est le seul ornement de l'application.
- Les filets et les fonds étagés séparent les zones. Les ombres sont réservées aux couches flottantes : `shadow-2` pour les menus, `shadow-3` pour le drawer, le dialogue et la palette.
- Densité : lignes de tableau de 44 px par défaut, 52 px en confortable, 36 px en compact, via `--row-h`.

## Mouvement

- 120 ms pour un survol, 160 ms pour un menu, 240 ms pour un drawer, avec la courbe `cubic-bezier(.2, 0, 0, 1)`.
- Le mouvement explique d'où vient un élément. Un survol ne déplace jamais la mise en page.
- Respectez `prefers-reduced-motion`.

## Photographie et illustration

- Les vraies photos passent en premier : lumière naturelle, verticales droites, pas de filtre. Un bien sans photo montre un fond `surface-sunken` et une invitation à en ajouter.
- Les façades dessinées de ce guide sont des illustrations de substitution pour les maquettes. Elles ne vont pas en production.
- Le geste de marque est le débattement. Pas de blob, de verre dépoli, de dégradé violet ou d'illustration 3D.

## Iconographie

Une seule famille : Lucide, trait 1,75, tailles 14, 16, 20, 24. Les icônes directionnelles prennent `flip` en RTL. Une icône seule porte toujours un `aria-label`.

## Accessibilité

WCAG 2.2 AA. Texte à 4,5:1 minimum, contrôles et focus à 3:1, dans les deux thèmes. Navigation complète au clavier. Cibles de 44 px sur mobile. Un état ne repose jamais sur la couleur seule.

## Utiliser ce système

Les tokens gardent les noms de `globals.css` et le kit garde les classes de `ui.css` (`.btn`, `.chip`, `.badge`, `.input`, `.card`, `.tbl`…). Chargez `tokens.css`, puis `components/bundle.css`. Le CSS n'utilise que des propriétés logiques. Le thème d'agence réécrit `accent`, `accent-hover`, `accent-soft`, `accent-text`, `focus-ring` et les tokens `rail*`.
