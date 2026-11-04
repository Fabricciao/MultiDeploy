-- Phase 1 : pipeline, tâches, visites, envois, vues enregistrées, critères de recherche,
-- référentiel géographique, moteur de matching (SQL, security invoker → RLS appliquée).

-- ---------- critères de recherche des acheteurs/locataires ----------
create table public.contact_search_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  contact_id uuid not null references public.contacts on delete cascade,
  transaction public.transaction_type not null default 'sale',
  property_types text[] not null default '{}',
  city_ids uuid[] not null default '{}',
  price_min numeric, price_max numeric,
  currency text not null default 'ILS' check (currency in ('ILS','USD','EUR')),
  rooms_min numeric(3,1), rooms_max numeric(3,1),
  area_min numeric, floor_min int,
  must_have text[] not null default '{}',
  nice_to_have text[] not null default '{}',
  move_in_by date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index csp_org_active on public.contact_search_profiles (organization_id, active, transaction);
create index csp_contact on public.contact_search_profiles (contact_id);
create trigger csp_updated before update on public.contact_search_profiles for each row execute function app.set_updated_at();

-- ---------- pipeline ----------
create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  name jsonb not null,                      -- {fr,he,en}
  position int not null,
  kind text not null default 'open' check (kind in ('open','won','lost')),
  probability int not null default 0 check (probability between 0 and 100)
);
create index stages_org on public.pipeline_stages (organization_id, position);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  contact_id uuid not null references public.contacts on delete cascade,
  property_id uuid references public.properties on delete set null,
  stage_id uuid not null references public.pipeline_stages,
  agent_id uuid references public.profiles default auth.uid(),
  title text,
  value numeric, currency text not null default 'ILS',
  commission_pct numeric,
  expected_close date,
  lost_reason text,
  closed_at timestamptz,
  position numeric not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index deals_org_stage on public.deals (organization_id, stage_id, position) where deleted_at is null;
create trigger deals_updated before update on public.deals for each row execute function app.set_updated_at();
create trigger deals_audit after insert or update or delete on public.deals for each row execute function app.audit();

-- ---------- tâches / visites ----------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  title text not null,
  due_at timestamptz,
  priority int not null default 0,
  assignee_id uuid references public.profiles default auth.uid(),
  contact_id uuid references public.contacts on delete cascade,
  property_id uuid references public.properties on delete cascade,
  deal_id uuid references public.deals on delete cascade,
  done_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index tasks_open on public.tasks (organization_id, assignee_id, due_at) where done_at is null;

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  property_id uuid not null references public.properties on delete cascade,
  contact_id uuid references public.contacts on delete set null,
  agent_id uuid references public.profiles default auth.uid(),
  starts_at timestamptz not null, ends_at timestamptz,
  status text not null default 'planned' check (status in ('planned','done','cancelled','no_show')),
  feedback jsonb,
  created_at timestamptz not null default now()
);
create index visits_org_start on public.visits (organization_id, starts_at);

-- ---------- envois de biens ----------
create table public.shares (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  contact_id uuid not null references public.contacts on delete cascade,
  sender_id uuid not null references public.profiles default auth.uid(),
  channel text not null check (channel in ('email','whatsapp_link','link')),
  property_ids uuid[] not null,
  locale text not null default 'fr' check (locale in ('fr','he','en')),
  subject text, message text,
  token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  status text not null default 'queued' check (status in ('queued','sent','failed','dry_run')),
  provider_id text, error text,
  sent_at timestamptz, opened_at timestamptz,
  created_at timestamptz not null default now()
);
create index shares_contact on public.shares (organization_id, contact_id, created_at desc);

create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references public.profiles default auth.uid(),
  scope text not null check (scope in ('properties','contacts')),
  name text not null,
  filters jsonb not null default '{}',
  shared boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- capacités ----------
insert into public.role_capabilities (organization_id, role, capability)
select null, x.role::public.member_role, x.cap from (values
  ('owner','deals.write'),('owner','tasks.write'),('owner','shares.send'),
  ('admin','deals.write'),('admin','tasks.write'),('admin','shares.send'),
  ('agent','deals.write'),('agent','tasks.write'),('agent','shares.send'),
  ('assistant','deals.write'),('assistant','tasks.write'),('assistant','shares.send')
) as x(role, cap);

-- ---------- RLS ----------
do $$ declare t text; begin
  for t in select unnest(array['contact_search_profiles','pipeline_stages','deals','tasks','visits','shares','saved_views']) loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- les critères héritent de la visibilité du contact (sous-requête soumise à la RLS de contacts)
create policy csp_select on public.contact_search_profiles for select to authenticated
  using (organization_id = (select app.org_id()) and exists (select 1 from public.contacts c where c.id = contact_id));
