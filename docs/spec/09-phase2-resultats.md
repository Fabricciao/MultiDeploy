# 09 — Phase 2 : IA & marketing (résultats)

## Livré et vérifié
| Domaine | Contenu | Preuve |
|---|---|---|
| **Photos** | Upload multi-fichiers, validation du **contenu réel** (pas l'extension), **EXIF/GPS supprimés**, redimension + vignette, couverture, suppression, 25 max ; fichiers privés par agence (`/api/files`, clé dans le préfixe de l'agence, anti path-traversal), photos publiques par jeton | 5 tests unitaires + E2E |
| **Stockage** | Interface `Storage` : disque local (dev) / Supabase Storage (prod) | tests de clés ; driver Supabase **non testé** |
| **Charte graphique** | Import depuis l'URL du site (theme-color, variables CSS, couleurs fréquentes, polices Google, logo) **sans IA**, chaque couleur justifiée ; éditeur + aperçu en direct ; contraste AA garanti (couleur d'interface ajustée si besoin) ; versionnage automatique ; thème appliqué à toute l'interface | 7 + 24 tests unitaires, E2E |
| **Protection SSRF** | DNS vérifié à chaque redirection, IP privées / link-local / métadonnées cloud bloquées, ports limités, taille/délai/type plafonnés, URL à identifiants refusées | 24 tests, dont redirection vers 169.254.169.254 |
| **Affiches** | 5 formats (1:1, 4:5, 9:16, Facebook, A4) × 3 mises en page × FR/HE/EN ; texte, prix, logo, QR et **mention légale posés par le code** (jamais par un modèle d'image) ; rendu Chromium (JS coupé, réseau bloqué) ; **refus sans mention légale** ; historique ; QR → page publique du bien | 15 tests de rendu + E2E (PNG aux dimensions exactes) |
| **Crédits IA** | Grand livre append-only, débit atomique avec verrou, refus si solde insuffisant, **remboursement si le rendu échoue**, 50 crédits d'essai | 11 assertions SQL |
| **Saisie assistée** | Texte collé → champs extraits (FR/HE/EN, nombres en lettres « quatre millions », « שני מיליון ומאתיים אלף », « trois pièces et demie », villes avec préfixe hébreu) ; écran de revue : requis manquant signalé, champs incertains « à vérifier » avec l'extrait source ; rien n'est enregistré avant validation | 29 + 5 tests unitaires, E2E |
| **Enregistreur** | MediaRecorder (niveau sonore, 3 min max), relecture, envoi | E2E avec micro factice |

**Totaux** : 80 assertions SQL, 150 tests unitaires, 61 vérifications E2E (28 + 33).

## Non testé (nécessite vos clés — voir la liste en fin de projet)
- **Transcription vocale (STT)**, **extraction LLM**, **lecture de manuscrit (vision)**, **retouche d'image** : adaptateurs écrits d'après les API publiques (`lib/ai/providers.ts`) mais **jamais exécutés**. Sans clé, la saisie vocale/photo répond proprement « non configuré » et la saisie par texte fonctionne via l'extracteur à règles. Les niveaux d'affiche « amélioré/créatif » sont désactivés tant qu'aucun fournisseur d'images n'est configuré.
- Le choix des modèles est **configuré par variables d'environnement** (aucun nom de modèle d'image/STT n'est présumé).
- Qualité réelle de la dictée (bruit, accents, hébreu manuscrit) : à mesurer avec vos échantillons (jeu d'évaluation à construire).

## Écarts / décisions
- L'extracteur à règles est un **filet de sécurité utile** (dev, tests, panne du fournisseur), pas un remplaçant du LLM pour le texte libre complexe.
- Pas d'affiche sans mention légale d'agence : choix volontaire (exigence légale à valider par votre conseil).
- Le rendu d'affiches exige un Chromium : **incompatible avec les fonctions serverless Vercel standard** → service de rendu dédié (conteneur) en production (voir plan de déploiement).
