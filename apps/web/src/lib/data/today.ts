import { db, seesAllProperties, type Ctx } from "../session";

export async function getToday(ctx: Ctx, mine = false) {
  const own = mine || !seesAllProperties(ctx);
  return db(ctx, async (tx) => {
    const pOwn = own ? tx`and p.agent_id = ${ctx.userId}` : tx``;
    const tasks = await tx`
      select t.id, t.title, t.due_at, t.done_at, t.contact_id, c.first_name, c.last_name, c.first_name_he, c.last_name_he, (t.due_at < date_trunc('day', now())) as overdue
      from public.tasks t left join public.contacts c on c.id = t.contact_id
      where t.assignee_id = ${ctx.userId} and t.done_at is null and (t.due_at is null or t.due_at < date_trunc('day', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem' + interval '1 day')
      order by t.due_at nulls last, t.created_at desc limit 12`;
    const visits = await tx`
      select v.id, v.starts_at, v.property_id, p.reference, p.street, p.house_number, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en,
        c.id as contact_id, c.first_name, c.last_name, c.first_name_he, c.last_name_he, c.phones,
        (select pm.thumb_path from public.property_media pm where pm.property_id = p.id and pm.kind = 'photo' order by pm.is_cover desc, pm.position limit 1) as cover_thumb
      from public.visits v join public.properties p on p.id = v.property_id left join public.geo_places g on g.id = p.city_id left join public.contacts c on c.id = v.contact_id
      where v.status = 'planned' and v.starts_at >= date_trunc('day', now()) and v.starts_at < date_trunc('day', now()) + interval '7 days' and (v.agent_id = ${ctx.userId} or (${ctx.caps.has("properties.write_all")} and ${!own}))
      order by v.starts_at limit 6`;
    const mandates = await tx`
      select p.id, p.reference, p.street, p.house_number, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en, ((p.mandate->>'end')::date - current_date) as days
      from public.properties p left join public.geo_places g on g.id = p.city_id
      where p.mandate->>'type' = 'exclusive' and p.status in ('active','under_offer') and p.deleted_at is null and (p.mandate->>'end')::date between current_date and current_date + 30 ${pOwn}
      order by (p.mandate->>'end')::date limit 6`;
    const fresh = await tx`
      select p.id, p.reference, p.street, p.rooms, p.price, p.currency, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en,
        (select count(*) from public.match_contacts_for_property(p.id)) as n, (select max(score) from public.match_contacts_for_property(p.id)) as best,
        (select pm.thumb_path from public.property_media pm where pm.property_id = p.id and pm.kind = 'photo' order by pm.is_cover desc, pm.position limit 1) as cover_thumb
      from public.properties p left join public.geo_places g on g.id = p.city_id
      where p.status = 'active' and p.deleted_at is null and p.created_at > now() - interval '45 days' ${pOwn} order by p.created_at desc limit 12`;
    const dOwn = own ? tx`and d.agent_id = ${ctx.userId}` : tx``;
    const kpi = await tx`
      select (select count(*) from public.properties p where p.status = 'active' and p.deleted_at is null ${pOwn}) as active_props,
             (select count(*) from public.properties p where p.deleted_at is null and p.created_at >= date_trunc('month', now()) ${pOwn}) as props_month,
             (select count(*) from public.contacts c where c.deleted_at is null ${own ? tx`and c.owner_id = ${ctx.userId}` : tx``}) as contacts,
             (select count(*) from public.contacts c where c.deleted_at is null and c.created_at >= date_trunc('month', now()) ${own ? tx`and c.owner_id = ${ctx.userId}` : tx``}) as contacts_month,
             (select count(*) from public.deals d join public.pipeline_stages s on s.id = d.stage_id where s.kind = 'open' and d.deleted_at is null ${dOwn}) as open_deals,
             (select count(*) from public.deals d join public.pipeline_stages s on s.id = d.stage_id where s.kind = 'open' and d.deleted_at is null and d.updated_at < now() - interval '7 days' ${dOwn}) as stale_deals,
             (select coalesce(sum(d.value * s.probability / 100.0), 0) from public.deals d join public.pipeline_stages s on s.id = d.stage_id where s.kind = 'open' and d.deleted_at is null ${dOwn}) as weighted,
             (select coalesce(sum(d.value), 0) from public.deals d join public.pipeline_stages s on s.id = d.stage_id where s.kind = 'won' and d.deleted_at is null and d.closed_at > now() - interval '30 days' ${dOwn}) as won_30`;
    return {
      tasks: tasks as unknown as Record<string, any>[], visits: visits as unknown as Record<string, any>[], mandates: mandates as unknown as Record<string, any>[],
      newMatches: (fresh as unknown as Record<string, any>[]).filter((r) => Number(r.n) > 0).slice(0, 4), kpi: kpi[0] as Record<string, any>,
    };
  });
}

