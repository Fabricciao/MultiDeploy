-- Phase 2 : tâches IA (dictée/scan), crédits IA, versions de charte, affiches générées.

alter table public.property_translations drop constraint if exists property_translations_origin_check;
alter table public.property_translations add constraint property_translations_origin_check check (origin in ('manual','ai','template'));
create unique index if not exists property_media_one_cover on public.property_media (property_id) where is_cover;

insert into public.role_capabilities (organization_id, role, capability)
select null, x.role::public.member_role, 'posters.create' from (values ('owner'),('admin'),('agent'),('assistant')) as x(role);

-- ---------- tâches IA ----------
create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  kind text not null check (kind in ('intake_voice','intake_photo','intake_text')),
  target text not null check (target in ('contact','property')),
  status text not null default 'processing' check (status in ('processing','needs_review','done','failed','discarded')),
  input_path text,
  transcript text,
  result jsonb check (result is null or jsonb_typeof(result) = 'object'),   -- {fields, meta:{champ:{confidence,evidence}}, missing:[…]}
  provider text,
  error text,
  target_id uuid,
  created_by uuid not null references public.profiles default auth.uid(),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index ai_jobs_user on public.ai_jobs (organization_id, created_by, created_at desc);

-- ---------- crédits IA (grand livre) ----------
create table public.ai_credit_ledger (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations on delete cascade,
  delta numeric not null,
  reason text not null,
  ref text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index ai_ledger_org on public.ai_credit_ledger (organization_id, created_at desc);

create function public.ai_balance() returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(sum(delta), 0) from public.ai_credit_ledger where organization_id = app.org_id()
$$;

-- Débit atomique : verrou par agence, refus si solde insuffisant, capacité ai.use requise.
create function public.ai_spend(p_cost numeric, p_reason text, p_ref text default null) returns numeric
language plpgsql security definer set search_path = '' as $$
declare org uuid := app.org_id(); bal numeric;
begin
  if org is null or not app.has_capability('ai.use') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_cost < 0 then raise exception 'invalid_cost' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(org::text, 0));
  select coalesce(sum(delta), 0) into bal from public.ai_credit_ledger where organization_id = org;
  if bal < p_cost then raise exception 'insufficient_credits' using errcode = 'P0001'; end if;
  if p_cost > 0 then
    insert into public.ai_credit_ledger (organization_id, delta, reason, ref, created_by) values (org, -p_cost, p_reason, p_ref, auth.uid());
  end if;
  return bal - p_cost;
end $$;

create function public.ai_grant(p_org uuid, p_amount numeric, p_reason text) returns void language sql security definer set search_path = '' as $$
  insert into public.ai_credit_ledger (organization_id, delta, reason) values (p_org, p_amount, p_reason)
$$;
revoke execute on function public.ai_grant(uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.ai_grant(uuid, numeric, text) to service_role;
revoke execute on function public.ai_spend(numeric, text, text), public.ai_balance() from public, anon;
grant execute on function public.ai_spend(numeric, text, text), public.ai_balance() to authenticated;

select public.ai_grant(id, 50, 'trial_grant') from public.organizations;
create or replace function app.grant_trial_credits() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.ai_credit_ledger (organization_id, delta, reason) values (new.id, 50, 'trial_grant'); return new; end $$;
create trigger organizations_trial_credits after insert on public.organizations for each row execute function app.grant_trial_credits();

-- ---------- versions de charte ----------
create table public.brand_kit_versions (
  organization_id uuid not null references public.organizations on delete cascade,
  version int not null,
  snapshot jsonb not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (organization_id, version)
);
create function app.brand_kit_snapshot() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if to_jsonb(old) - 'updated_at' - 'version' is distinct from to_jsonb(new) - 'updated_at' - 'version' then
    insert into public.brand_kit_versions (organization_id, version, snapshot) values (old.organization_id, old.version, to_jsonb(old)) on conflict do nothing;
    new.version := old.version + 1;
  end if;
  return new;
end $$;
create trigger brand_kits_snapshot before update on public.brand_kits for each row execute function app.brand_kit_snapshot();

-- ---------- affiches ----------
create table public.poster_generations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  property_id uuid not null references public.properties on delete cascade,
  format text not null check (format in ('square','portrait','story','facebook','a4')),
  locale text not null check (locale in ('fr','he','en')),
  template text not null check (template in ('A','B','C')),
  level text not null default 'faithful' check (level in ('faithful','enhanced','creative')),
  params jsonb not null default '{}' check (jsonb_typeof(params) = 'object'),
  output_path text not null,
  width int not null, height int not null,
  credits numeric not null default 0,
  brand_version int,
  created_by uuid not null references public.profiles default auth.uid(),
  created_at timestamptz not null default now()
);
create index poster_gen_prop on public.poster_generations (property_id, created_at desc);

-- ---------- RLS ----------
do $$ declare t text; begin
  for t in select unnest(array['ai_jobs','ai_credit_ledger','brand_kit_versions','poster_generations']) loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
create policy jobs_select on public.ai_jobs for select to authenticated
  using (organization_id = (select app.org_id()) and (created_by = auth.uid() or (select app.has_capability('contacts.write_all'))));
create policy jobs_insert on public.ai_jobs for insert to authenticated
  with check (organization_id = (select app.org_id()) and created_by = auth.uid() and (select app.has_capability('ai.use')));
create policy jobs_update on public.ai_jobs for update to authenticated
  using (organization_id = (select app.org_id()) and created_by = auth.uid())
  with check (organization_id = (select app.org_id()) and created_by = auth.uid());
create policy ledger_select on public.ai_credit_ledger for select to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('ai.use')));
create policy bkv_select on public.brand_kit_versions for select to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('brand.manage')));
create policy poster_select on public.poster_generations for select to authenticated using (organization_id = (select app.org_id()));
create policy poster_insert on public.poster_generations for insert to authenticated
  with check (organization_id = (select app.org_id()) and created_by = auth.uid() and (select app.has_capability('posters.create'))
              and exists (select 1 from public.properties p where p.id = property_id));
create policy poster_delete on public.poster_generations for delete to authenticated
  using (organization_id = (select app.org_id()) and (created_by = auth.uid() or (select app.has_capability('properties.write_all'))));

grant select, insert, update, delete on public.ai_jobs, public.brand_kit_versions, public.poster_generations to authenticated;
grant select on public.ai_credit_ledger to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
revoke insert, update, delete on public.ai_credit_ledger from authenticated;
revoke insert, update, delete on public.brand_kit_versions from authenticated;
