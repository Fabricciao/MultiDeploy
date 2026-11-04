-- Phase 3/4 : plans & quotas, équipe (invitations, dernier owner, sièges), facturation, domaines, impersonation tracée,
-- API publique (clés), webhooks (outbox), signatures de visite, export/purge d'agence, rétention.

-- ───────── plans ─────────
create table public.plans (
  key text primary key,
  name jsonb not null,
  seats int not null, storage_mb int not null, ai_credits_monthly int not null default 0,
  features jsonb not null default '{}' check (jsonb_typeof(features) = 'object'),
  price_monthly_ils numeric,                    -- à fixer par le propriétaire de la plateforme (NULL = « sur devis »)
  position int not null default 0
);
insert into public.plans (key, name, seats, storage_mb, ai_credits_monthly, features, position) values
 ('trial',      '{"fr":"Essai","he":"ניסיון","en":"Trial"}',                 3,   500,   0, '{"custom_domain":false,"white_label":false,"whatsapp_api":false,"api":false,"creative_posters":false}', 0),
 ('starter',    '{"fr":"Starter","he":"סטארטר","en":"Starter"}',             5,  2000,  40, '{"custom_domain":false,"white_label":false,"whatsapp_api":false,"api":false,"creative_posters":false}', 1),
 ('pro',        '{"fr":"Pro","he":"פרו","en":"Pro"}',                       10, 10000, 150, '{"custom_domain":false,"white_label":false,"whatsapp_api":true,"api":true,"creative_posters":true}', 2),
 ('agency_plus','{"fr":"Agence+","he":"סוכנות+","en":"Agency+"}',           25, 50000, 400, '{"custom_domain":true,"white_label":true,"whatsapp_api":true,"api":true,"creative_posters":true}', 3);
alter table public.organizations add constraint organizations_plan_fk foreign key (plan) references public.plans (key);
alter table public.plans enable row level security;
create policy plans_select on public.plans for select to authenticated using (true);
grant select on public.plans to authenticated; grant all on public.plans to service_role;

create function app.org_feature(org uuid, feature text) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((coalesce((o.settings->'features'->>feature)::boolean, (p.features->>feature)::boolean)), false)
  from public.organizations o join public.plans p on p.key = o.plan where o.id = org
$$;
create function app.org_limit(org uuid, what text) returns int language sql stable security definer set search_path = '' as $$
  select case what when 'seats' then coalesce((o.settings->>'seats_override')::int, p.seats) when 'storage_mb' then coalesce((o.settings->>'storage_override')::int, p.storage_mb) end
  from public.organizations o join public.plans p on p.key = o.plan where o.id = org
$$;

-- ───────── équipe : dernier owner, sièges ─────────
create function app.guard_memberships() returns trigger language plpgsql security definer set search_path = '' as $$
declare lim int; cnt int;
begin
  if tg_op in ('UPDATE','DELETE') and old.role = 'owner' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'owner' or new.status <> 'active')
     and exists (select 1 from public.organizations where id = old.organization_id)
     and not exists (select 1 from public.memberships m where m.organization_id = old.organization_id and m.role = 'owner' and m.status = 'active' and m.user_id <> old.user_id) then
    raise exception 'last_owner' using errcode = 'P0001';
  end if;
  if tg_op in ('INSERT','UPDATE') and new.status = 'active' and (tg_op = 'INSERT' or old.status <> 'active') then
    lim := app.org_limit(new.organization_id, 'seats');
    select count(*) into cnt from public.memberships where organization_id = new.organization_id and status = 'active';
    if cnt >= lim then raise exception 'seat_limit' using errcode = 'P0001'; end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger memberships_guard before insert or update or delete on public.memberships for each row execute function app.guard_memberships();

-- Les propriétaires ne s'invitent que par la plateforme (service_role) ; un tenant ne peut inviter que des rôles non-owner.
alter table public.invitations drop constraint if exists invitations_role_check;
drop policy if exists invitations_all on public.invitations;
create policy invitations_select on public.invitations for select to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('members.manage')));
create policy invitations_insert on public.invitations for insert to authenticated
  with check (organization_id = (select app.org_id()) and (select app.has_capability('members.manage')) and role <> 'owner' and created_by = auth.uid());
create policy invitations_delete on public.invitations for delete to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('members.manage')));

create function public.accept_invitation(p_token text) returns uuid language plpgsql security definer set search_path = '' as $$
declare inv public.invitations; mail text;
begin
  select email into mail from auth.users where id = auth.uid();
  select * into inv from public.invitations where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and accepted_at is null and expires_at > now();
  if inv.id is null then raise exception 'invalid_invitation' using errcode = 'P0001'; end if;
  if lower(inv.email) <> lower(coalesce(mail, '')) then raise exception 'wrong_account' using errcode = '42501'; end if;
  insert into public.memberships (organization_id, user_id, role, status) values (inv.organization_id, auth.uid(), inv.role, 'active')
    on conflict (organization_id, user_id) do update set role = excluded.role, status = 'active';
  update public.invitations set accepted_at = now() where id = inv.id;
  update public.profiles set active_organization_id = inv.organization_id where id = auth.uid();
  return inv.organization_id;
