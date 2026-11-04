-- Liens bien ↔ contact (propriétaire, locataire actuel…) ; visibilité = celle du bien ET du contact.
create table public.property_contacts (
  property_id uuid not null references public.properties on delete cascade,
  contact_id uuid not null references public.contacts on delete cascade,
  organization_id uuid not null references public.organizations on delete cascade,
  relation text not null check (relation in ('owner','tenant','other')),
  primary key (property_id, contact_id, relation)
);
create index property_contacts_contact on public.property_contacts (contact_id);
alter table public.property_contacts enable row level security;
create policy pc_select on public.property_contacts for select to authenticated
  using (organization_id = (select app.org_id())
         and exists (select 1 from public.properties p where p.id = property_id)
         and exists (select 1 from public.contacts c where c.id = contact_id));
create policy pc_write on public.property_contacts for all to authenticated
  using (organization_id = (select app.org_id()) and (select app.has_capability('properties.write')))
  with check (organization_id = (select app.org_id()) and (select app.has_capability('properties.write'))
              and exists (select 1 from public.properties p where p.id = property_id)
              and exists (select 1 from public.contacts c where c.id = contact_id));
grant select, insert, update, delete on public.property_contacts to authenticated;
grant all on public.property_contacts to service_role;
