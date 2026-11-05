-- Correctif : activities n'a pas de politique UPDATE, donc l'effacement des notes/partages n'avait aucun effet. Le nettoyage passe par une fonction
-- définie en security definer, appelée seulement après que la mise à jour du contact (sous RLS) ait réussi.
-- L'effacement d'un contact purge aussi le contenu des messages WhatsApp entrants (données personnelles).
create or replace function app.scrub_contact_activities(p_contact uuid) returns void language sql security definer set search_path = '' as $$
  update public.activities set summary = null, payload = null where contact_id = p_contact and organization_id = app.org_id() and kind in ('note','share','whatsapp')
    and exists (select 1 from public.contacts c where c.id = p_contact and c.organization_id = app.org_id() and c.marketing_consent ? 'erased_at');
$$;
revoke all on function app.scrub_contact_activities(uuid) from public;
grant execute on function app.scrub_contact_activities(uuid) to authenticated;

create or replace function public.anonymize_contact(p_contact uuid) returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.contacts set first_name = null, last_name = null, first_name_he = null, last_name_he = null, company = null, phones = '[]', emails = '[]', notes = null,
    custom = '{}', marketing_consent = jsonb_build_object('granted', false, 'erased_at', now()), do_not_contact = true, search_text = null, tags = '{}', deleted_at = coalesce(deleted_at, now())
  where id = p_contact;
  if not found then raise exception 'not_found_or_forbidden' using errcode = '42501'; end if;
  perform app.scrub_contact_activities(p_contact);
end $$;
grant execute on function public.anonymize_contact(uuid) to authenticated;
