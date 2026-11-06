# Navigation et expérience

## La barre latérale

Les 8 modules existants restent. Ils sont rangés selon la question que se pose l'agent.

| Groupe | Modules | Question |
|---|---|---|
| Quotidien, sans titre | Aujourd'hui, Agenda | Que dois-je faire ? |
| Portefeuille | Biens, Clients, Affaires | Qu'est-ce que je gère ? |
| Croissance | Marketing, Rapports | Comment je me développe ? |
| Mes vues | Filtres épinglés | Que je consulte souvent ? |

Paramètres, le compte et la mention NadlanHub restent en bas. Le premier bloc du rail change d'agence. La touche `[` replie le rail à 60 px.

## Trois profondeurs

Chaque objet s'ouvre de la même façon.

1. **Liste** : filtres en puces, vues enregistrées, tableau, grille ou carte.
2. **Aperçu** : un clic sur une ligne ouvre le drawer. La liste reste visible. `↑` et `↓` passent à l'objet voisin, `Échap` ferme.
3. **Fiche** : toute la page, pour travailler. Le fil d'Ariane ramène à la liste avec ses filtres.

## Aller vite

- `⌘K` trouve un bien, un client ou une action, avec tolérance sur l'orthographe hébraïque et la translittération. Sur Windows : `Ctrl K`.
- **Nouveau** est toujours au même endroit. Dicter et Scanner passent en premier.
- `G` puis une lettre change de module. `?` affiche tous les raccourcis.
- Une sélection fait apparaître une barre d'actions de masse.

## Règles de conduite

- Une page sert une tâche principale et porte un seul bouton `.btn.pri`.
- Les filtres s'appliquent à la frappe et vivent dans l'URL. Il n'y a pas de bouton Appliquer.
- Ce qui est réversible passe sans confirmation, avec un toast Annuler de 8 secondes. Ce qui est destructeur demande une confirmation.
- Les formulaires enregistrent les brouillons tout seuls et présentent les champs essentiels d'abord.
- Rien ne dépend du survol.
- Le chargement utilise des squelettes. La mise en page ne saute pas.

## Mobile

Cinq onglets : Aujourd'hui, Biens, +, Clients, Plus. Le + ouvre une feuille avec Dicter et Scanner en tête. Une fiche client commence par ses quatre actions : Appeler, WhatsApp, E-mail, Biens. Les cibles font 44 px au minimum et le corps de texte 16 px.

## Parcours visés

Le design sert les critères déjà fixés par le produit : fiche dictée en moins de 45 s, 5 biens envoyés en 4 clics au plus, filtres mis à jour en moins de 300 ms.