end $$;
revoke execute on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;

-- ───────── facturation ─────────
create table public.subscriptions (
  organization_id uuid primary key references public.organizations on delete cascade,
  provider text not null default 'manual' check (provider in ('manual','stripe')),
  customer_id text, subscription_id text,
  plan text not null references public.plans (key),
  status text not null default 'active' check (status in ('trialing','active','past_due','canceled','paused')),
  current_period_end timestamptz, cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.billing_events (id text primary key, type text not null, payload jsonb not null, received_at timestamptz not null default now());
alter table public.subscriptions enable row level security; alter table public.billing_events enable row level security;
create policy subs_select on public.subscriptions for select to authenticated using (organization_id = (select app.org_id()) and (select app.has_capability('billing.manage')));
grant select on public.subscriptions to authenticated; grant all on public.subscriptions, public.billing_events to service_role;
insert into public.subscriptions (organization_id, plan, status) select id, plan, 'trialing' from public.organizations;
create function app.new_org_subscription() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.subscriptions (organization_id, plan, status) values (new.id, new.plan, 'trialing') on conflict do nothing; return new; end $$;
create trigger organizations_subscription after insert on public.organizations for each row execute function app.new_org_subscription();

-- ───────── domaines ─────────
create table public.org_domains (
  domain text primary key check (domain = lower(domain) and domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  organization_id uuid not null references public.organizations on delete cascade,
  kind text not null check (kind in ('subdomain','custom')),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.org_domains enable row level security;
create policy domains_select on public.org_domains for select to authenticated using (organization_id = (select app.org_id()) and (select app.has_capability('org.manage')));
grant select on public.org_domains to authenticated; grant all on public.org_domains to service_role;

-- ───────── plateforme : audit + impersonation ─────────
create table public.platform_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null, action text not null, organization_id uuid, details jsonb, at timestamptz not null default now()
);
alter table public.platform_audit_log enable row level security;  -- aucune policy : service_role uniquement
grant all on public.platform_audit_log to service_role;

-- org_id()/role() : un administrateur de plateforme avec le claim `imp` peut LIRE une agence (rôle « viewer ») ;
-- les écritures sont interdites par la transaction en lecture seule imposée côté serveur + le rôle viewer.
create or replace function app.org_id() returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select m.organization_id from public.memberships m join public.organizations o on o.id = m.organization_id
      where m.user_id = auth.uid() and m.status = 'active' and o.status = 'active' and m.organization_id = nullif(auth.jwt() ->> 'org_id','')::uuid),
    (select o.id from public.organizations o where auth.jwt() ->> 'imp' = '1' and o.id = nullif(auth.jwt() ->> 'org_id','')::uuid
        and exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())))
$$;
create or replace function app.role() returns public.member_role language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select m.role from public.memberships m where m.user_id = auth.uid() and m.status = 'active' and m.organization_id = nullif(auth.jwt() ->> 'org_id','')::uuid),
    (select 'viewer'::public.member_role where auth.jwt() ->> 'imp' = '1' and exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())))
$$;

-- ───────── API publique & webhooks ─────────
insert into public.role_capabilities (organization_id, role, capability)
select null, x.role::public.member_role, 'api.manage' from (values ('owner'),('admin')) as x(role);
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  name text not null, key_prefix text not null, key_hash text not null unique,
  scopes text[] not null default '{properties:read,leads:write}',
  last_used_at timestamptz, revoked_at timestamptz,
  created_by uuid default auth.uid(), created_at timestamptz not null default now()
);
create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  url text not null check (url ~ '^https://'), secret text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  events text[] not null default '{property.created,contact.created,deal.stage_changed}', active boolean not null default true,
  created_by uuid default auth.uid(), created_at timestamptz not null default now()
);
create table public.outbox_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null, type text not null, payload jsonb not null, created_at timestamptz not null default now()
);
create table public.webhook_deliveries (
  id bigint generated always as identity primary key,
  endpoint_id uuid not null references public.webhook_endpoints on delete cascade, event_id bigint not null references public.outbox_events on delete cascade,
  status text not null default 'pending' check (status in ('pending','delivered','failed')), attempts int not null default 0,
  next_attempt_at timestamptz not null default now(), last_error text, response_code int, delivered_at timestamptz
);
create index webhook_deliveries_due on public.webhook_deliveries (next_attempt_at) where status = 'pending';
do $$ declare t text; begin for t in select unnest(array['api_keys','webhook_endpoints','outbox_events','webhook_deliveries']) loop execute format('alter table public.%I enable row level security', t); end loop; end $$;
create policy apikeys_select on public.api_keys for select to authenticated using (organization_id = (select app.org_id()) and (select app.has_capability('api.manage')));
create policy apikeys_write on public.api_keys for all to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('api.manage')))
  with check (organization_id = (select app.org_id()) and (select app.has_capability('api.manage')));
