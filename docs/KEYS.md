# Clés et comptes à fournir

Tout est configurable par variables d'environnement ; rien d'externe n'est requis pour développer. **Ne jamais** committer de valeur réelle.

| # | Service | À créer / fournir | Variables | Obligatoire ? |
|---|---|---|---|---|
| 1 | **Supabase** (Pro conseillé : sauvegardes, PITR) | Projet (région UE/proche d'Israël), URL, clés anon + service, chaîne de connexion « pooler », activer l'hook JWT `custom_access_token` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` | Oui |
| 2 | **Google Cloud** | Client OAuth « Web » (connexion Google) + (option) Calendar API : même client ou second client | `GOOGLE_OAUTH_CLIENT_ID/SECRET` (agenda) ; la connexion Google se règle dans Supabase Auth | Connexion : oui ; agenda : non |
| 3 | **Vercel** | Projet lié au dépôt, domaine racine + **wildcard** `*.domaine` (sous-domaines d'agence) | `NEXT_PUBLIC_SITE_URL`, `APP_DOMAINS` | Oui |
| 4 | **Secrets applicatifs** (je les génère, vous les stockez) | `openssl rand -base64 32` ×3 | `APP_SECRET`, `INTEGRATIONS_KEY`, `CRON_SECRET` | Oui |
| 5 | **Resend** | Compte, domaine d'envoi vérifié (SPF/DKIM/DMARC), clé API | `RESEND_API_KEY`, `EMAIL_FROM` | Oui (sinon e-mails en dry-run) |
| 6 | **Hébergeur de conteneurs** (Fly.io / Railway / Cloud Run) | Déployer `apps/renderer` (Chromium) ; choisir un jeton ≥ 24 car. | `POSTER_RENDER_URL`, `POSTER_RENDER_TOKEN` (web) + `RENDER_TOKEN` (renderer) | Oui sur Vercel (affiches, PDF) |
| 7 | **Anthropic** | Clé API ; nom du modèle | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_VISION_MODEL` | Non (extraction par règles sinon) |
| 8 | **OpenAI** | Clé API + **noms exacts** des modèles de transcription et d'image | `OPENAI_API_KEY`, `OPENAI_STT_MODEL`, `OPENAI_IMAGE_MODEL` | Non (voix / affiches « amélioré » et « créatif » désactivées) |
| 9 | **Stripe** | Compte, produits/prix des plans (starter/pro/agency_plus), webhook vers `/api/webhooks/stripe` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` + prix à saisir en base (`plans`) | Quand vous vendez |
| 10 | **Meta** (WhatsApp Cloud API, Facebook, Instagram) | App Meta, vérification d'entreprise, numéro WhatsApp Business, modèles de messages approuvés, webhook vers `/api/webhooks/whatsapp` | `META_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` ; jetons **par agence** dans Réglages → Connexions | Non |
| 11 | **Domaine** | DNS (Vercel), enregistrements e-mail | — | Oui |

Prix des plans, noms de modèles IA et textes juridiques ne sont **pas** présumés : à me communiquer.
