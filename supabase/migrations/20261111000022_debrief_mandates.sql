-- 1) Compte rendu de visite : visits.feedback (déjà présente) = {rating 1-5, interest offer|yes|no, note, audio_path, at, by}.
alter table public.visits drop constraint if exists visits_feedback_is_object;
alter table public.visits add constraint visits_feedback_is_object check (feedback is null or jsonb_typeof(feedback) = 'object') not valid;

-- 2) Mandat d'exclusivité signé en ligne par le propriétaire (même principe que le bon de visite).
-- Le numéro d'identité et l'adresse du propriétaire ne sont pas stockés en base : ils figurent seulement dans le PDF signé.
create table if not exists public.property_mandates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  property_id uuid not null references public.properties on delete cascade,
  contact_id uuid references public.contacts on delete set null,
  agent_id uuid references public.profiles default auth.uid(),
  owner_name text not null check (length(owner_name) between 2 and 120),
  broker_license text check (broker_license is null or length(broker_license) <= 40),
  starts_on date not null,
  ends_on date not null check (ends_on > starts_on),
  price numeric check (price is null or price >= 0),
  currency text not null default 'ILS' check (currency in ('ILS','USD','EUR')),
  commission_pct numeric not null check (commission_pct >= 0 and commission_pct <= 20),
  actions text[] not null default '{}',
  status text not null default 'sent' check (status in ('sent','signed','cancelled')),
  signer_name text,
  signed_at timestamptz,
  signature_hash text,
  signed_ip_hash text,
  signature_path text,
  document_path text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index if not exists property_mandates_property on public.property_mandates (property_id, created_at desc);
alter table public.property_mandates enable row level security;
drop policy if exists pm_select on public.property_mandates;
create policy pm_select on public.property_mandates for select to authenticated
  using (organization_id = (select app.org_id()) and exists (select 1 from public.properties p where p.id = property_id));
drop policy if exists pm_insert on public.property_mandates;
create policy pm_insert on public.property_mandates for insert to authenticated
  with check (organization_id = (select app.org_id()) and (select app.has_capability('properties.write')) and exists (select 1 from public.properties p where p.id = property_id));
-- Côté agence, on ne peut qu'annuler un mandat non signé ; la signature passe par le serveur (jeton).
drop policy if exists pm_update on public.property_mandates;
create policy pm_update on public.property_mandates for update to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('properties.write')) and status = 'sent')
  with check (organization_id = (select app.org_id()) and status in ('sent','cancelled') and signed_at is null);
grant select, insert, update on public.property_mandates to authenticated;
grant all on public.property_mandates to service_role;
