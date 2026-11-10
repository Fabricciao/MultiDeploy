-- Commissions : côté bien (vendeur / propriétaire) et côté client (acheteur / locataire), modifiables.
-- Vide = automatique : bien 2 % (0 % en shitouf / bien d'une autre agence), client 2 % (0 % s'il vient d'un autre agent en shitouf).
-- La commission d'une affaire = prix × (commission du bien + commission du client), sauf taux forcé sur l'affaire.

alter table public.properties add column if not exists commission_pct numeric check (commission_pct is null or (commission_pct >= 0 and commission_pct <= 20));
alter table public.contacts add column if not exists commission_pct numeric check (commission_pct is null or (commission_pct >= 0 and commission_pct <= 20));
alter table public.contacts add column if not exists co_broke boolean not null default false;

-- Les affaires recevaient toujours 2 % à la création : ce n'était qu'une valeur par défaut, désormais calculée.
update public.deals set commission_pct = null where commission_pct = 2;

create or replace function public.property_fee_pct(p_property uuid) returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(p.commission_pct, case when coalesce((p.mandate->>'co_broke')::boolean, false) or p.mandate->>'origin' = 'partner' then 0 else 2 end)
  from public.properties p where p.id = p_property and p.organization_id = (select app.org_id())
$$;
create or replace function public.contact_fee_pct(p_contact uuid) returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(c.commission_pct, case when c.co_broke then 0 else 2 end)
  from public.contacts c where c.id = p_contact and c.organization_id = (select app.org_id())
$$;
-- Taux total d'une affaire (en %). Lisible par un agent même si le bien appartient à un collègue (le taux seul, rien d'autre).
create or replace function public.deal_fee_pct(p_override numeric, p_property uuid, p_contact uuid) returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(p_override, coalesce(public.property_fee_pct(p_property), 0) + coalesce(public.contact_fee_pct(p_contact), 0))
$$;
revoke all on function public.property_fee_pct(uuid), public.contact_fee_pct(uuid), public.deal_fee_pct(numeric, uuid, uuid) from public, anon;
grant execute on function public.property_fee_pct(uuid), public.contact_fee_pct(uuid), public.deal_fee_pct(numeric, uuid, uuid) to authenticated, service_role;

create index if not exists visits_signed_idx on public.visits (organization_id, signed_at desc) where signed_at is not null;
