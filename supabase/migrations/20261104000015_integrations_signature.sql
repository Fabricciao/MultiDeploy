-- Connexions externes (secrets chiffrés côté serveur), canal WhatsApp API, preuves de signature de visite.
create table public.org_integrations (
  organization_id uuid not null references public.organizations on delete cascade,
  provider text not null check (provider in ('whatsapp','facebook','instagram')),
  config_enc text not null,                                   -- AES-256-GCM (clé serveur) : jamais lisible par l'API client
  public_meta jsonb not null default '{}' check (jsonb_typeof(public_meta) = 'object'),   -- non secret : identifiants d'affichage
  status text not null default 'connected' check (status in ('connected','error')),
  updated_at timestamptz not null default now(),
  primary key (organization_id, provider)
);
create table public.user_integrations (
  user_id uuid not null references public.profiles on delete cascade,
  provider text not null check (provider in ('google_calendar')),
  config_enc text not null, updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);
alter table public.org_integrations enable row level security; alter table public.user_integrations enable row level security;
-- aucune lecture directe des colonnes chiffrées par le client : vue de métadonnées uniquement
create view public.org_integrations_meta with (security_invoker = true) as select organization_id, provider, public_meta, status, updated_at from public.org_integrations;
create policy oi_select on public.org_integrations for select to authenticated using (organization_id = (select app.org_id()) and (select app.has_capability('org.manage')));
grant select (organization_id, provider, public_meta, status, updated_at) on public.org_integrations to authenticated;
grant select on public.org_integrations_meta to authenticated;
create policy ui_select on public.user_integrations for select to authenticated using (user_id = auth.uid());
grant select (user_id, provider, updated_at) on public.user_integrations to authenticated;
grant all on public.org_integrations, public.user_integrations to service_role;

alter table public.shares drop constraint shares_channel_check;
alter table public.shares add constraint shares_channel_check check (channel in ('email','whatsapp_link','whatsapp_api','link'));

alter table public.visits add column signer_name text, add column signed_ip_hash text, add column document_path text;
