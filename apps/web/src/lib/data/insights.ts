import "server-only";
import { db, type Ctx } from "../session";

type Row = Record<string, any>;

/** Fiche bien V2 : diffusion (envois, ouvertures, visites, affaires) et fil d'activité regroupé. */
export async function getPropertyInsights(ctx: Ctx, id: string, days = 30) {
  return db(ctx, async (tx) => {
    const [k] = await tx`select
        (select count(*) from public.shares s where ${id}::uuid = any(s.property_ids) and s.created_at > now() - make_interval(days => ${days}))::int as sent,
        (select count(*) from public.shares s where ${id}::uuid = any(s.property_ids) and s.opened_at > now() - make_interval(days => ${days}))::int as opened,
        (select count(*) from public.visits v where v.property_id = ${id} and v.status <> 'cancelled' and v.starts_at > now() - make_interval(days => ${days}))::int as visits,
        (select count(*) from public.deals d join public.pipeline_stages st on st.id = d.stage_id where d.property_id = ${id} and d.deleted_at is null and st.kind = 'open' and st.probability >= 60)::int as offers,
        (select count(*) from public.shares s where ${id}::uuid = any(s.property_ids))::int as sent_all,
        (select count(*) from public.visits v where v.property_id = ${id} and v.status <> 'cancelled')::int as visits_all`;
    const timeline = (await tx`
      select * from (
        select 'visit' as kind, v.id::text as id, v.starts_at as at, v.status as detail, c.id as contact_id, c.first_name, c.last_name, c.first_name_he, c.last_name_he, u.full_name as actor
          from public.visits v left join public.contacts c on c.id = v.contact_id left join public.profiles u on u.id = v.agent_id where v.property_id = ${id}
        union all
        select 'share', s.id::text, s.created_at, s.channel || case when s.opened_at is not null then ':opened' else '' end, c.id, c.first_name, c.last_name, c.first_name_he, c.last_name_he, u.full_name
          from public.shares s join public.contacts c on c.id = s.contact_id left join public.profiles u on u.id = s.sender_id where ${id}::uuid = any(s.property_ids)
        union all
        select a.kind, a.id::text, a.occurred_at, a.summary, a.contact_id, c.first_name, c.last_name, c.first_name_he, c.last_name_he, u.full_name
          from public.activities a left join public.contacts c on c.id = a.contact_id left join public.profiles u on u.id = a.actor_id where a.property_id = ${id}
        union all
        select 'deal', d.id::text, d.created_at, st.name->>'fr', c.id, c.first_name, c.last_name, c.first_name_he, c.last_name_he, u.full_name
          from public.deals d join public.pipeline_stages st on st.id = d.stage_id join public.contacts c on c.id = d.contact_id left join public.profiles u on u.id = d.agent_id where d.property_id = ${id} and d.deleted_at is null
      ) x order by at desc limit 30`) as unknown as Row[];
    const shared = (await tx`select distinct on (s.contact_id) s.contact_id, s.opened_at, s.created_at from public.shares s where ${id}::uuid = any(s.property_ids) order by s.contact_id, s.created_at desc`) as unknown as Row[];
    const [cmp] = await tx`select percentile_cont(0.5) within group (order by p2.price / nullif(p2.area_built, 0))::float as med, count(*)::int as n
      from public.properties p join public.properties p2 on p2.city_id = p.city_id and p2.transaction = p.transaction and p2.id <> p.id and p2.deleted_at is null and p2.price > 0 and p2.area_built > 0
      where p.id = ${id}`;
    return { k: k as Row, timeline, shared, median: cmp && cmp.n >= 3 ? Number(cmp.med) : null, medianN: Number(cmp?.n ?? 0) };
  });
}

/** Fiche client V2 : biens de ses sélections (avec ouverture), visites, température et étape de l'affaire ouverte. */
export async function getContactInsights(ctx: Ctx, id: string) {
  return db(ctx, async (tx) => {
    const selection = (await tx`
      select distinct on (p.id) p.id, p.reference, p.street, p.price, p.currency, p.rooms, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en, s.created_at as sent_at, s.opened_at,
        (select pm.thumb_path from public.property_media pm where pm.property_id = p.id and pm.kind = 'photo' order by pm.is_cover desc, pm.position limit 1) as cover_thumb,
        (select v.starts_at from public.visits v where v.property_id = p.id and v.contact_id = ${id} and v.status <> 'cancelled' order by v.starts_at desc limit 1) as visit_at
      from public.shares s join public.properties p on p.id = any(s.property_ids) and p.deleted_at is null left join public.geo_places g on g.id = p.city_id
      where s.contact_id = ${id} order by p.id, s.created_at desc`) as unknown as Row[];
    const visits = (await tx`select v.id, v.starts_at, v.status, v.property_id, p.street, p.reference, u.full_name as actor from public.visits v join public.properties p on p.id = v.property_id left join public.profiles u on u.id = v.agent_id
      where v.contact_id = ${id} order by v.starts_at desc limit 10`) as unknown as Row[];
    const [heat] = await tx`select greatest(
        (select max(a.occurred_at) from public.activities a where a.contact_id = ${id}),
        (select max(s.opened_at) from public.shares s where s.contact_id = ${id}),
        (select max(v.starts_at) from public.visits v where v.contact_id = ${id} and v.starts_at <= now())) as last,
      (select max(s.opened_at) from public.shares s where s.contact_id = ${id}) as opened`;
    const [deal] = await tx`select d.id, d.value, d.currency, st.name as stage, st.position, (select count(*) from public.pipeline_stages x where x.kind = 'open')::int as total,
        (select count(*) from public.pipeline_stages x where x.kind = 'open' and x.position <= st.position)::int as idx, extract(day from now() - d.updated_at)::int as days, public.deal_fee_pct(d.commission_pct, d.property_id, d.contact_id)::float as fee_pct
      from public.deals d join public.pipeline_stages st on st.id = d.stage_id where d.contact_id = ${id} and d.deleted_at is null and st.kind = 'open' order by d.updated_at desc limit 1`;
    return { selection: selection.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()).slice(0, 6), visits, last: (heat?.last as Date | null) ?? null, opened: (heat?.opened as Date | null) ?? null, deal: (deal as Row | undefined) ?? null };
  });
}
