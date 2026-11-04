# 06 — Roadmap, coûts, risques, idées bonus

## 1. Phasage

Estimations pour **un développeur senior assisté par IA** (vous + Claude Code), à ajuster : elles servent à ordonner, pas à promettre.

### Phase 0 — Fondations & spikes (≈ 1–2 semaines)
- Dépôt, monorepo, CI, environnements local/preview/staging/prod.
- Supabase : schéma de base **multi-tenant**, Custom Access Token Hook, `role_capabilities`, premiers tests pgTAP d'isolation.
- Auth : e-mail + Google OAuth, invitations, sélecteur d'agence.
- i18n FR/HE/EN + RTL opérationnels dès la première page ; design tokens ; thème par organisation.
- **Spikes de risque (1 journée chacun)** :
  1. Rendu d'une affiche hébreu+français+₪ (Satori vs Chromium) ;
  2. Qualité STT sur 10 dictées FR/HE/mixtes ;
  3. Lecture vision de 10 papiers manuscrits (hébreu/français) ;
  4. Extraction de charte sur 5 sites d'agences israéliennes.
- Maquettes haute fidélité des 8 écrans prioritaires (FR + HE).
- **Livrable** : squelette déployé, 2 tenants de test isolés prouvés par les tests.

### Phase 1 — CRM cœur pour Eliezer.immo (≈ 5–7 semaines)
- Contacts (fiche 360°, critères, doublons, import CSV), Biens (fiche complète, médias, mandats, traductions manuelles), recherche ⌘K, **filtres + vues enregistrées + carte**.
- Matching bien↔client, **envoi par e-mail** (modèles FR/HE/EN, suivi), lien WhatsApp, page publique de partage.
- Pipeline kanban, tâches, agenda, visites.
- Rôles admin/agent + visibilité réglable, audit log, corbeille.
- Dashboard « Aujourd'hui » + 3 rapports.
- PWA mobile, tests e2e des parcours P4, P5, P7, P8.
- **Mise en production avec Eliezer.immo** (données migrées) → retours terrain.

### Phase 2 — IA & marketing (≈ 3–4 semaines)
- Saisie **vocale** et par **photo** (P1, P2) avec écran de revue + jeu d'évaluation.
- Traduction/rédaction d'annonce.
- **Brand kit** (import depuis URL, éditeur, thème CRM).
- **Générateur d'affiches** (formats Facebook/Instagram/Story), variantes, historique, régénération avec nouvelle charte.
- Compteurs de crédits IA par agence.

