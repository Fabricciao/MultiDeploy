import { db, type Ctx } from "../session";

export async function getToday(ctx: Ctx) {
  return db(ctx, async (tx) => {
    const tasks = await tx`
      select t.id, t.title, t.due_at, t.done_at, t.contact_id, c.first_name, c.last_name, c.first_name_he, c.last_name_he, (t.due_at < date_trunc('day', now())) as overdue
      from public.tasks t left join public.contacts c on c.id = t.contact_id
      where t.assignee_id = ${ctx.userId} and t.done_at is null and t.due_at < date_trunc('day', now()) + interval '1 day'
      order by t.due_at limit 12`;
    const visits = await tx`
      select v.id, v.starts_at, v.property_id, p.reference, p.street, p.house_number, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en,
        c.id as contact_id, c.first_name, c.last_name, c.first_name_he, c.last_name_he
      from public.visits v join public.properties p on p.id = v.property_id left join public.geo_places g on g.id = p.city_id left join public.contacts c on c.id = v.contact_id
      where v.status = 'planned' and v.starts_at >= date_trunc('day', now()) and v.starts_at < date_trunc('day', now()) + interval '7 days' and (v.agent_id = ${ctx.userId} or ${ctx.caps.has("properties.write_all")})
      order by v.starts_at limit 6`;
    const mandates = await tx`
      select p.id, p.reference, p.street, p.house_number, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en, ((p.mandate->>'end')::date - current_date) as days
      from public.properties p left join public.geo_places g on g.id = p.city_id
      where p.mandate->>'type' = 'exclusive' and p.status in ('active','under_offer') and (p.mandate->>'end')::date between current_date and current_date + 30
      order by (p.mandate->>'end')::date limit 6`;
    const fresh = await tx`
      select p.id, p.reference, p.street, p.rooms, p.price, p.currency, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en,
        (select count(*) from public.match_contacts_for_property(p.id)) as n
      from public.properties p left join public.geo_places g on g.id = p.city_id
      where p.status = 'active' and p.deleted_at is null and p.created_at > now() - interval '45 days' order by p.created_at desc limit 12`;
    const kpi = await tx`
      select (select count(*) from public.properties where status = 'active') as active_props,
             (select count(*) from public.contacts where deleted_at is null) as contacts,
             (select count(*) from public.deals d join public.pipeline_stages s on s.id = d.stage_id where s.kind = 'open' and d.deleted_at is null) as open_deals,
             (select coalesce(sum(d.value * s.probability / 100.0), 0) from public.deals d join public.pipeline_stages s on s.id = d.stage_id where s.kind = 'open' and d.deleted_at is null) as weighted`;
    return {
      tasks: tasks as unknown as Record<string, any>[], visits: visits as unknown as Record<string, any>[], mandates: mandates as unknown as Record<string, any>[],
      newMatches: (fresh as unknown as Record<string, any>[]).filter((r) => Number(r.n) > 0).slice(0, 4), kpi: kpi[0] as Record<string, any>,
    };
  });
}

export async function toggleTask(ctx: Ctx, id: string, done: boolean) {
  return db(ctx, async (tx) => (await tx`update public.tasks set done_at = ${done ? tx`now()` : null} where id = ${id} returning id`).length > 0);
}
export async function createTask(ctx: Ctx, title: string, dueAt: string | null, contactId: string | null) {
  return db(ctx, async (tx) => (await tx`insert into public.tasks (organization_id, title, due_at, contact_id) values (${ctx.orgId}, ${title}, ${dueAt}, ${contactId}) returning id`).length > 0);
}