create policy webhooks_select on public.webhook_endpoints for select to authenticated using (organization_id = (select app.org_id()) and (select app.has_capability('api.manage')));
create policy webhooks_write on public.webhook_endpoints for all to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('api.manage')))
  with check (organization_id = (select app.org_id()) and (select app.has_capability('api.manage')));
grant select, insert, update, delete on public.api_keys, public.webhook_endpoints to authenticated;
grant all on public.api_keys, public.webhook_endpoints, public.outbox_events, public.webhook_deliveries to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

create function app.emit_event() returns trigger language plpgsql security definer set search_path = '' as $$
declare typ text; payload jsonb; org uuid;
begin
  org := new.organization_id;
  if tg_table_name = 'properties' and tg_op = 'INSERT' then typ := 'property.created'; payload := jsonb_build_object('id', new.id, 'reference', new.reference, 'status', new.status);
  elsif tg_table_name = 'contacts' and tg_op = 'INSERT' then typ := 'contact.created'; payload := jsonb_build_object('id', new.id);
  elsif tg_table_name = 'deals' and tg_op = 'UPDATE' and old.stage_id is distinct from new.stage_id then typ := 'deal.stage_changed'; payload := jsonb_build_object('id', new.id, 'from', old.stage_id, 'to', new.stage_id);
  else return new; end if;
  insert into public.outbox_events (organization_id, type, payload) values (org, typ, payload);
  insert into public.webhook_deliveries (endpoint_id, event_id)
    select e.id, currval(pg_get_serial_sequence('public.outbox_events','id')) from public.webhook_endpoints e where e.organization_id = org and e.active and typ = any(e.events);
  return new;
end $$;
create trigger properties_emit after insert on public.properties for each row execute function app.emit_event();
create trigger contacts_emit after insert on public.contacts for each row execute function app.emit_event();
create trigger deals_emit after update on public.deals for each row execute function app.emit_event();

-- ───────── visites : signature ─────────
alter table public.visits add column signature_path text, add column signed_at timestamptz, add column signature_hash text;
alter table public.property_media add column bytes int;

-- ───────── rétention, crédits mensuels, purge d'agence (service uniquement) ─────────
create unique index ai_ledger_monthly_once on public.ai_credit_ledger (organization_id, ref) where reason = 'monthly_grant';
create function public.grant_monthly_credits() returns int language plpgsql security definer set search_path = '' as $$
declare n int := 0; r record;
begin
  for r in select o.id, p.ai_credits_monthly c from public.organizations o join public.plans p on p.key = o.plan where o.status = 'active' and p.ai_credits_monthly > 0 loop
    insert into public.ai_credit_ledger (organization_id, delta, reason, ref) values (r.id, r.c, 'monthly_grant', to_char(now(), 'YYYY-MM')) on conflict do nothing;
    if found then n := n + 1; end if;
  end loop;
  return n;
end $$;
create function public.purge_trash() returns int language plpgsql security definer set search_path = '' as $$
declare n int := 0; k int;
begin
  delete from public.deals where deleted_at < now() - interval '30 days'; get diagnostics k = row_count; n := n + k;
  delete from public.contacts where deleted_at < now() - interval '30 days'; get diagnostics k = row_count; n := n + k;
  delete from public.properties where deleted_at < now() - interval '30 days'; get diagnostics k = row_count; n := n + k;
  return n;
end $$;
create function public.purge_organization(p_org uuid, p_admin uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.platform_audit_log (admin_id, action, organization_id, details) select p_admin, 'purge_organization', p_org, jsonb_build_object('slug', slug) from public.organizations where id = p_org;
  delete from public.organizations where id = p_org;
end $$;
revoke execute on function public.grant_monthly_credits(), public.purge_trash(), public.purge_organization(uuid, uuid) from public, anon, authenticated;
grant execute on function public.grant_monthly_credits(), public.purge_trash(), public.purge_organization(uuid, uuid) to service_role;

-- Droit d'effacement d'un contact (RGPD / loi sur la vie privée) : anonymisation irréversible, historique commercial conservé sans données personnelles.
create function public.anonymize_contact(p_contact uuid) returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.contacts set first_name = null, last_name = null, first_name_he = null, last_name_he = null, company = null, phones = '[]', emails = '[]', notes = null,
    custom = '{}', marketing_consent = jsonb_build_object('granted', false, 'erased_at', now()), do_not_contact = true, search_text = null, tags = '{}', deleted_at = coalesce(deleted_at, now())
  where id = p_contact;
  if not found then raise exception 'not_found_or_forbidden' using errcode = '42501'; end if;
  update public.activities set summary = null, payload = null where contact_id = p_contact and kind in ('note','share');
end $$;
grant execute on function public.anonymize_contact(uuid) to authenticated;
