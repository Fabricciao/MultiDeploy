import "server-only";
import { db, type Ctx } from "../session";

export type VisitRow = { id: string; starts_at: Date; ends_at: Date | null; status: string; property_id: string; reference: string; street: string | null; city_fr: string | null; city_he: string | null; city_en: string | null; title: string | null; contact_id: string | null; first_name: string | null; last_name: string | null; first_name_he: string | null; last_name_he: string | null; agent_id: string | null; agent_name: string | null; signed_at: Date | null; document_path: string | null; signer_name: string | null };

export async function listVisits(ctx: Ctx, from: Date, to: Date) {
  return (await db(ctx, (tx) => tx`
    select v.id, v.starts_at, v.ends_at, v.status, v.property_id, p.reference, p.street, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en,
      (select t.title from public.property_translations t where t.property_id = p.id order by (t.locale = ${ctx.locale}) desc limit 1) as title,
      v.contact_id, c.first_name, c.last_name, c.first_name_he, c.last_name_he, v.agent_id, a.full_name as agent_name, v.signed_at, v.document_path, v.signer_name
    from public.visits v join public.properties p on p.id = v.property_id left join public.geo_places g on g.id = p.city_id left join public.contacts c on c.id = v.contact_id left join public.profiles a on a.id = v.agent_id
    where v.starts_at >= ${from} and v.starts_at < ${to} order by v.starts_at`)) as unknown as VisitRow[];
}

export type VisitError = "forbidden" | "conflict" | "invalid" | "past";
export async function createVisit(ctx: Ctx, i: { propertyId: string; contactId: string | null; startsAt: Date; minutes: number }): Promise<{ id?: string; error?: VisitError }> {
  if (!ctx.caps.has("properties.write")) return { error: "forbidden" };
  if (Number.isNaN(i.startsAt.getTime()) || i.minutes < 15 || i.minutes > 240) return { error: "invalid" };
  const ends = new Date(i.startsAt.getTime() + i.minutes * 60_000);
  return db(ctx, async (tx) => {
    const [clash] = await tx`select 1 from public.visits where agent_id = ${ctx.userId} and status = 'planned' and tstzrange(starts_at, coalesce(ends_at, starts_at + interval '30 minutes')) && tstzrange(${i.startsAt}, ${ends})`;
    if (clash) return { error: "conflict" as const };
    const [p] = await tx`select 1 from public.properties where id = ${i.propertyId} and deleted_at is null`;
    if (!p) return { error: "invalid" as const };
    const [r] = await tx`insert into public.visits (organization_id, property_id, contact_id, agent_id, starts_at, ends_at) values (${ctx.orgId}, ${i.propertyId}, ${i.contactId}, ${ctx.userId}, ${i.startsAt}, ${ends}) returning id`;
    if (i.contactId) await tx`insert into public.activities (organization_id, kind, contact_id, property_id, summary) values (${ctx.orgId}, 'visit', ${i.contactId}, ${i.propertyId}, 'visit_planned')`;
    return { id: r!.id as string };
  });
}
export async function setVisitStatus(ctx: Ctx, id: string, status: "planned" | "done" | "cancelled" | "no_show") {
  return db(ctx, async (tx) => (await tx`update public.visits set status = ${status} where id = ${id} and (agent_id = ${ctx.userId} or ${ctx.caps.has("properties.write_all")}) returning id`).length > 0);
}
