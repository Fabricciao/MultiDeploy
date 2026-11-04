-- RLS : activée sur TOUTES les tables du schéma public. Aucune policy = aucun accès.

do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- organisations : on voit ses agences (pour le sélecteur), on modifie l'agence active si autorisé
create policy org_select on public.organizations for select to authenticated using (
  id in (select organization_id from public.memberships where user_id = auth.uid() and status = 'active')
  or (select app.is_platform_admin()));
create policy org_update on public.organizations for update to authenticated
  using (id = (select app.org_id()) and (select app.has_capability('org.manage')))
  with check (id = (select app.org_id()));

-- profils : soi-même + collègues de l'agence active
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid()
  or id in (select user_id from public.memberships where organization_id = (select app.org_id())));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- appartenances
create policy memberships_select on public.memberships for select to authenticated using (
  user_id = auth.uid() or organization_id = (select app.org_id()));
create policy memberships_write on public.memberships for all to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('members.manage')))
  with check (organization_id = (select app.org_id()) and (select app.has_capability('members.manage'))
              and role <> 'owner');

create policy invitations_all on public.invitations for all to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('members.manage')))
  with check (organization_id = (select app.org_id()) and (select app.has_capability('members.manage')));

-- capacités : lecture des défauts et de ses surcharges ; écriture réservée à org.manage
create policy rc_select on public.role_capabilities for select to authenticated
  using (organization_id is null or organization_id = (select app.org_id()));
create policy rc_write on public.role_capabilities for all to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('org.manage')))
  with check (organization_id = (select app.org_id()) and (select app.has_capability('org.manage')));

-- platform_admins : aucune policy (service_role uniquement)

create policy brand_select on public.brand_kits for select to authenticated
  using (organization_id = (select app.org_id()));
create policy brand_write on public.brand_kits for all to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('brand.manage')))
  with check (organization_id = (select app.org_id()) and (select app.has_capability('brand.manage')));

create policy audit_select on public.audit_log for select to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('audit.read')));

create policy geo_select on public.geo_places for select to authenticated using (true);

create policy sources_select on public.lead_sources for select to authenticated
  using (organization_id = (select app.org_id()));
create policy sources_write on public.lead_sources for all to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('org.manage')))
  with check (organization_id = (select app.org_id()) and (select app.has_capability('org.manage')));

-- contacts : visibilité réglable (capacité contacts.read_all), partage explicite
create policy contacts_select on public.contacts for select to authenticated using (
  organization_id = (select app.org_id()) and deleted_at is null and (
    (select app.has_capability('contacts.read_all'))
    or owner_id = auth.uid()
    or exists (select 1 from public.contact_shares s where s.contact_id = contacts.id and s.user_id = auth.uid())));
create policy contacts_insert on public.contacts for insert to authenticated
  with check (organization_id = (select app.org_id()) and (select app.has_capability('contacts.write')));
create policy contacts_update on public.contacts for update to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('contacts.write')) and (
    owner_id = auth.uid() or (select app.has_capability('contacts.write_all'))
    or exists (select 1 from public.contact_shares s where s.contact_id = contacts.id and s.user_id = auth.uid())))
  with check (organization_id = (select app.org_id()));
create policy contacts_delete on public.contacts for delete to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('contacts.delete')));

create policy shares_select on public.contact_shares for select to authenticated
  using (organization_id = (select app.org_id()));
create policy shares_write on public.contact_shares for all to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('contacts.write_all')))
  with check (organization_id = (select app.org_id()) and (select app.has_capability('contacts.write_all')));

-- biens
create policy properties_select on public.properties for select to authenticated
  using (organization_id = (select app.org_id()) and deleted_at is null);
create policy properties_insert on public.properties for insert to authenticated
  with check (organization_id = (select app.org_id()) and (select app.has_capability('properties.write')));
create policy properties_update on public.properties for update to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('properties.write'))
         and (agent_id = auth.uid() or (select app.has_capability('properties.write_all'))))
  with check (organization_id = (select app.org_id()));
create policy properties_delete on public.properties for delete to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('properties.delete')));

-- tables filles des biens
create policy ptr_select on public.property_translations for select to authenticated
  using (organization_id = (select app.org_id()));
create policy ptr_write on public.property_translations for all to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('properties.write')))
  with check (organization_id = (select app.org_id()) and (select app.has_capability('properties.write')));
create policy pmedia_select on public.property_media for select to authenticated
  using (organization_id = (select app.org_id()));
create policy pmedia_write on public.property_media for all to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('properties.write')))
  with check (organization_id = (select app.org_id()) and (select app.has_capability('properties.write')));

-- activités : lecture agence, écriture sous son propre nom
create policy act_select on public.activities for select to authenticated
  using (organization_id = (select app.org_id()));
create policy act_insert on public.activities for insert to authenticated
  with check (organization_id = (select app.org_id()) and actor_id = auth.uid());

create policy usage_select on public.ai_usage for select to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('ai.usage.read')));

-- org_counters : aucune policy (accès via fonction security definer uniquement)

-- ---------- privilèges ----------
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
revoke insert, update, delete on public.audit_log, public.ai_usage from authenticated;
revoke all on public.platform_admins, public.org_counters from authenticated;
grant usage, select on all sequences in schema public to authenticated, service_role;
