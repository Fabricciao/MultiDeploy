-- Facturation manuelle : l'agence ne paie pas dans le CRM. L'administrateur de la plateforme fixe plan, échéance et note ;
-- l'agence les voit en lecture seule.
alter table public.organizations add column if not exists paid_until date, add column if not exists billing_note text;

-- Correctif de sécurité : la politique org_update laisse un propriétaire modifier sa ligne d'agence (y compris via l'API REST de Supabase).
-- Plan, statut, identifiant, échéance et surcharges de quotas/options ne doivent changer que par la console plateforme (rôle serveur).
create or replace function app.guard_org_billing() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') and (
       new.plan is distinct from old.plan or new.status is distinct from old.status or new.slug is distinct from old.slug
    or new.paid_until is distinct from old.paid_until or new.billing_note is distinct from old.billing_note
    or (new.settings -> 'features') is distinct from (old.settings -> 'features')
    or (new.settings -> 'seats_override') is distinct from (old.settings -> 'seats_override')
    or (new.settings -> 'storage_override') is distinct from (old.settings -> 'storage_override')) then
    raise exception 'billing_fields_protected' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists organizations_guard_billing on public.organizations;
create trigger organizations_guard_billing before update on public.organizations for each row execute function app.guard_org_billing();
