# CRM Immobilier Multi-Agences (FR / HE / EN) — SPEC v0.1

> Nom de code : **MultiDeploy**. Premier client / tenant pilote : **Eliezer.immo**.
> Objectif double : (1) outil interne ultra efficace pour Eliezer.immo, (2) produit SaaS revendable à d'autres agences en Israël (francophones et hébréophones) avec isolation stricte des données.

## Sommaire

| Fichier | Contenu |
|---|---|
| [01-produit.md](01-produit.md) | Personas, modules, fonctionnalités détaillées, rôles & permissions, parcours clés |
| [02-architecture.md](02-architecture.md) | Stack, comparatif Supabase vs PocketBase, multi-tenant, sécurité, CI/CD, environnements |
| [03-donnees.md](03-donnees.md) | Modèle de données (SQL), RLS, index, recherche |
| [04-ia.md](04-ia.md) | Saisie vocale, saisie par photo, matching, génération d'affiches, charte graphique auto |
| [05-design-i18n.md](05-design-i18n.md) | Design system, UX, anti « AI slop », FR/HE/EN + RTL |
| [06-roadmap-couts-idees.md](06-roadmap-couts-idees.md) | Phasage, coûts, risques, questions ouvertes, **fonctionnalités bonus** |

## Résumé exécutif

**Décisions structurantes (à valider)**

1. **Multi-tenant dès le premier commit** (`organization_id` partout + Row Level Security Postgres). Rétrofiter l'isolation plus tard est la façon la plus sûre de rater une vente SaaS.
2. **Stack : Next.js (App Router, TypeScript) + Supabase (Postgres, Auth, Storage, Realtime) + Vercel.** PocketBase est écarté pour le produit revendable (voir `02-architecture.md` §2) mais reste valable si vous restiez mono-agence.
3. **i18n FR/HE/EN avec RTL natif** : CSS en propriétés logiques, polices hébraïques dédiées, contenu des biens traduisible par champ (traduction IA + relecture agent).
4. **IA derrière des interfaces de fournisseur interchangeables** (STT, extraction structurée, vision, génération d'images). Aucun lock-in, coût par tenant mesuré (crédits IA).
5. **Affiches = rendu déterministe + IA en renfort.** Les modèles d'image écrivent mal le texte (et encore moins l'hébreu). Prix, surface, logo, coordonnées sont composés par un moteur de templates ; l'IA génère/améliore fonds, ambiance, mise en scène.
6. **Aucune IA n'écrit en base sans validation humaine** : voix/photo → écran de revue avec champs surlignés selon la confiance → « Enregistrer ».
7. **Design sobre, dense, rapide** : tables et formulaires excellents, palette restreinte pilotée par tokens (thème par agence), zéro gadget décoratif.

**Précision sur « GPT-2 »** : GPT-2 (2019) est un modèle de texte, pas de génération d'images. Je suppose que vous parlez du **modèle d'image GPT d'OpenAI de dernière génération** (famille `gpt-image-*`). Le spec prévoit une interface `ImageProvider` ; le fournisseur exact se règle par configuration. **À confirmer.**

**Budget récurrent réaliste en production** : environ **45–50 $/mois** (Vercel Pro + Supabase Pro) + consommation IA à l'usage. Le développement et le pilote tiennent dans les offres gratuites. Détails et alerte « Vercel Hobby = usage non commercial » dans `06-roadmap-couts-idees.md`.

## Principes directeurs

- **Vitesse perçue** : toute action courante < 200 ms perçus (optimistic UI), navigation sans rechargement, listes virtualisées.
- **Mobile-first pour les agents terrain** (PWA installable) ; desktop dense pour le back-office.
- **Saisir moins, comprendre plus** : dictée, photo, import, auto-complétion, détection de doublons.
- **Isolation prouvée, pas supposée** : tests automatisés d'isolation entre tenants à chaque CI.
- **Configurable sans code** : étapes de pipeline, champs personnalisés, templates d'e-mails, charte — par agence.
- **Conformité locale intégrée** : consentement marketing, journal d'audit, export/suppression des données, mentions légales sur les supports.

## Glossaire

- **Tenant / Agence / Organisation** : un client SaaS (une agence). Équivalent technique : `organizations`.
- **Membre** : utilisateur rattaché à une organisation avec un rôle.
- **Bien / Listing** : un bien immobilier à vendre/louer.
- **Contact / Client** : acheteur, vendeur, bailleur, locataire, investisseur, partenaire.
- **Brand kit** : charte graphique d'une agence (logo, couleurs, polices, ton, mentions légales).
