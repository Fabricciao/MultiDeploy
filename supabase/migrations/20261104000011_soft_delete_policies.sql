-- Corrige un bug latent : un UPDATE qui pose deleted_at était refusé car la ligne mise à jour devait encore satisfaire la policy
-- SELECT (deleted_at is null). Les utilisateurs ayant le droit d'écriture voient désormais aussi les lignes de la corbeille
-- (les requêtes applicatives filtrent explicitement deleted_at is null).
drop policy properties_select on public.properties;
create policy properties_select on public.properties for select to authenticated
  using (organization_id = (select app.org_id()) and (deleted_at is null or (select app.has_capability('properties.write'))));

drop policy contacts_select on public.contacts;
create policy contacts_select on public.contacts for select to authenticated using (
  organization_id = (select app.org_id()) and (deleted_at is null or (select app.has_capability('contacts.write'))) and (
    (select app.has_capability('contacts.read_all')) or owner_id = auth.uid()
    or exists (select 1 from public.contact_shares s where s.contact_id = contacts.id and s.user_id = auth.uid())));

drop policy deals_select on public.deals;
create policy deals_select on public.deals for select to authenticated using (
  organization_id = (select app.org_id()) and (deleted_at is null or (select app.has_capability('deals.write')))
  and ((select app.has_capability('contacts.read_all')) or agent_id = auth.uid()));
