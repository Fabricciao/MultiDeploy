-- Foundation : extensions, schéma applicatif, helpers, tenancy.
-- Hypothèse Supabase : schémas auth/extensions, rôles anon/authenticated/service_role existent.

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists app;
grant usage on schema app to anon, authenticated, service_role;

-- ---------- helpers génériques ----------
create or replace function app.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- Normalisation de recherche : minuscules, sans accents, sans niqqud hébreux (U+0591–U+05C7).
create or replace function app.normalize_search(t text) returns text
language sql stable set search_path = extensions, public as $$
  select lower(extensions.unaccent(regexp_replace(coalesce(t,''), '[֑-ׇ]', '', 'g')))
$$;

-- ---------- types ----------
create type public.member_role as enum ('owner','admin','agent','assistant','viewer');

-- ---------- organisations ----------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,30})[a-z0-9]$'),
  name_fr text, name_he text, name_en text,
  default_locale text not null default 'fr' check (default_locale in ('fr','he','en')),
  default_currency text not null default 'ILS' check (default_currency in ('ILS','USD','EUR')),
  timezone text not null default 'Asia/Jerusalem',
  plan text not null default 'trial',
  status text not null default 'active' check (status in ('active','suspended','archived')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger organizations_updated before update on public.organizations
  for each row execute function app.set_updated_at();

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text, avatar_url text, phone text,
  preferred_locale text not null default 'fr' check (preferred_locale in ('fr','he','en')),
  active_organization_id uuid references public.organizations on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function app.set_updated_at();

create function app.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function app.handle_new_user();

create table public.memberships (
  organization_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  role public.member_role not null,
  status text not null default 'active' check (status in ('active','invited','disabled')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id) where status = 'active';

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  email text not null,
  role public.member_role not null check (role <> 'owner'),
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_by uuid references public.profiles,
  created_at timestamptz not null default now()
);

create table public.platform_admins (user_id uuid primary key references public.profiles on delete cascade);

-- Capacités : lignes globales (organization_id null) + surcharges par agence.
create table public.role_capabilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations on delete cascade,
  role public.member_role not null,
  capability text not null,
  granted boolean not null default true
);
create unique index role_capabilities_uq on public.role_capabilities
  (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), role, capability);

-- ---------- fonctions d'autorisation ----------
-- L'organisation active vient du claim JWT `org_id`, MAIS elle n'est valable que si
-- l'appartenance est active en base : retirer un membre coupe l'accès immédiatement,
-- sans attendre l'expiration du token.
create or replace function app.org_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.organization_id
  from public.memberships m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = auth.uid()
    and m.status = 'active'
    and o.status = 'active'
    and m.organization_id = nullif(auth.jwt() ->> 'org_id','')::uuid
$$;

create or replace function app.role() returns public.member_role
language sql stable security definer set search_path = '' as $$
  select m.role from public.memberships m
  where m.user_id = auth.uid() and m.status = 'active'
    and m.organization_id = nullif(auth.jwt() ->> 'org_id','')::uuid
$$;

create or replace function app.has_capability(cap text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select rc.granted from public.role_capabilities rc
    where rc.role = app.role() and rc.capability = cap
      and (rc.organization_id = app.org_id() or rc.organization_id is null)
    order by rc.organization_id nulls last
    limit 1
  ), false)
$$;

create or replace function app.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$$;

grant execute on function app.org_id(), app.role(), app.has_capability(text), app.is_platform_admin()
  to authenticated, service_role;

-- ---------- hook Supabase Auth : claim org_id ----------
-- À activer dans Auth > Hooks > Customize Access Token. Choisit l'agence active du profil,
-- sinon la première appartenance active.
create or replace function public.custom_access_token_hook(event jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := (event->>'user_id')::uuid;
  org uuid;
  claims jsonb := event->'claims';
begin
  select coalesce(
    (select p.active_organization_id from public.profiles p
       join public.memberships m on m.organization_id = p.active_organization_id and m.user_id = p.id and m.status='active'
      where p.id = uid),
    (select m.organization_id from public.memberships m where m.user_id = uid and m.status='active'
      order by m.created_at limit 1)
  ) into org;
  if org is not null then
    claims := jsonb_set(claims, '{org_id}', to_jsonb(org::text));
  end if;
  return jsonb_set(event, '{claims}', claims);
end $$;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- Changement d'agence active (le client rafraîchit ensuite sa session).
create or replace function public.switch_organization(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.memberships where user_id = auth.uid() and organization_id = target and status='active') then
    raise exception 'not a member' using errcode = '42501';
  end if;
  update public.profiles set active_organization_id = target where id = auth.uid();
end $$;
revoke execute on function public.switch_organization(uuid) from public, anon;
grant execute on function public.switch_organization(uuid) to authenticated;

-- ---------- brand kit ----------
create table public.brand_kits (
  organization_id uuid primary key references public.organizations on delete cascade,
  source_url text,
  logo_light_path text, logo_dark_path text, logo_mark_path text,
  colors jsonb not null default '{"primary":"#1f4fd8","accent":"#0e8f6e"}',
  fonts jsonb not null default '{"latin":"Inter","hebrew":"Heebo"}',
  style jsonb not null default '{"radius":6,"density":"standard"}',
  legal_footer jsonb,
  contact_block jsonb,
  version int not null default 1,
  updated_at timestamptz not null default now()
);
create trigger brand_kits_updated before update on public.brand_kits
  for each row execute function app.set_updated_at();

-- ---------- audit ----------
create table public.audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid,
  actor_id uuid,
  action text not null,
  entity text, entity_id uuid,
  diff jsonb,
  at timestamptz not null default now()
);
create index audit_log_org_at on public.audit_log (organization_id, at desc);

create or replace function app.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare rec record := coalesce(new, old);
begin
  insert into public.audit_log (organization_id, actor_id, action, entity, entity_id, diff)
  values (rec.organization_id, auth.uid(), tg_op, tg_table_name, rec.id,
    case tg_op when 'INSERT' then to_jsonb(new) when 'DELETE' then to_jsonb(old)
      else jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)) end);
  return rec;
end $$;

-- Compteurs (références de biens par agence)
create table public.org_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  name text not null,
  value bigint not null default 0,
  primary key (organization_id, name)
);
create function app.next_counter(org uuid, counter text) returns bigint
language sql security definer set search_path = '' as $$
  insert into public.org_counters as c (organization_id, name, value) values (org, counter, 1)
  on conflict (organization_id, name) do update set value = c.value + 1
  returning value
$$;