create policy csp_write on public.contact_search_profiles for all to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('contacts.write'))
         and exists (select 1 from public.contacts c where c.id = contact_id))
  with check (organization_id = (select app.org_id()) and (select app.has_capability('contacts.write'))
         and exists (select 1 from public.contacts c where c.id = contact_id));

create policy stages_select on public.pipeline_stages for select to authenticated using (organization_id = (select app.org_id()));
create policy stages_write on public.pipeline_stages for all to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('org.manage')))
  with check (organization_id = (select app.org_id()) and (select app.has_capability('org.manage')));

create policy deals_select on public.deals for select to authenticated using (
  organization_id = (select app.org_id()) and deleted_at is null
  and ((select app.has_capability('contacts.read_all')) or agent_id = auth.uid()));
create policy deals_insert on public.deals for insert to authenticated
  with check (organization_id = (select app.org_id()) and (select app.has_capability('deals.write'))
              and exists (select 1 from public.contacts c where c.id = contact_id));
create policy deals_update on public.deals for update to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('deals.write'))
         and (agent_id = auth.uid() or (select app.has_capability('contacts.write_all'))))
  with check (organization_id = (select app.org_id()));
create policy deals_delete on public.deals for delete to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('contacts.delete')));

create policy tasks_select on public.tasks for select to authenticated using (
  organization_id = (select app.org_id()) and (assignee_id = auth.uid() or created_by = auth.uid() or (select app.has_capability('contacts.write_all'))));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (organization_id = (select app.org_id()) and (select app.has_capability('tasks.write'))
              and (assignee_id = auth.uid() or (select app.has_capability('contacts.write_all'))));
create policy tasks_update on public.tasks for update to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('tasks.write'))
         and (assignee_id = auth.uid() or (select app.has_capability('contacts.write_all'))))
  with check (organization_id = (select app.org_id()));
create policy tasks_delete on public.tasks for delete to authenticated
  using (organization_id = (select app.org_id()) and (assignee_id = auth.uid() or (select app.has_capability('contacts.write_all'))));

create policy visits_select on public.visits for select to authenticated using (organization_id = (select app.org_id()));
create policy visits_write on public.visits for all to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('properties.write')))
  with check (organization_id = (select app.org_id()) and (select app.has_capability('properties.write')));

create policy shares_select on public.shares for select to authenticated using (
  organization_id = (select app.org_id()) and (sender_id = auth.uid() or (select app.has_capability('contacts.write_all'))));
create policy shares_insert on public.shares for insert to authenticated
  with check (organization_id = (select app.org_id()) and sender_id = auth.uid() and (select app.has_capability('shares.send'))
              and exists (select 1 from public.contacts c where c.id = contact_id));
create policy shares_update on public.shares for update to authenticated
  using (organization_id = (select app.org_id()) and sender_id = auth.uid())
  with check (organization_id = (select app.org_id()) and sender_id = auth.uid());

create policy views_select on public.saved_views for select to authenticated
  using (organization_id = (select app.org_id()) and (user_id = auth.uid() or shared));
create policy views_write on public.saved_views for all to authenticated
  using (organization_id = (select app.org_id()) and user_id = auth.uid())
  with check (organization_id = (select app.org_id()) and user_id = auth.uid());

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
revoke all on all tables in schema public from anon;
revoke insert, update, delete on public.audit_log, public.ai_usage from authenticated;
revoke all on public.platform_admins, public.org_counters from authenticated;

-- ---------- étapes par défaut ----------
create function app.seed_pipeline(org uuid) returns void language sql security definer set search_path = '' as $$
  insert into public.pipeline_stages (organization_id, name, position, kind, probability) values
    (org, '{"fr":"Nouveau lead","he":"ליד חדש","en":"New lead"}', 1, 'open', 10),
    (org, '{"fr":"Qualifié","he":"מוסמך","en":"Qualified"}', 2, 'open', 25),
    (org, '{"fr":"Visites","he":"ביקורים","en":"Viewings"}', 3, 'open', 40),
    (org, '{"fr":"Offre","he":"הצעה","en":"Offer"}', 4, 'open', 60),
    (org, '{"fr":"Négociation","he":"משא ומתן","en":"Negotiation"}', 5, 'open', 75),
    (org, '{"fr":"Promesse","he":"חוזה","en":"Contract"}', 6, 'open', 90),
    (org, '{"fr":"Conclu","he":"נסגר","en":"Won"}', 7, 'won', 100),
    (org, '{"fr":"Perdu","he":"אבד","en":"Lost"}', 8, 'lost', 0);
$$;
revoke execute on function app.seed_pipeline(uuid) from public, anon, authenticated;
select app.seed_pipeline(id) from public.organizations;

