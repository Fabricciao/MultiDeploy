# 05 — Design, UX & internationalisation

## 1. Direction artistique

**Ligne** : outil de travail sérieux, calme, précis — l'esthétique d'un bon logiciel de bureau moderne (type Linear / Attio / Height pour la rigueur), adaptée à l'immobilier par le soin porté aux **photos de biens**, qui sont la seule « décoration » légitime de l'interface.

**Ce qu'on évite explicitement (« AI slop »)**
- Dégradés violet/bleu néon, halos et blobs flous, effets de verre partout.
- Cartes surdimensionnées avec grosses ombres, coins ultra-arrondis uniformes, bordures + ombres + dégradés cumulés.
- Emojis comme icônes, illustrations 3D génériques, mockups « SaaS » stéréotypés.
- Titres marketing dans l'app (« Boostez vos ventes ! »), états vides sans substance.
- Animations gratuites qui ralentissent ; effets de survol qui bougent la mise en page.
- Textes génériques générés (« Bienvenue dans votre espace »). Chaque microcopie est **écrite** (FR/HE/EN) par un humain, concrète, dans le vocabulaire du métier.

**Ce qu'on fait**
- Hiérarchie typographique claire, **densité maîtrisée** (3 niveaux : confortable / standard / compact), alignements stricts sur grille 4/8 px.
- Peu de couleurs : neutres + 1 couleur de marque + couleurs sémantiques fixes. La couleur sert à **signifier** (statut, action principale), pas à décorer.
- Bordures fines (1 px) et fonds étagés plutôt que des ombres ; ombres réservées aux couches flottantes (menus, drawer).
- États vides utiles (« Aucun client ne correspond. Élargir le budget de 10 % ? », bouton d'action, raccourci).
- Mouvement : 120–200 ms, courbes sobres, respect de `prefers-reduced-motion`.

## 2. Design system (`packages/ui`)

### 2.1 Tokens
- **Couleur** : espace OKLCH ; échelles neutres (gris légèrement teintés vers la marque), `brand` (50–950), sémantiques `success/warning/danger/info`. Tokens d'usage : `--bg`, `--surface`, `--surface-raised`, `--border`, `--text`, `--text-muted`, `--accent`, `--focus-ring`. Clair / sombre / (auto).
- **Typographie** :
  - Latin : une grotesque lisible (ex. *Inter*, *Geist* ou *Instrument Sans*) ; chiffres tabulaires pour prix et tableaux.
  - Hébreu : *Heebo* / *Rubik* / *Assistant* appariées en graisse et hauteur d'x à la police latine (réglage `size-adjust`).
  - Échelle modulaire : 12 / 13 / 14 (base) / 16 / 20 / 24 / 32.
- **Espacement** : 4 px de base ; **rayon** : 4 / 6 / 10 px (réglable par la charte, jamais > 12 px dans l'UI de travail) ; **élévation** : 0 / 1 / 2 (flottant).
- **Iconographie** : une seule famille (Lucide ou Phosphor, trait 1,5 px) ; icônes **miroir en RTL** quand directionnelles (flèches, retour), jamais pour les icônes sémantiques (horloge, téléphone).
- **Densité** : variable globale `--row-h` (36/32/28 px).

### 2.2 Composants (shadcn/ui + Radix, personnalisés)
Bouton, champ, sélecteur avec recherche, multi-sélection à puces, plage de valeurs (prix/pièces), date, tableau de données (tri, colonnes redimensionnables, sélection multiple, virtualisation), drawer de fiche, kanban, filtres en « chips » avec éditeur par popover, palette de commandes, toasts avec *Annuler*, dialogues de confirmation à saisie pour actions destructrices, upload avec progression, galerie photo (glisser-déposer pour ordonner), carte, timeline d'activité, enregistreur vocal, visionneuse « image source ↔ formulaire » pour la revue IA, éditeur de template d'affiche (limité et guidé), sélecteur de couleur accessible.

### 2.3 Accessibilité
WCAG 2.2 AA : contrastes calculés automatiquement (y compris sur thèmes d'agence), navigation clavier complète, focus visible, ARIA correct (Radix), labels d'icônes, annonces lecteur d'écran sur actions optimistes, cibles tactiles ≥ 44 px sur mobile.

## 3. Structure de navigation

**Desktop** : barre latérale fine (icônes + libellés) repliable — *Aujourd'hui, Biens, Clients, Affaires, Agenda, Marketing, Rapports, Paramètres* — barre supérieure : recherche ⌘K, bouton **« + Nouveau »** (menu : Dicter · Scanner un papier · Client · Bien · Tâche), sélecteur d'agence (si multi), langue, notifications, profil.

**Mobile (PWA)** : barre d'onglets en bas (Aujourd'hui · Biens · **+** · Clients · Plus). Le **+** central ouvre directement le choix **Dicter / Scanner / Saisir**. Fiche client : actions rapides en tête (appeler, WhatsApp, e-mail, envoyer des biens).

**Principes UX**
- Une page = une tâche principale. Drawer latéral pour consulter sans perdre le contexte.
- Les filtres sont toujours visibles, résumés en chips, sauvegardables.
- Formulaires en sections repliables, champs essentiels d'abord (« Complet à 70 % » plutôt que blocage), enregistrement automatique des brouillons.
- Confirmer ce qui est destructeur, **annuler ce qui est réversible** (toast « Annuler » 8 s).
- Actions en masse cohérentes (barre contextuelle dès sélection).
- Aucune dépendance au survol (mobile) ; raccourcis clavier documentés (`?`).

### Écrans prioritaires à concevoir en premier (haute fidélité avant le code)
1. Liste des biens (tableau + grille + carte + panneau de filtres)
2. Fiche bien (galerie, données, propriétaire, matchs, envoi, affiche)
3. Fiche client (timeline, critères, matchs, actions rapides)
4. Création par dictée / photo + écran de revue IA
5. Générateur d'affiche
6. Onboarding agence + éditeur de charte avec aperçu en direct
7. Pipeline kanban
8. Console super-admin (liste des agences, détail, impersonation)

Méthode : wireframes basse fidélité → maquettes des 8 écrans en FR **et** HE (RTL) → prototype cliquable → seulement ensuite implémentation. Mise à l'épreuve avec Eliezer.immo (3 agents réels) avant de généraliser.

## 4. Internationalisation (FR / HE / EN)

### 4.1 Technique
- Routage `/{locale}/…` (`fr`, `he`, `en`) ; langue de l'**utilisateur** (préférence profil) distincte de la langue par défaut de l'**agence** et de la langue du **client** (envois).
- `<html lang dir>` piloté par la locale (`dir="rtl"` pour `he`).
- **CSS en propriétés logiques exclusivement** : `margin-inline-start`, `padding-inline`, `inset-inline-end`, `text-align: start`, `border-start-*`… Tailwind : utilitaires `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`. Interdit : `ml-`, `pr-`, `left-`, `right-` (règle ESLint dédiée).
- Icônes directionnelles inversées par `rtl:` ; défilement/tables/kanban/timeline suivent le sens.
- **Bidirectionnel** : isolation des segments mixtes (`<bdi>`, `dir="auto"` sur champs libres, `unicode-bidi: plaintext` pour noms, adresses, numéros) ; numéros de téléphone toujours LTR (`dir="ltr"`) ; prix `₪` et devises : formatage via `Intl.NumberFormat(locale, {style:'currency'})` et isolation bidi.
- Dates & nombres : `Intl`, calendrier grégorien par défaut ; option d'affichage de la **date hébraïque** secondaire (utile en Israël) ; semaine commençant le dimanche (configurable), week-end vendredi-samedi configurable.
- Messages : ICU MessageFormat (pluriels hébreux : forme singulier/duel/pluriel selon cas, genre) ; clés stables `module.écran.élément`; aucune concaténation de phrases.
- Contenu métier **multilingue par champ** (`title`, `description`, noms d'étapes, modèles d'e-mails…) — stocké en `jsonb {fr,he,en}` ou tables de traduction.
- Tri et recherche sensibles à la langue (`Intl.Collator` hébreu/français), normalisation sans niqqud.
- E-mails, PDF, affiches : rendus dans la **langue du destinataire**, mise en page RTL testée.
- Saisie : claviers hébreu/latin, champs « nom » doubles (latin / hébreu), autocomplétion d'adresses avec alias.

### 4.2 Processus de traduction
- Source de vérité : **FR** (puis EN, puis HE relu par un natif) ; outillage de contrôle (clés manquantes = échec CI).
- Traduction initiale assistée par IA, **relecture humaine obligatoire pour l'hébreu** (registre professionnel, vocabulaire immobilier israélien : דירת גן, פנטהאוז, ממ"ד, מרפסת סוכה, ארנונה, ועד בית, טאבו, מחסן…).
- Glossaire immobilier maintenu dans le dépôt (`docs/glossary.md`) pour la cohérence FR/HE/EN.
- Tests visuels Playwright en `he` à chaque PR (captures RTL) pour détecter les inversions cassées.

### 4.3 Spécificités locales intégrées
Devise ILS par défaut avec séparateurs locaux ; surfaces en m² ; pièces avec demi-pièces (3,5) ; étages « RDC / 1 … » ; calendrier des jours fériés israéliens (Chabbat, fêtes) dans l'agenda ; numéros de téléphone israéliens (préfixes mobiles 05x, formats d'affichage `050-123-4567`) ; adresses : ville / rue / numéro / appartement ; fuseau `Asia/Jerusalem`.

## 5. Mode sombre & thème par agence
- Thème clair par défaut, sombre au choix (et « auto »).
- Le thème d'agence ne modifie **que** `brand`, `accent`, rayon, logo ; il est testé automatiquement (contrastes, lisibilité) à chaque modification.
- Aperçu avant application ; réinitialisation en un clic ; plafond de « fantaisie » (l'app garde sa lisibilité même avec une charte très colorée).

## 6. Performance perçue & états
- Squelettes (pas de spinners plein écran), transitions de contenu stables (pas de décalage de mise en page — CLS < 0,05).
- États : chargement, vide, erreur récupérable, hors-ligne (bandeau + file d'attente de brouillons), limite de quota IA atteinte.
- Images : `next/image`, formats AVIF/WebP, vignettes générées, *blur placeholder* depuis une miniature de 20 px.
