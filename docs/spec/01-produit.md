# 01 — Produit & fonctionnalités

## 1. Personas

| Persona | Besoin principal | Contexte d'usage |
|---|---|---|
| **Directeur / Admin d'agence** | Vue d'ensemble, pilotage des agents, charte, droits, facturation, export | Desktop, quelques fois par jour |
| **Agent immobilier** | Saisir vite, trouver le bon bien pour le bon client, relancer, envoyer, produire des visuels | **Mobile en déplacement** + desktop au bureau |
| **Assistant(e) / secrétariat** (rôle optionnel) | Saisie, planning, envoi de dossiers | Desktop |
| **Client final** (indirect) | Recevoir des biens dans sa langue, s'y retrouver, répondre simplement | E-mail, WhatsApp, page publique de sélection |
| **Super-admin plateforme (vous)** | Créer/suspendre des agences, voir l'usage, support, facturation | Console séparée |

## 2. Modules

### 2.1 Tableau de bord
- « Aujourd'hui » : tâches du jour, visites, relances en retard, mandats exclusifs qui expirent, nouveaux matchs.
- Widgets personnalisables (agent : mes chiffres ; admin : agence + par agent).
- KPI : leads créés, taux de transformation par étape, délai moyen lead→visite, biens actifs/vendus, CA estimé (commissions), sources de leads.
- Filtre période + comparaison période précédente.

### 2.2 Contacts (clients)
- Types multiples par contact : acheteur, vendeur, bailleur, locataire, investisseur, avocat, partenaire, autre.
- Champs : noms (latin + hébreu), téléphones (normalisation E.164, indicateur WhatsApp), e-mails, langue préférée (FR/HE/EN), pays de résidence, statut Alyah (pré-alyah / olé récent / résident), source, agent référent, tags, notes.
- **Critères de recherche** (pour acheteurs/locataires) : transaction, types de bien, villes/quartiers, budget min/max + devise, pièces, surface, étage, options (mamad, parking, ascenseur, balcon soukka, climatisation, meublé…), date d'entrée souhaitée, financement (accord hypothécaire oui/non/montant).
- Fiche 360° : timeline unifiée (appels, e-mails envoyés/ouverts, visites, notes, changements de statut), biens envoyés, biens visités, tâches, documents, affaires liées.
- Consentements : opt-in marketing (date, canal, preuve), désinscription, « ne pas contacter ».
- Détection de doublons (téléphone normalisé + nom flou) avec fusion assistée.
- Import CSV/Excel/Google Contacts avec mapping de colonnes assisté par IA.

### 2.3 Biens (listings)
- Types : vente, location longue durée, location courte durée (option), commercial, terrain, projet neuf.
- Champs spécifiques Israël : nombre de pièces (pas de 0,5), surface construite / jardin / balcon, étage / étages total, **mamad/mamak**, balcon soukka, parking (nb), **machsan** (cave/réserve), ascenseur, climatisation, accessibilité, meublé, état (neuf promoteur / rénové / à rénover), **arnona** mensuelle, **va'ad bayit** mensuel, type de titre (Tabu / Minhal / société de gestion — *« type d'enregistrement »*), date d'entrée (immédiate / flexible / date), orientation, vue, nombre de salles de bain, année de construction, TAMA 38 / rénovation urbaine (flag).
- Prix + devise (ILS/USD/EUR), prix au m² calculé, historique des prix (baisses = déclencheur de relance).
- **Mandat** : exclusif / non exclusif, dates début/fin, commission %, alerte d'expiration, copie signée.
- Propriétaire(s) lié(s) (contacts), agent responsable, co-agents.
- Médias : photos (tri par glisser-déposer, photo de couverture, légendes), vidéo/lien, plan, visite 360 (lien), documents (Tabu, plan, arnona…) avec visibilité interne uniquement.
- **Description multilingue** : FR / HE / EN. Une langue source, traduction IA des autres, badge « traduit par IA — relu / non relu », édition manuelle.
- Statuts : brouillon → actif → sous offre → vendu/loué → retiré / expiré. Journal des changements.
- Localisation : adresse (autocomplétion), carte, coordonnées ; **adresse exacte masquable** sur les supports publics (quartier/rue seulement).
- Page publique de partage `/p/{token}` : fiche élégante, branding de l'agence, langue auto, bouton « Je suis intéressé » / WhatsApp, suivi d'ouverture.

