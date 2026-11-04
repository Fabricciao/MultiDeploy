import { db, type Ctx } from "../session";
import type { Names } from "./types";

export type Stage = { id: string; name: Names; position: number; kind: "open" | "won" | "lost"; probability: number };
export type DealCard = { id: string; stage_id: string; value: string | null; currency: string; contact_id: string; first_name: string | null; last_name: string | null; first_name_he: string | null; last_name_he: string | null;
  property_id: string | null; reference: string | null; street: string | null; city_fr: string | null; city_he: string | null; city_en: string | null; agent_id: string | null; agent_name: string | null; expected_close: string | null; position: string };

export async function getBoard(ctx: Ctx) {
  return db(ctx, async (tx) => {
    const stages = (await tx`select id, name, position, kind, probability from public.pipeline_stages order by position`) as unknown as Stage[];
    const deals = (await tx`
      select d.id, d.stage_id, d.value, d.currency, d.contact_id, c.first_name, c.last_name, c.first_name_he, c.last_name_he, d.property_id, p.reference, p.street,
        g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en, d.agent_id, a.full_name as agent_name, d.expected_close, d.position
      from public.deals d join public.contacts c on c.id = d.contact_id left join public.properties p on p.id = d.property_id
      left join public.geo_places g on g.id = p.city_id left join public.profiles a on a.id = d.agent_id
      where d.deleted_at is null order by d.position, d.created_at`) as unknown as DealCard[];
    return { stages, deals };
  });
}

export async function moveDeal(ctx: Ctx, dealId: string, stageId: string) {
  return db(ctx, async (tx) => {
    const [st] = await tx`select id, kind from public.pipeline_stages where id = ${stageId}`;
    if (!st) return false;
    const rows = await tx`
      update public.deals set stage_id = ${stageId}, closed_at = ${st.kind === "open" ? null : tx`now()`},
        position = coalesce((select max(position) from public.deals where stage_id = ${stageId}), 0) + 1
      where id = ${dealId} returning id, contact_id`;
    if (!rows.length) return false;
    await tx`insert into public.activities (organization_id, kind, contact_id, summary, payload) values (${ctx.orgId}, 'stage_change', ${rows[0]!.contact_id}, 'stage_change', ${tx.json({ stage_id: stageId })})`;
    return true;
  });
}

export async function createDeal(ctx: Ctx, contactId: string, propertyId: string | null, value: number | null) {
  return db(ctx, async (tx) => {
    const [first] = await tx`select id from public.pipeline_stages where kind = 'open' order by position limit 1`;
    if (!first) return null;
    const [row] = await tx`insert into public.deals (organization_id, contact_id, property_id, stage_id, value, commission_pct, position)
      values (${ctx.orgId}, ${contactId}, ${propertyId}, ${first.id}, ${value}, 2, coalesce((select max(position) from public.deals where stage_id = ${first.id}), 0) + 1) returning id`;
    return row!.id as string;
  });
}
