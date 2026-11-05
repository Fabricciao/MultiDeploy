import "server-only";
import { db, type Ctx } from "../session";

export async function getReports(ctx: Ctx) {
  return db(ctx, async (tx) => {
    const funnel = await tx`select s.id, s.name, s.position, s.kind, count(d.id)::int as n, coalesce(sum(d.value), 0)::float as value from public.pipeline_stages s left join public.deals d on d.stage_id = s.id and d.deleted_at is null group by s.id order by s.position`;
    const sources = await tx`select coalesce(ls.name, '{"fr":"—","he":"—","en":"—"}'::jsonb) as name, count(*)::int as n from public.contacts c left join public.lead_sources ls on ls.id = c.source_id where c.deleted_at is null and c.created_at > now() - interval '90 days' group by 1 order by 2 desc limit 8`;
    const status = await tx`select status::text, count(*)::int as n from public.properties where deleted_at is null group by 1 order by 2 desc`;
    const agents = await tx`select u.id, u.full_name,
        (select count(*) from public.properties p where p.agent_id = u.id and p.status = 'active' and p.deleted_at is null)::int as props,
        (select count(*) from public.contacts c where c.owner_id = u.id and c.deleted_at is null)::int as contacts,
        (select count(*) from public.deals d join public.pipeline_stages s on s.id = d.stage_id where d.agent_id = u.id and s.kind = 'open' and d.deleted_at is null)::int as open_deals,
        (select coalesce(sum(d.value), 0) from public.deals d join public.pipeline_stages s on s.id = d.stage_id where d.agent_id = u.id and s.kind = 'won' and d.deleted_at is null)::float as won_value,
        (select count(*) from public.visits v where v.agent_id = u.id and v.status = 'done' and v.starts_at > now() - interval '30 days')::int as visits_30d
      from public.profiles u join public.memberships m on m.user_id = u.id and m.organization_id = ${ctx.orgId} and m.status = 'active' order by 3 desc, 2 desc`;
    const age = await tx`select width_bucket(extract(day from now() - published_at), array[15, 30, 60, 90])::int as b, count(*)::int as n from public.properties where status = 'active' and deleted_at is null and published_at is not null group by 1 order by 1`;
    return { funnel: funnel as unknown as Record<string, any>[], sources: sources as unknown as Record<string, any>[], status: status as unknown as { status: string; n: number }[], agents: agents as unknown as Record<string, any>[], age: age as unknown as { b: number; n: number }[] };
  });
}
