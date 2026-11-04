# Spikes de la phase 0

Un spike = une question technique risquée, tranchée par une mesure, avant d'écrire du code produit.

| # | Question | Statut | Décision |
|---|---|---|---|
| 1 | Rendu d'affiches hébreu RTL : Satori ou Chromium ? | **Fait** (`poster-render/`) | **Chromium.** Satori (RTL) : texte qui déborde du canevas, prix tronqué, ligne de contact absente. Chromium : rendu correct (RTL, ₪, chiffres, polices). ~0,7 s pour 2 affiches avec lancement du navigateur |
| 2 | Qualité STT sur dictées FR / HE / mixtes | **À faire** : nécessite clé API fournisseur + 10 enregistrements réels | — |
| 3 | Lecture vision de papiers manuscrits (HE/FR) | **À faire** : nécessite clé API + 10 photos réelles | — |
| 4 | Extraction de charte depuis l'URL de 5 sites d'agences | **À faire** : nécessite accès réseau aux sites + clé API vision | — |

Protocole pour 2–4 : jeu de 10 échantillons réels anonymisés → vérité terrain JSON → script `eval` qui calcule exactitude par champ et taux de champs inventés (cible 0) → comparaison d'au moins 2 fournisseurs.

Relancer le spike 1 : `pnpm --filter @multideploy/spike-poster-render run`
