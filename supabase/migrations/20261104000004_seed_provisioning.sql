-- Capacités par défaut + provisioning d'une agence.

insert into public.role_capabilities (organization_id, role, capability)
select null, x.role::public.member_role, x.cap
from (values
  ('owner','contacts.read_all'),('owner','contacts.write'),('owner','contacts.write_all'),('owner','contacts.delete'),
  ('owner','properties.write'),('owner','properties.write_all'),('owner','properties.delete'),
  ('owner','members.manage'),('owner','org.manage'),('owner','brand.manage'),('owner','audit.read'),
  ('owner','exports.run'),('owner','ai.use'),('owner','ai.usage.read'),('owner','billing.manage'),
  ('admin','contacts.read_all'),('admin','contacts.write'),('admin','contacts.write_all'),('admin','contacts.delete'),
  ('admin','properties.write'),('admin','properties.write_all'),('admin','properties.delete'),
  ('admin','members.manage'),('admin','org.manage'),('admin','brand.manage'),('admin','audit.read'),
  ('admin','exports.run'),('admin','ai.use'),('admin','ai.usage.read'),
  ('agent','contacts.read_all'),('agent','contacts.write'),('agent','properties.write'),('agent','ai.use'),
  ('assistant','contacts.read_all'),('assistant','contacts.write'),('assistant','properties.write'),('assistant','ai.use'),
  ('viewer','contacts.read_all')
) as x(role, cap);

-- Crée une agence isolée + son owner + valeurs par défaut. Réservée à service_role / console plateforme.
create or replace function public.provision_organization(
  p_slug text, p_name_fr text, p_name_he text, p_name_en text,
  p_default_locale text, p_owner_user_id uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  insert into public.organizations (slug, name_fr, name_he, name_en, default_locale)
  values (p_slug, p_name_fr, p_name_he, p_name_en, p_default_locale)
  returning id into org;

  insert into public.memberships (organization_id, user_id, role) values (org, p_owner_user_id, 'owner');
  update public.profiles set active_organization_id = org where id = p_owner_user_id;
  insert into public.brand_kits (organization_id) values (org);

  insert into public.lead_sources (organization_id, name, position) values
    (org, '{"fr":"Site web","he":"אתר","en":"Website"}', 1),
    (org, '{"fr":"Recommandation","he":"המלצה","en":"Referral"}', 2),
    (org, '{"fr":"Facebook / Instagram","he":"פייסבוק / אינסטגרם","en":"Facebook / Instagram"}', 3),
    (org, '{"fr":"Yad2 / Madlan","he":"יד2 / מדלן","en":"Yad2 / Madlan"}', 4),
    (org, '{"fr":"Appel entrant","he":"שיחה נכנסת","en":"Inbound call"}', 5);

  insert into public.audit_log (organization_id, actor_id, action, entity, entity_id)
  values (org, p_owner_user_id, 'PROVISION', 'organizations', org);
  return org;
end $$;
revoke execute on function public.provision_organization(text,text,text,text,text,uuid) from public, anon, authenticated;
grant execute on function public.provision_organization(text,text,text,text,text,uuid) to service_role;
