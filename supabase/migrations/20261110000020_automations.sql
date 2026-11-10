-- V2 : automatisations par agence. Elles créent des tâches (jamais de message à un client).
-- Réglage : organizations.settings->'automations' = {"mandate":true,"silent":true,"cold":true,"deal":true}. Désactivées par défaut.

alter table public.tasks add column if not exists source text;
create index if not exists tasks_source_idx on public.tasks (organization_id, source) where source is not null;

create or replace function public.run_automations(p_org uuid default null)
returns int language plpgsql security definer set search_path = '' as $$
declare n int := 0; k int; o record;
begin
  for o in select id, coalesce(default_locale, 'fr') as loc, coalesce(settings->'automations', '{}'::jsonb) as a
           from public.organizations where status = 'active' and (p_org is null or id = p_org) loop

    -- Exclusivité qui expire dans 30 jours : une tâche par mandat et par date de fin.
    if coalesce((o.a->>'mandate')::boolean, false) then
      insert into public.tasks (organization_id, title, due_at, assignee_id, property_id, source, created_by)
      select o.id,
        case o.loc when 'he' then 'לחדש בלעדיות: ' when 'en' then 'Renew the exclusive: ' else 'Renouveler l''exclusivité : ' end || coalesce(p.street, p.reference),
        now() + interval '2 days', p.agent_id, p.id, 'mandate:' || p.id || ':' || (p.mandate->>'end'), null
      from public.properties p
      where p.organization_id = o.id and p.deleted_at is null and p.agent_id is not null and p.status in ('active','under_offer')
        and p.mandate->>'type' = 'exclusive' and (p.mandate->>'end')::date between current_date and current_date + 30
        and not exists (select 1 from public.tasks t where t.organization_id = o.id and t.source = 'mandate:' || p.id || ':' || (p.mandate->>'end'));
      get diagnostics k = row_count; n := n + k;
    end if;

    -- Client silencieux : rien depuis 14 jours (activité, envoi, visite). Au plus une relance tous les 14 jours.
    if coalesce((o.a->>'silent')::boolean, false) then
      insert into public.tasks (organization_id, title, due_at, assignee_id, contact_id, source, created_by)
      select o.id,
        case o.loc when 'he' then 'לחדש קשר עם ' when 'en' then 'Get back in touch with ' else 'Reprendre contact avec ' end
          || coalesce(nullif(trim(coalesce(c.first_name, '') || ' ' || coalesce(c.last_name, '')), ''), trim(coalesce(c.first_name_he, '') || ' ' || coalesce(c.last_name_he, ''))),
        now() + interval '1 day', c.owner_id, c.id, 'silent:' || c.id, null
      from public.contacts c
      where c.organization_id = o.id and c.deleted_at is null and c.owner_id is not null and not c.do_not_contact and c.created_at < now() - interval '14 days'
        and exists (select 1 from public.contact_search_profiles sp where sp.contact_id = c.id)
        and not exists (select 1 from public.activities a where a.contact_id = c.id and a.occurred_at > now() - interval '14 days')
        and not exists (select 1 from public.shares s where s.contact_id = c.id and s.created_at > now() - interval '14 days')
        and not exists (select 1 from public.visits v where v.contact_id = c.id and v.starts_at > now() - interval '14 days')
        and not exists (select 1 from public.deals d join public.pipeline_stages st on st.id = d.stage_id where d.contact_id = c.id and st.kind <> 'open' and d.closed_at > now() - interval '90 days')
        and not exists (select 1 from public.tasks t where t.organization_id = o.id and t.source = 'silent:' || c.id and (t.done_at is null or t.created_at > now() - interval '14 days'))
      limit 50;
      get diagnostics k = row_count; n := n + k;
    end if;

    -- Bien sans visite depuis 45 jours : une suggestion tous les 30 jours.
    if coalesce((o.a->>'cold')::boolean, false) then
      insert into public.tasks (organization_id, title, due_at, assignee_id, property_id, source, created_by)
      select o.id,
        case o.loc when 'he' then 'להחיות את הנכס (מחיר, תמונות או פרסום): ' when 'en' then 'Revive the listing (price, photos or poster): ' else 'Relancer le bien (prix, photos ou affiche) : ' end || coalesce(p.street, p.reference),
        now() + interval '3 days', p.agent_id, p.id, 'cold:' || p.id, null
      from public.properties p
      where p.organization_id = o.id and p.deleted_at is null and p.agent_id is not null and p.status = 'active'
        and coalesce(p.published_at, p.created_at) < now() - interval '45 days'
        and not exists (select 1 from public.visits v where v.property_id = p.id and v.starts_at > now() - interval '45 days')
        and not exists (select 1 from public.tasks t where t.organization_id = o.id and t.source = 'cold:' || p.id and (t.done_at is null or t.created_at > now() - interval '30 days'));
      get diagnostics k = row_count; n := n + k;
    end if;

    -- Affaire avancée (offre et au-delà) sans mouvement depuis 7 jours.
    if coalesce((o.a->>'deal')::boolean, false) then
      insert into public.tasks (organization_id, title, due_at, assignee_id, contact_id, deal_id, source, created_by)
      select o.id,
        case o.loc when 'he' then 'לקדם את העסקה עם ' when 'en' then 'Move the deal forward with ' else 'Faire avancer l''affaire avec ' end
          || coalesce(nullif(trim(coalesce(c.first_name, '') || ' ' || coalesce(c.last_name, '')), ''), trim(coalesce(c.first_name_he, '') || ' ' || coalesce(c.last_name_he, ''))),
        now() + interval '1 day', d.agent_id, d.contact_id, d.id, 'deal:' || d.id, null
      from public.deals d join public.pipeline_stages st on st.id = d.stage_id join public.contacts c on c.id = d.contact_id
      where d.organization_id = o.id and d.deleted_at is null and d.agent_id is not null and st.kind = 'open' and st.probability >= 50 and d.updated_at < now() - interval '7 days'
        and not exists (select 1 from public.tasks t where t.organization_id = o.id and t.source = 'deal:' || d.id and (t.done_at is null or t.created_at > now() - interval '7 days'));
      get diagnostics k = row_count; n := n + k;
    end if;
  end loop;
  return n;
end $$;

revoke all on function public.run_automations(uuid) from public, anon, authenticated;
