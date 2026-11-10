import "server-only";
import { db, seesAllProperties, type Ctx } from "../session";

type Row = Record<string, any>;

/**
 * V2 « Aujourd'hui » : séries des indicateurs, priorités calculées par règles (aucune IA), journée, fil de l'agence.
 * Tout passe par la RLS de l'utilisateur ; `own` limite aux biens, clients et affaires de l'utilisateur.
 */
export async function getCockpit(ctx: Ctx, mine: boolean) {
  const own = mine || !seesAllProperties(ctx);
  return db(ctx, async (tx) => {
    const dOwn = own ? tx`and d.agent_id = ${ctx.userId}` : tx``;
    const pOwn = own ? tx`and p.agent_id = ${ctx.userId}` : tx``;
    const cOwn = own ? tx`and c.owner_id = ${ctx.userId}` : tx``;
    // Commissions encaissées (affaires conclues) par mois, sur 6 mois, mois courant inclus.
    const months = (await tx`
      select to_char(m, 'YYYY-MM') as k, coalesce(sum(d.value * public.deal_fee_pct(d.commission_pct, d.property_id, d.contact_id) / 100.0), 0)::float as v
      from generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') m
      left join (select d.* from public.deals d join public.pipeline_stages s on s.id = d.stage_id where s.kind = 'won' and d.deleted_at is null ${dOwn}) d on date_trunc('month', d.closed_at) = m
      group by m order by m`) as unknown as { k: string; v: number }[];
    // Nouveaux clients par jour sur 7 jours, et la semaine d'avant pour comparer.
    const leads = (await tx`
      select coalesce(count(c.id), 0)::int as v from generate_series(current_date - 6, current_date, interval '1 day') g
      left join public.contacts c on c.deleted_at is null and c.created_at::date = g::date ${cOwn} group by g order by g`) as unknown as { v: number }[];
    const [prev] = await tx`select count(*)::int as n from public.contacts c where c.deleted_at is null and c.created_at >= current_date - 13 and c.created_at < current_date - 6 ${cOwn}`;
    const stages = (await tx`select s.id, s.name, s.position, s.probability, count(d.id)::int as n, coalesce(sum(d.value), 0)::float as value,
        coalesce(sum(d.value * public.deal_fee_pct(d.commission_pct, d.property_id, d.contact_id) / 100.0), 0)::float as fee
      from public.pipeline_stages s left join public.deals d on d.stage_id = s.id and d.deleted_at is null ${dOwn}
      where s.kind = 'open' group by s.id order by s.position`) as unknown as Row[];

    // Priorités : retards, mandats, offres sans réponse, clients qui viennent d'ouvrir une sélection, biens sans visite.
    const overdue = (await tx`select t.id, t.title, t.due_at, t.contact_id, c.first_name, c.last_name, c.first_name_he, c.last_name_he
      from public.tasks t left join public.contacts c on c.id = t.contact_id
      where t.assignee_id = ${ctx.userId} and t.done_at is null and t.due_at < now() - interval '1 hour' order by t.due_at limit 3`) as unknown as Row[];
    const mandates = (await tx`select p.id, p.reference, p.street, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en, ((p.mandate->>'end')::date - current_date) as days
      from public.properties p left join public.geo_places g on g.id = p.city_id
      where p.mandate->>'type' = 'exclusive' and p.status in ('active','under_offer') and p.deleted_at is null and (p.mandate->>'end')::date between current_date and current_date + 14 ${pOwn}
      order by (p.mandate->>'end')::date limit 2`) as unknown as Row[];
    const stale = (await tx`select d.id, d.value, d.updated_at, s.name as stage, c.id as contact_id, c.first_name, c.last_name, c.first_name_he, c.last_name_he, extract(day from now() - d.updated_at)::int as days
      from public.deals d join public.pipeline_stages s on s.id = d.stage_id join public.contacts c on c.id = d.contact_id
      where s.kind = 'open' and s.probability >= 50 and d.deleted_at is null and d.updated_at < now() - interval '5 days' ${dOwn} order by d.updated_at limit 2`) as unknown as Row[];
    const opened = (await tx`select distinct on (c.id) c.id as contact_id, c.first_name, c.last_name, c.first_name_he, c.last_name_he, c.phones, s.opened_at, cardinality(s.property_ids) as n
      from public.shares s join public.contacts c on c.id = s.contact_id
      where s.opened_at > now() - interval '3 days' and (s.sender_id = ${ctx.userId} or ${!own}) and c.deleted_at is null order by c.id, s.opened_at desc limit 3`) as unknown as Row[];
    const cold = (await tx`select p.id, p.reference, p.street, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en, extract(day from now() - coalesce(p.published_at, p.created_at))::int as days
      from public.properties p left join public.geo_places g on g.id = p.city_id
      where p.status = 'active' and p.deleted_at is null and coalesce(p.published_at, p.created_at) < now() - interval '45 days'
        and not exists (select 1 from public.visits v where v.property_id = p.id and v.starts_at > now() - interval '45 days') ${pOwn}
      order by coalesce(p.published_at, p.created_at) limit 2`) as unknown as Row[];

    // Journée : visites d'aujourd'hui (heure de Jérusalem).
    const day = (await tx`
      select v.id, v.starts_at, v.status, v.property_id, p.reference, p.street, p.house_number, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en,
        c.id as contact_id, c.first_name, c.last_name, c.first_name_he, c.last_name_he, c.phones,
        (select pm.thumb_path from public.property_media pm where pm.property_id = p.id and pm.kind = 'photo' order by pm.is_cover desc, pm.position limit 1) as cover_thumb
      from public.visits v join public.properties p on p.id = v.property_id left join public.geo_places g on g.id = p.city_id left join public.contacts c on c.id = v.contact_id
      where v.status <> 'cancelled' and v.starts_at >= (date_trunc('day', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem')
        and v.starts_at < (date_trunc('day', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem') + interval '1 day'
        and (v.agent_id = ${ctx.userId} or ${!own}) order by v.starts_at limit 8`) as unknown as Row[];

    // Fil de l'agence : dernières activités (notes, étapes, visites, envois).
    const feed = (await tx`select a.id, a.kind, a.summary, a.occurred_at, a.contact_id, c.first_name, c.last_name, c.first_name_he, c.last_name_he, u.full_name as actor_name
      from public.activities a left join public.contacts c on c.id = a.contact_id left join public.profiles u on u.id = a.actor_id
      where a.occurred_at > now() - interval '14 days' ${own ? tx`and (a.actor_id = ${ctx.userId} or c.owner_id = ${ctx.userId})` : tx``}
      order by a.occurred_at desc limit 6`) as unknown as Row[];

    return { months, leads: leads.map((l) => l.v), leadsPrev: Number(prev?.n ?? 0), stages, overdue, mandates, stale, opened, cold, day, feed };
  });
}

