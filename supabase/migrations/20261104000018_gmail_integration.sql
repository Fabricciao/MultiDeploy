-- Connexion Gmail par utilisateur (envoi des sélections de biens depuis sa propre adresse).
alter table public.user_integrations drop constraint user_integrations_provider_check;
alter table public.user_integrations add constraint user_integrations_provider_check check (provider in ('google_calendar', 'gmail'));