create or replace function public.provision_organization(
  p_slug text, p_name_fr text, p_name_he text, p_name_en text, p_default_locale text, p_owner_user_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  insert into public.organizations (slug, name_fr, name_he, name_en, default_locale)
  values (p_slug, p_name_fr, p_name_he, p_name_en, p_default_locale) returning id into org;
  insert into public.memberships (organization_id, user_id, role) values (org, p_owner_user_id, 'owner');
  update public.profiles set active_organization_id = org where id = p_owner_user_id;
  insert into public.brand_kits (organization_id) values (org);
  insert into public.lead_sources (organization_id, name, position) values
    (org, '{"fr":"Site web","he":"אתר","en":"Website"}', 1),
    (org, '{"fr":"Recommandation","he":"המלצה","en":"Referral"}', 2),
    (org, '{"fr":"Facebook / Instagram","he":"פייסבוק / אינסטגרם","en":"Facebook / Instagram"}', 3),
    (org, '{"fr":"Yad2 / Madlan","he":"יד2 / מדלן","en":"Yad2 / Madlan"}', 4),
    (org, '{"fr":"Appel entrant","he":"שיחה נכנסת","en":"Inbound call"}', 5);
  perform app.seed_pipeline(org);
  insert into public.audit_log (organization_id, actor_id, action, entity, entity_id)
  values (org, p_owner_user_id, 'PROVISION', 'organizations', org);
  return org;
end $$;
revoke execute on function public.provision_organization(text,text,text,text,text,uuid) from public, anon, authenticated;
grant execute on function public.provision_organization(text,text,text,text,text,uuid) to service_role;

-- ---------- géographie (référentiel global, lecture seule) ----------
insert into public.geo_places (kind, name_fr, name_he, name_en, aliases, lat, lng) values
 ('city','Raanana','רעננה','Ra''anana','{Raanana,Ra''anana}',32.184,34.871),
 ('city','Kfar Saba','כפר סבא','Kfar Saba','{Kfar-Saba,Kfar Sava}',32.178,34.907),
 ('city','Herzliya','הרצליה','Herzliya','{Herzlia}',32.166,34.844),
 ('city','Netanya','נתניה','Netanya','{Natanya}',32.329,34.857),
 ('city','Hod HaSharon','הוד השרון','Hod HaSharon','{Hod Hasharon}',32.150,34.888),
 ('city','Tel Aviv-Jaffa','תל אביב-יפו','Tel Aviv-Yafo','{Tel Aviv,Tel-Aviv,תל אביב}',32.085,34.782),
 ('city','Jérusalem','ירושלים','Jerusalem','{Jerusalem,Yerushalayim}',31.768,35.214),
 ('city','Modiin','מודיעין-מכבים-רעות','Modi''in','{Modiin,Modi''in}',31.898,35.010),
 ('city','Petah Tikva','פתח תקווה','Petah Tikva','{Petach Tikva,Petah Tiqwa}',32.088,34.887),
 ('city','Ramat Gan','רמת גן','Ramat Gan','{}',32.068,34.824),
 ('city','Givatayim','גבעתיים','Givatayim','{}',32.071,34.812),
 ('city','Rishon LeZion','ראשון לציון','Rishon LeZion','{Rishon}',31.973,34.789),
 ('city','Rehovot','רחובות','Rehovot','{}',31.894,34.811),
 ('city','Ashdod','אשדוד','Ashdod','{}',31.804,34.655),
 ('city','Ashkelon','אשקלון','Ashkelon','{}',31.669,34.571),
 ('city','Haïfa','חיפה','Haifa','{Haifa}',32.794,34.990),
 ('city','Beer Sheva','באר שבע','Beer Sheva','{Be''er Sheva,Beersheba}',31.253,34.791),
 ('city','Beit Shemesh','בית שמש','Beit Shemesh','{}',31.747,34.988),
 ('city','Holon','חולון','Holon','{}',32.011,34.774),
 ('city','Bat Yam','בת ים','Bat Yam','{}',32.017,34.750);

-- ---------- moteur de matching ----------
create function app.prop_has(p public.properties, key text) returns boolean language sql immutable as $$
  select case key
    when 'mamad' then coalesce(p.mamad, false)
    when 'parking' then coalesce(p.parking_count, 0) > 0
    when 'elevator' then coalesce(p.elevator, false)
    when 'sukkah_balcony' then coalesce(p.sukkah_balcony, false)
    when 'storage' then coalesce(p.storage, false)
    when 'ac' then coalesce(p.ac, false)
    when 'accessible' then coalesce(p.accessible, false)
    when 'balcony' then coalesce(p.area_balcony, 0) > 0 or coalesce(p.sukkah_balcony, false)
    when 'garden' then coalesce(p.area_garden, 0) > 0
    else key = any(p.features)
  end
$$;

-- Retourne NULL si le bien est éliminé, sinon {"score": 0-100, "reasons": [...]}
-- Éliminatoires : transaction, statut actif, type, ville, fourchette de pièces, indispensables, budget > +15 %.
create function app.match_eval(p public.properties, sp public.contact_search_profiles) returns jsonb
language plpgsql stable as $$
declare
  score numeric := 100; reasons jsonb := '[]'::jsonb; k text; over numeric;
begin
  if p.status <> 'active' or p.deleted_at is not null then return null; end if;
  if p.transaction <> sp.transaction then return null; end if;
  if cardinality(sp.property_types) > 0 and not (p.property_type = any(sp.property_types)) then return null; end if;
  if cardinality(sp.city_ids) > 0 and (p.city_id is null or not (p.city_id = any(sp.city_ids))) then return null; end if;
  if sp.rooms_min is not null and p.rooms is not null and p.rooms < sp.rooms_min then return null; end if;
  if sp.rooms_max is not null and p.rooms is not null and p.rooms > sp.rooms_max then return null; end if;
  foreach k in array sp.must_have loop
    if not app.prop_has(p, k) then return null; end if;
  end loop;
  if sp.price_max is not null and p.price is not null and p.currency = sp.currency then
    if p.price > sp.price_max * 1.15 then return null; end if;
    if p.price > sp.price_max then
      over := round((p.price / sp.price_max - 1) * 100, 1);
      score := score - least(30, over * 2);
      reasons := reasons || jsonb_build_object('code', 'over_budget', 'pct', over);
    end if;
  end if;
  if sp.price_min is not null and p.price is not null and p.currency = sp.currency and p.price < sp.price_min then
    score := score - 10; reasons := reasons || jsonb_build_object('code', 'under_budget');
  end if;
  if sp.area_min is not null and p.area_built is not null and p.area_built < sp.area_min then
    score := score - 12; reasons := reasons || jsonb_build_object('code', 'area_below', 'min', sp.area_min);
  end if;
  if sp.floor_min is not null and p.floor is not null and p.floor < sp.floor_min then
    score := score - 8; reasons := reasons || jsonb_build_object('code', 'floor_below', 'min', sp.floor_min);
  end if;
  foreach k in array sp.nice_to_have loop
    if app.prop_has(p, k) then score := score + 0; reasons := reasons || jsonb_build_object('code', 'has', 'key', k);
    else score := score - 6; reasons := reasons || jsonb_build_object('code', 'missing', 'key', k); end if;
  end loop;
  foreach k in array sp.must_have loop
    reasons := reasons || jsonb_build_object('code', 'has', 'key', k);
  end loop;
  return jsonb_build_object('score', greatest(0, least(100, round(score))), 'reasons', reasons);
end $$;

-- Biens qui correspondent à un client (tous ses profils actifs, meilleur score par bien)
create function public.match_properties_for_contact(p_contact uuid)
returns table (property_id uuid, score int, reasons jsonb, profile_id uuid)
language sql stable security invoker set search_path = public, app as $$
  select distinct on (pr.id) pr.id, (m.e->>'score')::int, m.e->'reasons', sp.id
  from public.contact_search_profiles sp
  join public.properties pr on pr.organization_id = sp.organization_id
  cross join lateral (select app.match_eval(pr, sp) as e) m
  where sp.contact_id = p_contact and sp.active and m.e is not null
    and not exists (select 1 from public.shares s where s.contact_id = p_contact and pr.id = any(s.property_ids) and s.status in ('sent','dry_run'))
  order by pr.id, (m.e->>'score')::int desc
$$;

-- Clients qui correspondent à un bien
create function public.match_contacts_for_property(p_property uuid)
returns table (contact_id uuid, score int, reasons jsonb, profile_id uuid)
language sql stable security invoker set search_path = public, app as $$
  select distinct on (sp.contact_id) sp.contact_id, (m.e->>'score')::int, m.e->'reasons', sp.id
  from public.properties pr
  join public.contact_search_profiles sp on sp.organization_id = pr.organization_id and sp.active
  join public.contacts c on c.id = sp.contact_id and c.deleted_at is null and not c.do_not_contact
  cross join lateral (select app.match_eval(pr, sp) as e) m
  where pr.id = p_property and m.e is not null
  order by sp.contact_id, (m.e->>'score')::int desc
$$;
grant execute on function public.match_properties_for_contact(uuid), public.match_contacts_for_property(uuid) to authenticated;
grant execute on function app.match_eval(public.properties, public.contact_search_profiles), app.prop_has(public.properties, text) to authenticated, service_role;