export type Notif = { id: string; kind: "lead" | "opened" | "task" | "mandate" | "stage" | "visit"; at: string; name?: string; extra?: string; href: string };

/** Cloche : événements des 7 derniers jours qui concernent l'utilisateur. Le « lu » est un horodatage gardé dans un cookie. */
export async function getNotifications(ctx: Ctx): Promise<Notif[]> {
  return db(ctx, async (tx) => {
    const name = (r: Row) => [r.first_name ?? r.first_name_he, r.last_name ?? r.last_name_he].filter(Boolean).join(" ");
    const leads = (await tx`select c.id, c.first_name, c.last_name, c.first_name_he, c.last_name_he, c.created_at as at from public.contacts c
      where c.deleted_at is null and c.owner_id = ${ctx.userId} and c.created_by is distinct from ${ctx.userId} and c.created_at > now() - interval '7 days' order by c.created_at desc limit 8`) as unknown as Row[];
    const opened = (await tx`select s.id, s.contact_id, c.first_name, c.last_name, c.first_name_he, c.last_name_he, s.opened_at as at, cardinality(s.property_ids) as n from public.shares s join public.contacts c on c.id = s.contact_id
      where s.sender_id = ${ctx.userId} and s.opened_at > now() - interval '7 days' order by s.opened_at desc limit 8`) as unknown as Row[];
    const tasks = (await tx`select t.id, t.title, t.created_at as at from public.tasks t where t.assignee_id = ${ctx.userId} and t.created_by is distinct from ${ctx.userId} and t.done_at is null and t.created_at > now() - interval '7 days' order by t.created_at desc limit 8`) as unknown as Row[];
    const mandates = (await tx`select p.id, p.reference, p.street, ((p.mandate->>'end')::date - current_date) as days, now() as at from public.properties p
      where p.agent_id = ${ctx.userId} and p.mandate->>'type' = 'exclusive' and p.status in ('active','under_offer') and p.deleted_at is null and (p.mandate->>'end')::date between current_date and current_date + 10 limit 4`) as unknown as Row[];
    const acts = (await tx`select a.id, a.kind, a.contact_id, a.occurred_at as at, c.first_name, c.last_name, c.first_name_he, c.last_name_he, u.full_name as actor from public.activities a
      join public.contacts c on c.id = a.contact_id left join public.profiles u on u.id = a.actor_id
      where c.owner_id = ${ctx.userId} and a.actor_id is distinct from ${ctx.userId} and a.kind in ('stage_change','visit') and a.occurred_at > now() - interval '7 days' order by a.occurred_at desc limit 8`) as unknown as Row[];
    const iso = (d: unknown) => new Date(d as string).toISOString();
    const all: Notif[] = [
      ...leads.map((r) => ({ id: `l${r.id}`, kind: "lead" as const, at: iso(r.at), name: name(r), href: `/clients/${r.id}` })),
      ...opened.map((r) => ({ id: `o${r.id}`, kind: "opened" as const, at: iso(r.at), name: name(r), extra: String(r.n), href: `/clients/${r.contact_id}` })),
      ...tasks.map((r) => ({ id: `t${r.id}`, kind: "task" as const, at: iso(r.at), name: r.title as string, href: "/tasks" })),
      ...mandates.map((r) => ({ id: `m${r.id}`, kind: "mandate" as const, at: iso(r.at), name: (r.street as string) ?? (r.reference as string), extra: String(r.days), href: `/properties/${r.id}` })),
      ...acts.map((r) => ({ id: `a${r.id}`, kind: (r.kind === "visit" ? "visit" : "stage") as Notif["kind"], at: iso(r.at), name: name(r), extra: (r.actor as string) ?? "", href: `/clients/${r.contact_id}` })),
    ];
    return all.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 15);
  });
}