### 2.4 Recherche & filtres
- Barre de recherche globale **⌘K / Ctrl+K** : biens, contacts, actions (« nouveau client », « envoyer sélection »).
- Filtres biens : transaction, type, ville/quartier (multi), fourchette prix / pièces / surface / étage, options (cases), statut, agent, exclusivité (dont expire < 30 j), date de mise en ligne, prix en baisse, avec/sans photos, avec/sans propriétaire lié, texte libre.
- **Vues enregistrées** (privées ou partagées avec l'agence), tri multi-colonnes, colonnes configurables.
- Modes d'affichage : tableau dense, cartes/grille, **carte** (clusters, dessin de zone).
- État des filtres dans l'URL (lien partageable, retour arrière fidèle).
- Recherche texte : normalisation hébreu (suppression des niqqud, variantes d'écriture) + trigram pour tolérer les fautes ; translittération FR↔HE des noms de rues/quartiers (alias).

### 2.5 Matching bien ↔ client
- Score de correspondance (critères obligatoires éliminatoires + critères souhaités pondérés).
- Sur un bien : « 7 clients correspondent » → sélection multiple → **envoyer**.
- Sur un client : « 12 biens correspondent » → sélection → **envoyer**.
- Alerte automatique à l'agent à la création/modification d'un bien (« 3 clients intéressés »).
- Exclusion des biens déjà envoyés/refusés (mémoire du feedback client).

### 2.6 Pipeline / affaires (deals)
- Kanban + liste. Étapes configurables par agence (défaut : Nouveau lead → Qualifié → Visites → Offre → Négociation → Promesse/Signature → Conclu / Perdu).
- Affaire = client + bien(s) + agent(s) + valeur + commission prévue (% + TVA) + répartition entre agents.
- Motif de perte obligatoire (liste configurable) → analytics.
- Automatisations simples : changement d'étape → tâche automatique (ex. « Visite faite → relancer sous 48 h »).

### 2.7 Tâches, agenda & visites
- Tâches (échéance, priorité, lié à contact/bien/affaire), rappels (push + e-mail).
- Agenda agence : visites avec créneaux, conflits détectés, synchronisation Google Calendar (phase 2) et fichier ICS.
- **Calendrier conscient de Chabbat/jours fériés israéliens** : avertissement lors de la planification, jours non travaillés configurables, heures calmes pour les notifications.
- Fiche de visite : signature numérique du client sur téléphone (preuve de présentation du bien — utile pour la rémunération de l'intermédiaire).

### 2.8 Communication
- **E-mail** : envoi depuis la plateforme au nom de l'agent (domaine d'envoi de l'agence authentifié DKIM/SPF), modèles FR/HE/EN avec variables, suivi ouverture/clic, réponses routées vers l'agent.
- **Bouton « Envoyer à un client »** sur chaque bien (et sélection multiple → « sélection personnalisée » dans un seul e-mail) : langue du client auto, aperçu, pièces jointes (PDF fiche), lien page publique.
- **WhatsApp** : phase 1 = lien `wa.me` pré-rempli (message + lien de la page publique, dans la langue du client) ; phase 4 = WhatsApp Business Cloud API (modèles approuvés, historique).
- Journal d'appels : bouton « Appeler » + invite « Résultat de l'appel ? » (+ note vocale dictée).
- Respect du consentement : blocage de l'envoi marketing sans opt-in, lien de désinscription.

### 2.9 Marketing & affiches
- Générateur d'affiches (voir `04-ia.md`) : formats Facebook post, Facebook/Instagram carré 1:1, portrait 4:5, Story/Reel 9:16, bannière lien 1.91:1, A4 imprimable ; FR/HE/EN ; variantes multiples.
- Bibliothèque de templates par agence (verrouillables par l'admin pour garder la cohérence).
- Historique des créations par bien, téléchargement PNG/JPG/PDF, copie de la légende (hashtags, localisation), partage direct.
- Campagnes e-mail simples (sélection de biens → liste de contacts filtrée, avec opt-in uniquement).
- Phase 4 : publication directe Meta (Facebook Pages / Instagram) via API, planification.

### 2.10 Documents
- Stockage par bien/client/affaire, catégories, visibilité (interne / partageable), versions.
- Modèles de documents FR/HE/EN générés avec variables (ordre de service de courtage, fiche de visite, offre d'achat, lettre type) — *à faire valider par un juriste local.*
- Signature électronique (phase 3+, via fournisseur tiers ou signature simple sur écran).

### 2.11 Rapports & exports
- Rapports prêts à l'emploi : performance agents, sources, entonnoir, biens par statut/ancienneté, mandats expirants, commissions prévues/encaissées.
- Export CSV/XLSX de toute vue filtrée ; export complet de l'organisation (portabilité) ; rapport planifié par e-mail.

### 2.12 Paramètres d'agence (Admin)
- Profil d'agence (nom FR/HE/EN, adresse, n° d'enregistrement/licence, mentions légales pour supports).
- **Charte graphique** : brand kit (import depuis URL, upload logo, ajustements) → thème du CRM + affiches + e-mails.
- Membres & invitations, rôles, visibilité (agents voient tout / seulement leurs contacts).
- Pipeline, motifs de perte, sources, tags, champs personnalisés, modèles d'e-mail/messages/documents.
- Domaine d'envoi e-mail, intégrations (Google Calendar, WhatsApp, Meta, site web), clés API/webhooks.
- Langue par défaut, devise par défaut, fuseau horaire (Asia/Jerusalem par défaut), format de date.
- Facturation/plan/quota IA (visible owner).

### 2.13 Console plateforme (super-admin — vous)
- Créer une agence (wizard), inviter le premier owner, choisir le plan, injecter les données initiales.
- Liste des tenants, état, usage (utilisateurs, stockage, crédits IA), suspension/réactivation, notes internes.
- **Impersonation en lecture seule, journalisée et visible côté client** (pour le support).
- Feature flags par tenant, quotas, annonces produit (bannière in-app).
- Facturation (Stripe + facture légale locale), santé système.

## 3. Rôles & permissions

Le rôle est une **liste de capacités** (table `role_capabilities`) et non un `if role == 'admin'` en dur : ajouter un rôle « assistant » ou « avocat partenaire » devient de la configuration.

Rôles de base : **owner** (admin + facturation), **admin**, **agent**, *(optionnels)* **assistant**, **lecture seule**.

| Capacité | Owner | Admin | Agent | Assistant | Lecture |
|---|:-:|:-:|:-:|:-:|:-:|
| Voir tous les biens de l'agence | ✔ | ✔ | ✔ | ✔ | ✔ |
| Créer/éditer ses biens | ✔ | ✔ | ✔ | ✔ | — |
| Éditer les biens des autres | ✔ | ✔ | option | option | — |
| Voir tous les contacts | ✔ | ✔ | **réglable** (tous / siens + partagés) | réglable | réglable |
| Créer/éditer ses contacts | ✔ | ✔ | ✔ | ✔ | — |
| Réattribuer contacts/biens | ✔ | ✔ | — | — | — |
| Supprimer définitivement | ✔ | ✔ | — (corbeille 30 j) | — | — |
| Exporter données | ✔ | ✔ | limité à sa vue | — | — |
| Voir commissions | ✔ | ✔ | les siennes | — | — |
| Gérer membres / rôles | ✔ | ✔ | — | — | — |
| Charte graphique & templates | ✔ | ✔ | utiliser (éditer si autorisé) | utiliser | — |
| Facturation / plan | ✔ | — | — | — | — |
| Journal d'audit | ✔ | ✔ | — | — | — |
| Utiliser IA (voix, photo, affiches) | ✔ | ✔ | ✔ (quota) | ✔ | — |

Règles :
- Au moins un `owner` par agence (impossible de supprimer le dernier).
- Quotas IA par agence, avec **sous-quota par utilisateur** optionnel.
- Un utilisateur peut appartenir à plusieurs agences (ex. consultant) avec sélecteur d'agence active.
- Un contact peut être « partagé » avec d'autres agents sans changer de propriétaire.

## 4. Parcours clés (critères d'acceptation)

| # | Parcours | Critère mesurable |
|---|---|---|
| P1 | Nouveau client par **dictée** (mobile) | De « tap micro » à fiche enregistrée < 45 s, ≥ 90 % des champs dictés correctement pré-remplis (jeu de test FR/HE/mixte) |
| P2 | Nouveau client/bien par **photo** d'un papier manuscrit | Photo → formulaire revu < 30 s ; champs incertains surlignés |
| P3 | Créer un bien et générer une affiche Instagram | Bien complet → affiche aux couleurs de l'agence < 60 s |
| P4 | Envoyer 5 biens à un client par e-mail | ≤ 4 clics depuis la fiche client, e-mail dans la langue du client |
| P5 | Trouver un bien (filtres) | Résultats mis à jour < 300 ms, filtre partageable par URL |
| P6 | Créer une nouvelle agence cliente | < 10 min de bout en bout, environnement isolé, thème appliqué |
| P7 | Isolation | Suite de tests : un utilisateur de l'agence A ne peut lire/écrire aucune ligne ni fichier de l'agence B (0 échec toléré) |
| P8 | Changement de langue FR↔HE↔EN | Bascule instantanée, RTL correct, aucune chaîne non traduite |

## 5. Hors périmètre v1 (assumé)
Comptabilité complète, portail client avec compte, application native iOS/Android (PWA à la place), publication automatique sur Yad2/Madlan (pas d'API publique générale — import/export CSV et saisie assistée à la place), scraping de portails tiers (risque juridique/ToS).