export async function toggleTask(ctx: Ctx, id: string, done: boolean) {
  return db(ctx, async (tx) => (await tx`update public.tasks set done_at = ${done ? tx`now()` : null} where id = ${id} returning id`).length > 0);
}
export async function createTask(ctx: Ctx, title: string, dueAt: string | null, contactId: string | null, extra: { propertyId?: string | null; assigneeId?: string | null; dealId?: string | null } = {}) {
  return db(ctx, async (tx) => {
    // Assigner à un collègue : réservé aux droits « tous les contacts » (gérant/admin) ; sinon la tâche reste à soi.
    const assignee = extra.assigneeId && ctx.caps.has("contacts.write_all") ? extra.assigneeId : ctx.userId;
    const [r] = await tx`insert into public.tasks (organization_id, title, due_at, contact_id, property_id, deal_id, assignee_id)
      values (${ctx.orgId}, ${title}, ${dueAt}, ${contactId}, ${extra.propertyId ?? null}, ${extra.dealId ?? null}, ${assignee}) returning id`;
    return (r?.id as string | undefined) ?? null;
  });
}

export type TaskRow = { id: string; title: string; due_at: Date | null; done_at: Date | null; overdue: boolean; contact_id: string | null; first_name: string | null; last_name: string | null; first_name_he: string | null; last_name_he: string | null;
  property_id: string | null; reference: string | null; street: string | null; assignee_id: string | null; assignee_name: string | null };

/** Liste des tâches : « mine » = les miennes ; « all » = toute l'agence (selon la RLS). done = terminées des 30 derniers jours. */
export async function listTasks(ctx: Ctx, o: { scope: "mine" | "all"; done: boolean }) {
  return db(ctx, async (tx) => (await tx`
    select t.id, t.title, t.due_at, t.done_at, (t.done_at is null and t.due_at < now()) as overdue, t.contact_id, c.first_name, c.last_name, c.first_name_he, c.last_name_he,
      t.property_id, p.reference, p.street, t.assignee_id, a.full_name as assignee_name
    from public.tasks t left join public.contacts c on c.id = t.contact_id left join public.properties p on p.id = t.property_id left join public.profiles a on a.id = t.assignee_id
    where ${o.scope === "mine" ? tx`t.assignee_id = ${ctx.userId}` : tx`true`}
      and ${o.done ? tx`t.done_at > now() - interval '30 days'` : tx`t.done_at is null`}
    order by ${o.done ? tx`t.done_at desc` : tx`t.due_at asc nulls last, t.created_at desc`} limit 200`) as unknown as TaskRow[]);
}

export async function deleteTask(ctx: Ctx, id: string) {
  return db(ctx, async (tx) => (await tx`delete from public.tasks where id = ${id} returning id`).length > 0);
}

export async function getOnboarding(ctx: Ctx) {
  if (!ctx.caps.has("org.manage") && !ctx.caps.has("brand.manage")) return null;
  const [r] = await db(ctx, (tx) => tx`select
    (select version > 1 or logo_light_path is not null or source_url is not null or coalesce(legal_footer->>'fr', legal_footer->>'he', legal_footer->>'en', '') <> ''
       from public.brand_kits where organization_id = ${ctx.orgId}) as brand,
    (select count(*) from public.memberships where organization_id = ${ctx.orgId} and status = 'active')::int > 1 as team,
    (select count(*) from public.properties where deleted_at is null)::int > 0 as property,
    (select count(*) from public.property_media)::int > 0 as photo,
    (select count(*) from public.contacts where deleted_at is null)::int > 0 as contact`);
  const steps = [{ key: "brand", done: !!r!.brand, href: "/settings/brand" }, { key: "team", done: !!r!.team, href: "/settings/team" }, { key: "property", done: !!r!.property, href: "/properties/new" }, { key: "photo", done: !!r!.photo, href: "/properties" }, { key: "contact", done: !!r!.contact, href: "/clients/new" }];
  return steps.every((s) => s.done) ? null : steps;
}
