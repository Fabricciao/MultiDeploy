import "server-only";
import { db, seesAllStats, type Ctx } from "../session";

export const PERIODS = [30, 90, 180] as const;

/** Rapports : le gérant voit l'agence entière (ou un agent), l'agent ne voit que ses propres chiffres. */
export async function getReports(ctx: Ctx, o: { days: number; agent?: string | null } = { days: 90 }) {
  const all = seesAllStats(ctx);
  const who = all ? o.agent ?? null : ctx.userId;
  const days = (PERIODS as readonly number[]).includes(o.days) ? o.days : 90;
  return db(ctx, async (tx) => {
    const dW = who ? tx`and d.agent_id = ${who}` : tx``;
    const pW = who ? tx`and p.agent_id = ${who}` : tx``;
    const cW = who ? tx`and c.owner_id = ${who}` : tx``;
    const since = tx`now() - make_interval(days => ${days})`;
    const funnel = await tx`select s.id, s.name, s.position, s.kind, count(d.id)::int as n, coalesce(sum(d.value), 0)::float as value from public.pipeline_stages s left join public.deals d on d.stage_id = s.id and d.deleted_at is null ${dW} group by s.id order by s.position`;
    const sources = await tx`select coalesce(ls.name, '{"fr":"—","he":"—","en":"—"}'::jsonb) as name, count(*)::int as n from public.contacts c left join public.lead_sources ls on ls.id = c.source_id where c.deleted_at is null and c.created_at > ${since} ${cW} group by 1 order by 2 desc limit 8`;
    const status = await tx`select p.status::text, count(*)::int as n from public.properties p where p.deleted_at is null ${pW} group by 1 order by 2 desc`;
    const agents = await tx`select u.id, u.full_name,
        (select count(*) from public.properties p where p.agent_id = u.id and p.status = 'active' and p.deleted_at is null)::int as props,
        (select count(*) from public.contacts c where c.owner_id = u.id and c.deleted_at is null)::int as contacts,
        (select count(*) from public.deals d join public.pipeline_stages s on s.id = d.stage_id where d.agent_id = u.id and s.kind = 'open' and d.deleted_at is null)::int as open_deals,
        (select count(*) from public.deals d join public.pipeline_stages s on s.id = d.stage_id where d.agent_id = u.id and s.kind = 'won' and d.deleted_at is null and d.closed_at > ${since})::int as won_n,
        (select coalesce(sum(d.value), 0) from public.deals d join public.pipeline_stages s on s.id = d.stage_id where d.agent_id = u.id and s.kind = 'won' and d.deleted_at is null and d.closed_at > ${since})::float as won_value,
        (select count(*) from public.visits v where v.agent_id = u.id and v.status = 'done' and v.starts_at > ${since})::int as visits
      from public.profiles u join public.memberships m on m.user_id = u.id and m.organization_id = ${ctx.orgId} and m.status = 'active'
      where ${all ? tx`true` : tx`u.id = ${ctx.userId}`} order by 7 desc, 3 desc, 2`;
    const age = await tx`select width_bucket(extract(day from now() - p.published_at), array[15, 30, 60, 90])::int as b, count(*)::int as n from public.properties p where p.status = 'active' and p.deleted_at is null and p.published_at is not null ${pW} group by 1 order by 1`;
    const [k] = await tx`select
        (select coalesce(sum(d.value * coalesce(d.commission_pct, 2) / 100.0), 0) from public.deals d join public.pipeline_stages s on s.id = d.stage_id where s.kind = 'won' and d.deleted_at is null and d.closed_at > ${since} ${dW})::float as commissions,
        (select count(*) from public.deals d join public.pipeline_stages s on s.id = d.stage_id where s.kind = 'won' and d.deleted_at is null and d.closed_at > ${since} ${dW})::int as won,
        (select count(*) from public.deals d join public.pipeline_stages s on s.id = d.stage_id where s.kind in ('won','lost') and d.deleted_at is null and d.closed_at > ${since} ${dW})::int as closed,
        (select avg(extract(day from now() - p.published_at)) from public.properties p where p.status = 'active' and p.deleted_at is null and p.published_at is not null ${pW})::float as avg_age,
        (select avg(extract(epoch from (select min(v.starts_at) from public.visits v where v.contact_id = c.id) - c.created_at) / 86400) from public.contacts c where c.deleted_at is null and c.created_at > ${since} ${cW})::float as lead_to_visit`;
    const mandates = await tx`select p.id, p.reference, p.street, ag.full_name as agent_name, ((p.mandate->>'end')::date - current_date) as days,
        (select t.title from public.property_translations t where t.property_id = p.id order by (t.locale = ${ctx.locale}) desc limit 1) as title
      from public.properties p left join public.profiles ag on ag.id = p.agent_id
      where p.deleted_at is null and p.status in ('active','under_offer') and p.mandate->>'type' = 'exclusive' and (p.mandate->>'end')::date between current_date and current_date + 45 ${pW}
      order by (p.mandate->>'end')::date limit 6`;
    const monthly = (await tx`
      select to_char(m, 'YYYY-MM') as k, coalesce(sum(d.value * coalesce(d.commission_pct, 2) / 100.0), 0)::float as v, count(d.id)::int as n
      from generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') m
      left join (select d.* from public.deals d join public.pipeline_stages s on s.id = d.stage_id where s.kind = 'won' and d.deleted_at is null ${dW}) d on date_trunc('month', d.closed_at) = m
      group by m order by m`) as unknown as { k: string; v: number; n: number }[];
    const sourceRoi = (await tx`
      select coalesce(ls.name, '{"fr":"—","he":"—","en":"—"}'::jsonb) as name, count(distinct c.id)::int as leads,
        count(distinct d.id) filter (where s.kind = 'won')::int as won,
        coalesce(sum(d.value * coalesce(d.commission_pct, 2) / 100.0) filter (where s.kind = 'won'), 0)::float as fees
      from public.contacts c left join public.lead_sources ls on ls.id = c.source_id
      left join public.deals d on d.contact_id = c.id and d.deleted_at is null left join public.pipeline_stages s on s.id = d.stage_id
      where c.deleted_at is null and c.created_at > ${since} ${cW} group by 1 order by 2 desc limit 8`) as unknown as { name: Record<string, string>; leads: number; won: number; fees: number }[];
    const cityDelay = (await tx`
      select g.name_fr, g.name_he, g.name_en, percentile_cont(0.5) within group (order by extract(day from d.closed_at - coalesce(p.published_at, p.created_at)))::float as days, count(*)::int as n
      from public.deals d join public.pipeline_stages s on s.id = d.stage_id join public.properties p on p.id = d.property_id join public.geo_places g on g.id = p.city_id
      where s.kind = 'won' and d.deleted_at is null and d.closed_at is not null ${dW} group by g.id order by 4 limit 8`) as unknown as { name_fr: string; name_he: string; name_en: string; days: number; n: number }[];
    return { monthly, sourceRoi, cityDelay, all, days, agent: who, kpi: k as Record<string, any>, mandates: mandates as unknown as Record<string, any>[],
      funnel: funnel as unknown as Record<string, any>[], sources: sources as unknown as Record<string, any>[], status: status as unknown as { status: string; n: number }[], agents: agents as unknown as Record<string, any>[], age: age as unknown as { b: number; n: number }[] };
  });
}
