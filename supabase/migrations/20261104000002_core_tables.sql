-- Tables métier de la phase 0 (contacts, biens, médias, activités) + référentiels.
-- Toute table métier : organization_id NOT NULL + RLS.

create table public.geo_places (                 -- référentiel global (lecture seule pour les agences)
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.geo_places,
  kind text not null check (kind in ('city','neighborhood')),
  name_fr text, name_he text, name_en text,
  aliases text[] not null default '{}',
  lat double precision, lng double precision    -- PostGIS arrivera en phase 1 (geography)
);
create index geo_places_parent on public.geo_places (parent_id);

create table public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  name jsonb not null,                           -- {fr,he,en}
  position int not null default 0
);

-- ---------- contacts ----------
create type public.contact_kind as enum ('buyer','seller','landlord','tenant','investor','lawyer','partner','other');

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  kinds public.contact_kind[] not null default '{buyer}',
  first_name text, last_name text, first_name_he text, last_name_he text, company text,
  phones jsonb not null default '[]',            -- [{e164,label,is_whatsapp}]
  emails jsonb not null default '[]',
  phone_primary_e164 text generated always as (phones -> 0 ->> 'e164') stored,
  preferred_locale text not null default 'fr' check (preferred_locale in ('fr','he','en')),
  country_of_residence text,
  aliyah_status text check (aliyah_status in ('pre_aliyah','recent','resident','none')),
  source_id uuid references public.lead_sources,
  status text not null default 'active',
  owner_id uuid references public.profiles default auth.uid(),
  budget_min numeric, budget_max numeric, budget_currency text,
  tags text[] not null default '{}',
  custom jsonb not null default '{}',
  marketing_consent jsonb,
  do_not_contact boolean not null default false,
  notes text,
  search_text text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index contacts_org_owner on public.contacts (organization_id, owner_id, status);
create index contacts_search on public.contacts using gin (search_text extensions.gin_trgm_ops);
create unique index contacts_phone_uq on public.contacts (organization_id, phone_primary_e164)
  where phone_primary_e164 is not null and deleted_at is null;

create function app.contacts_search_text() returns trigger language plpgsql as $$
begin
  new.search_text := app.normalize_search(concat_ws(' ', new.first_name, new.last_name,
    new.first_name_he, new.last_name_he, new.company, new.phone_primary_e164,
    new.phones::text, new.emails::text, new.notes));
  return new;
end $$;
create trigger contacts_search_bi before insert or update on public.contacts
  for each row execute function app.contacts_search_text();
create trigger contacts_updated before update on public.contacts
  for each row execute function app.set_updated_at();

create table public.contact_shares (             -- partage d'un contact avec d'autres agents
  contact_id uuid not null references public.contacts on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  organization_id uuid not null references public.organizations on delete cascade,
  primary key (contact_id, user_id)
);

-- ---------- biens ----------
create type public.transaction_type as enum ('sale','rent','commercial_sale','commercial_rent');
create type public.property_status as enum ('draft','active','under_offer','sold','rented','withdrawn','expired');

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  reference text not null,
  transaction public.transaction_type not null,
  property_type text not null,
  status public.property_status not null default 'draft',
  agent_id uuid references public.profiles default auth.uid(),
  city_id uuid references public.geo_places, neighborhood_id uuid references public.geo_places,
  street text, house_number text, apartment_number text,
  address_visibility text not null default 'street' check (address_visibility in ('hidden','neighborhood','street','exact')),
  lat double precision, lng double precision,
  price numeric, currency text not null default 'ILS' check (currency in ('ILS','USD','EUR')),
  rooms numeric(3,1) check (rooms is null or (rooms >= 0.5 and (rooms * 2) = floor(rooms * 2))),
  bedrooms int, bathrooms int,
  area_built numeric, area_garden numeric, area_balcony numeric,
  floor int, floors_total int, year_built int,
  mamad boolean, sukkah_balcony boolean, elevator boolean, parking_count int,
  storage boolean, ac boolean, accessible boolean, furnished text, condition text, tama38 boolean,
  arnona_monthly numeric, vaad_bayit_monthly numeric,
  registration_type text check (registration_type in ('tabu','minhal','company','other')),
  entry_date date, entry_flexible boolean,
  mandate jsonb,
  features text[] not null default '{}',
  custom jsonb not null default '{}',
  internal_notes text,
  published_at timestamptz,
  public_token text unique,
  search_text text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (organization_id, reference)
);
create index properties_filter on public.properties (organization_id, status, transaction, city_id, price);
create index properties_search on public.properties using gin (search_text extensions.gin_trgm_ops);

create function app.properties_before() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and (new.reference is null or new.reference = '') then
    new.reference := 'P-' || to_char(now(), 'YYYY') || '-' || lpad(app.next_counter(new.organization_id, 'property')::text, 4, '0');
  end if;
  new.search_text := app.normalize_search(concat_ws(' ', new.reference, new.street, new.property_type, new.internal_notes));
  return new;
end $$;
-- reference NOT NULL : on autorise l'insertion sans référence via un défaut vide remplacé par le trigger
alter table public.properties alter column reference set default '';
create trigger properties_bi before insert or update on public.properties
  for each row execute function app.properties_before();
create trigger properties_updated before update on public.properties
  for each row execute function app.set_updated_at();

create table public.property_translations (
  property_id uuid not null references public.properties on delete cascade,
  organization_id uuid not null references public.organizations on delete cascade,
  locale text not null check (locale in ('fr','he','en')),
  title text, description text,
  origin text not null default 'manual' check (origin in ('manual','ai')),
  reviewed boolean not null default false,
  primary key (property_id, locale)
);

create table public.property_media (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  property_id uuid not null references public.properties on delete cascade,
  kind text not null check (kind in ('photo','video','plan','doc','tour360')),
  storage_path text not null,
  width int, height int, position int not null default 0,
  is_cover boolean not null default false,
  visibility text not null default 'public' check (visibility in ('public','internal')),
  caption jsonb
);
create index property_media_prop on public.property_media (property_id, position);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  kind text not null,
  contact_id uuid references public.contacts on delete cascade,
  property_id uuid references public.properties on delete cascade,
  actor_id uuid default auth.uid(),
  occurred_at timestamptz not null default now(),
  summary text, payload jsonb
);
create index activities_contact on public.activities (organization_id, contact_id, occurred_at desc);

create table public.ai_usage (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations on delete cascade,
  user_id uuid, kind text not null, provider text, model text,
  units jsonb, cost_usd numeric, credits numeric,
  created_at timestamptz not null default now()
);
create index ai_usage_org on public.ai_usage (organization_id, created_at desc);

-- audit des entités sensibles
create trigger contacts_audit after insert or update or delete on public.contacts
  for each row execute function app.audit();
create trigger properties_audit after insert or update or delete on public.properties
  for each row execute function app.audit();
