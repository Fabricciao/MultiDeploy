-- Seuls les owners peuvent créer/modifier/retirer un owner (un admin ne peut ni se promouvoir ni rétrograder un owner).
drop policy memberships_write on public.memberships;
create policy memberships_write on public.memberships for all to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('members.manage')) and (role <> 'owner' or (select app.role()) = 'owner'))
  with check (organization_id = (select app.org_id()) and (select app.has_capability('members.manage')) and (role <> 'owner' or (select app.role()) = 'owner'));