### Phase 3 — SaaS multi-agences (≈ 3–4 semaines)
- Console super-admin (création d'agence en < 10 min, usage, suspension, impersonation tracée).
- Onboarding guidé d'une nouvelle agence (charte, équipe, import).
- Plans, Stripe, quotas (sièges, stockage, crédits IA), essais, facturation légale locale.
- Sous-domaines par agence, domaine personnalisé (option).
- Documentation utilisateur FR/HE/EN, site/landing de présentation, conditions & DPA.
- Pilote avec 1–2 agences amies (prix réduit) avant lancement.

### Phase 4 — Croissance (continu)
WhatsApp Business API, synchronisation site web/widget, publication Meta, Google Calendar, signature électronique, recherche sémantique, API publique/webhooks, marketplace de templates, white-label, application mobile native si la PWA atteint ses limites.

## 2. Coûts

> Tarifs publics susceptibles de changer — **à re-vérifier au moment de souscrire**.

| Poste | Dev / pilote | Production (1–10 agences) | Remarque |
|---|---|---|---|
| Vercel | Hobby gratuit | **Pro ≈ 20 $/mois/membre d'équipe** | ⚠️ Le plan Hobby est réservé à un usage **non commercial** : dès que vous facturez ou que l'agence l'utilise pour son activité, il faut Pro (ou héberger ailleurs : Cloudflare Pages, Netlify, VPS/Coolify) |
| Supabase | Free (projet mis en pause après inactivité) | **Pro ≈ 25 $/mois** (sauvegardes quotidiennes, pas de pause, plus de capacité) | PITR en option payante |
| Domaine + wildcard | ≈ 10–15 $/an | idem | `.com`/`.app`/`.co.il` |
| E-mail transactionnel (Resend) | Free (quota mensuel limité) | Free → ≈ 20 $/mois | ou Amazon SES (très bas coût au volume) |
| Sentry / PostHog / Upstash | Free | Free (puis payant si volume) | |
| Rendu d'affiches (si Chromium) | 0 (local) | ≈ 5 $/mois (conteneur) | seulement si Satori insuffisant |
| Cartes (MapTiler/OSM) | Free | Free → ≈ 25 $/mois | Google Maps évité par défaut |
| Fournisseurs IA | quelques $ de tests | **à l'usage**, répercuté via crédits | voir `04-ia.md` §7 |
| Stripe | — | ≈ % par transaction | |
| **Total fixe** | **≈ 0 $** | **≈ 45–50 $/mois** (+ IA) | |

**Marge SaaS indicative** : si une agence paie 120–300 ₪/utilisateur/mois (à benchmarker contre les CRM locaux), le coût marginal par agence (stockage, e-mail, IA incluse) reste faible ; le seuil de rentabilité de l'infra est atteint dès la **1re–2e agence**. Les crédits IA doivent être calibrés pour que le poste « affiches créatives » reste rentable.

**Pistes pour réduire encore** : front sur Cloudflare Pages (gratuit en commercial), conserver Supabase Free pendant le pilote interne (avec ping de maintien — et sauvegarde externe), plafonner les crédits IA, n'activer que « Fidèle/Amélioré » dans le plan d'entrée.

## 3. Risques & parades

| Risque | Impact | Parade |
|---|---|---|
| Fuite de données entre agences | Fatal commercialement | RLS partout, `force row level security`, tests pgTAP + e2e bloquants en CI, revue sécurité avant 1re vente |
| Qualité STT/vision sur l'hébreu manuscrit et le mélange FR/HE | Fonction phare dégradée | Spikes phase 0, écran de revue systématique, vérification croisée des nombres, jeu d'évaluation continu, fournisseur interchangeable |
| Rendu hébreu RTL des affiches | Affiches inutilisables | Spike précoce, interface `PosterRenderer`, repli Chromium |
| Coûts IA qui dérapent | Marge négative | Crédits par tenant, rate-limit, garde-fous, mode « Fidèle » gratuit |
| Conformité (vie privée, opt-in marketing, mentions courtier) | Risque juridique client | Avis d'un juriste local, consentement tracé, mentions obligatoires bloquantes, DPA type |
| Sur-ingénierie avant validation du marché | Retard | Phase 1 livrée et utilisée par Eliezer.immo avant de construire la phase 3 ; flags pour tester |
| Dépendance à un fournisseur (Vercel/Supabase/IA) | Coût/lock-in | Postgres standard exportable, interfaces IA, front portable |
| Adoption par les agents | Outil non utilisé | Co-conception avec 3 agents, parcours mobiles, saisie vocale comme argument n°1, formation courte |
| Qualité des traductions hébreu | Image de marque | Relecture native, glossaire, badge « traduit par IA » |
| Publication sur portails (Yad2/Madlan) non automatisable | Attente client | Export CSV/feeds, copier-coller assisté, étudier partenariats officiels |

## 4. Indicateurs de succès
- Temps médian de création d'un client < 45 s (dictée) — vs. saisie manuelle de référence mesurée en phase 1.
- ≥ 80 % des fiches créées par agents via voix/photo/import après 2 mois (adoption).
- 0 incident d'isolation, 0 bug bloquant RTL.
- LCP < 1,5 s, INP < 200 ms.
- Onboarding d'une nouvelle agence < 10 min.
- Taux d'utilisation des affiches : ≥ 1 affiche générée pour 70 % des biens publiés.

## 5. Questions ouvertes (à trancher avec vous)
1. **Image « GPT-2 »** : confirmez-vous le modèle d'image GPT d'OpenAI (famille `gpt-image-*`) ? Souhaitez-vous aussi autoriser un second fournisseur ?
2. **Eliezer.immo** : combien d'agents, quel outil/Excel actuel, quelles données à migrer ? Le site actuel est-il en WordPress/Wix/autre (pour la synchronisation de biens) ?
3. **Marché cible** : prix visé par utilisateur, devise de facturation, besoin de facture légale israélienne immédiatement ?
4. **Hébergement du front** : Vercel Pro (simple) ou Cloudflare/VPS (moins cher, plus d'ops) ?
5. **Marque produit** : nom commercial et domaine (impacte sous-domaines, e-mails, landing).
6. **Périmètre WhatsApp** : lien `wa.me` en v1 suffit-il, ou l'API officielle est-elle indispensable au lancement ?
7. **Location courte durée / commercial / projets neufs** dans la v1 ou plus tard ?
8. **Juridique** : avez-vous un juriste/conseil pour valider CGV, DPA, mentions de courtage ?
9. **Design** : références visuelles que vous aimez/détestez ? (je produis 2 pistes de direction artistique avant maquettes.)

---

## 6. Fonctionnalités bonus (auxquelles vous n'avez peut-être pas pensé)

### Gain de temps immédiat pour les agents
1. **Note vocale post-visite** → résumé + tâches de relance automatiques + mise à jour du statut du client.
2. **Capture « partager vers le CRM »** (PWA) : partager une capture d'annonce ou un message WhatsApp vers l'app → extraction vers un bien ou un lead.
3. **Détection de doublons de biens** (même adresse/étage/surface ou photos similaires) : évite que deux agents saisissent le même bien.
4. **Nettoyage de la base** : contacts sans téléphone valide, biens sans photo, mandats sans date → « score de qualité » et file de correction.
5. **Brief du matin** par e-mail/notification : visites, relances dues, nouveaux matchs, mandats qui expirent.
6. **Relances intelligentes** : « Pas de nouvelles depuis 14 jours » suggérées avec brouillon de message dans la langue du client.
7. **Création rapide de lead depuis le site web** : formulaire embarquable qui assigne l'agent selon règles (langue, secteur, tour de rôle).

### Spécificités du marché israélien
8. **Calculateur d'achat** : **mas rechisha** (taxe d'achat, barèmes paramétrables, avantages olim/résident/investisseur), frais d'agence + TVA, avocat, estimation hypothèque ; export PDF à remettre au client.
9. **Parcours Alyah** : étiquette « pré-alyah » avec date d'arrivée prévue, checklist, relance déclenchée à l'approche de la date.
10. **Planification consciente de Chabbat et fêtes**, notifications silencieuses selon la pratique de l'utilisateur/client.
11. **Fiche « investisseur »** : rendement locatif estimé, comparables du quartier, scénario d'achat-revente.
12. **Alerte exclusivité** : relance automatique du propriétaire X jours avant l'expiration, génération du renouvellement.
13. **Génération de la feuille de visite / ordre de courtage** pré-remplie en HE/FR avec **signature sur téléphone**, archivée avec horodatage (preuve utile en cas de litige de commission).
14. **Calendrier des travaux/règlements de copropriété** (ועד בית) : rappels sur biens loués/gérés.

### Marketing & clients
15. **Page de sélection personnalisée** (lien unique) : le client note ♥ / ✕ chaque bien, ses retours alimentent le matching et la timeline.
16. **QR sur les affiches** → page publique avec suivi (qui scanne, quel bien) → signal de « lead chaud ».
17. **Alerte « bien refroidi »** : bien en ligne depuis 45 j sans visite → suggestion de baisse de prix argumentée, de nouvelles photos, ou d'une nouvelle affiche.
18. **Bibliothèque de légendes/hashtags** par quartier et langue ; **calendrier éditorial** social (idées de posts : « vendu ! », « nouveau », « portes ouvertes »).
19. **Post « Vendu / Loué »** automatique en un clic (preuve sociale) avec accord du client.
20. **Rapport propriétaire** hebdomadaire envoyé automatiquement (vues, visites, retours) → fidélise le mandant et justifie l'exclusivité.
21. **Programme de parrainage** : suivi des recommandations, rappel d'anniversaire d'achat, demande d'avis Google après transaction.

### Pilotage & plateforme
22. **Tableau de classement et objectifs** (sans toxicité : objectifs par agent, progression, pas de stigmatisation).
23. **Répartition de commission** multi-agents avec règles par agence.
24. **Analyse des sources de leads** : coût et rendement par canal (Facebook, Yad2, bouche à oreille…).
25. **Mode « présentation écran »** : affichage plein écran d'un bien pour montrer au client en agence (masque les infos internes).
26. **Assistant de recherche en langage naturel** (« 4 pièces Raanana, <3,5 M₪, avec mamad ») transformant la phrase en filtres.
27. **API + webhooks + connecteurs n8n/Make/Zapier** : vos clients agences branchent leurs automatisations ; argument de vente.
28. **White-label** (pas de mention de votre marque, domaine propre) en option premium.
29. **Place de marché de templates** d'affiches/e-mails que vous (ou des designers) vendez/ajoutez aux agences.
30. **Journal des consentements et export « droit d'accès »** en un clic (conformité vendue comme fonctionnalité).
31. **Mode hors-ligne partiel** (brouillons, fiche des visites du jour) pour les zones sans réseau (sous-sols, parkings).
32. **Impersonation support transparente** et **statut de service** public pour inspirer confiance aux agences clientes.
33. **Co-listing entre agences** (option future) : partager un bien en réseau entre agences avec répartition de commission — fort effet de réseau si vous avez plusieurs agences clientes.

---

## 7. Prochaines étapes proposées
1. Valider ce spec et répondre aux questions ouvertes (§5) — idéalement 30 min.
2. Phase 0 : initialiser le monorepo, Supabase local, i18n/RTL, tests d'isolation + les 4 spikes.
3. Produire les maquettes haute fidélité des 8 écrans (FR + HE) pour validation avant d'écrire l'UI.
4. Démarrer la Phase 1 avec Eliezer.immo comme tenant pilote.
