import "server-only";
import { db, type Ctx } from "../session";
import { storage } from "../storage";
import { visitStage } from "./deals";

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

/* ───────── Compte rendu de visite : note, intérêt, mémo vocal ; l'affaire avance toute seule ───────── */
export type Interest = "offer" | "yes" | "no";
export type Feedback = { rating: number; interest: Interest; note: string | null; audio_path: string | null; at: string; by: string };
export type DebriefInput = { rating: number; interest: Interest; note: string | null; audio: { data: Buffer; ext: "webm" | "m4a" } | null; titles: { followUp: string; otherProps: string } };
export type DebriefResult = { ok: true; moved: boolean } | { ok: false; error: "forbidden" | "invalid" };

export async function saveDebrief(ctx: Ctx, visitId: string, i: DebriefInput): Promise<DebriefResult> {
  if (!ctx.caps.has("properties.write") || ctx.impersonating) return { ok: false, error: "forbidden" };
  if (!Number.isInteger(i.rating) || i.rating < 1 || i.rating > 5 || !["offer", "yes", "no"].includes(i.interest)) return { ok: false, error: "invalid" };
  const [v] = await db(ctx, (tx) => tx`select v.id, v.contact_id, v.property_id, v.status, v.feedback, p.price, p.street, p.reference from public.visits v join public.properties p on p.id = v.property_id
    where v.id = ${visitId} and v.status <> 'cancelled' and v.starts_at <= now() + interval '1 hour' and (v.agent_id = ${ctx.userId} or ${ctx.caps.has("properties.write_all")})`);
  if (!v) return { ok: false, error: "forbidden" };
  let audio_path = (v.feedback as Feedback | null)?.audio_path ?? null;
  if (i.audio) { audio_path = `org/${ctx.orgId}/visit_audio/${visitId}.${i.audio.ext}`; await storage.put(audio_path, i.audio.data, i.audio.ext === "m4a" ? "audio/mp4" : "audio/webm"); }
  const fb: Feedback = { rating: i.rating, interest: i.interest, note: i.note?.slice(0, 2000) || null, audio_path, at: new Date().toISOString(), by: ctx.userId };
  return db(ctx, async (tx) => {
    await tx`update public.visits set feedback = ${tx.json(fb)}, status = case when status = 'planned' then 'done' else status end where id = ${visitId}`;
    if (!v.contact_id) return { ok: true as const, moved: false };
    await tx`insert into public.activities (organization_id, kind, contact_id, property_id, summary, payload) values (${ctx.orgId}, 'visit_feedback', ${v.contact_id}, ${v.property_id}, ${i.interest}, ${tx.json({ visit_id: visitId, rating: i.rating, interest: i.interest })})`;
    let moved = false;
    if (ctx.caps.has("deals.write")) {
      const vs = await visitStage(tx);
      const target = !vs ? undefined : i.interest === "offer"
        ? (await tx`select id, position from public.pipeline_stages where kind = 'open' and position > ${vs.position} order by position limit 1`)[0] as { id: string; position: number } | undefined
        : i.interest === "yes" ? vs : undefined;
      if (target) {
        const [d] = await tx`select d.id, s.position from public.deals d join public.pipeline_stages s on s.id = d.stage_id where d.contact_id = ${v.contact_id} and d.deleted_at is null and s.kind = 'open'
          order by (d.property_id = ${v.property_id}) desc nulls last, d.updated_at desc limit 1`;
        if (!d) {
          await tx`insert into public.deals (organization_id, contact_id, property_id, stage_id, value, position) values (${ctx.orgId}, ${v.contact_id}, ${v.property_id}, ${target.id}, ${v.price ?? null}, coalesce((select max(position) from public.deals where stage_id = ${target.id}), 0) + 1)`;
          moved = true;
        } else if (Number(d.position) < target.position) {
          await tx`update public.deals set stage_id = ${target.id}, property_id = coalesce(property_id, ${v.property_id}), position = coalesce((select max(position) from public.deals where stage_id = ${target.id}), 0) + 1 where id = ${d.id}`;
          moved = true;
        }
        if (moved) await tx`insert into public.activities (organization_id, kind, contact_id, summary, payload) values (${ctx.orgId}, 'stage_change', ${v.contact_id}, 'stage_change', ${tx.json({ stage_id: target.id, auto: "debrief" })})`;
      }
    }
    // Relance : intéressé → rappeler sous 2 jours ; pas intéressé → proposer d'autres biens demain.
    if (i.interest !== "offer") {
      const title = i.interest === "yes" ? i.titles.followUp : i.titles.otherProps;
      await tx`insert into public.tasks (organization_id, title, due_at, assignee_id, contact_id, property_id, source)
        select ${ctx.orgId}, ${title}, now() + ${i.interest === "yes" ? tx`interval '2 days'` : tx`interval '1 day'`}, ${ctx.userId}, ${v.contact_id}, ${v.property_id}, ${`debrief:${visitId}`}
        where not exists (select 1 from public.tasks t where t.organization_id = ${ctx.orgId} and t.source = ${`debrief:${visitId}`})`;
    }
    return { ok: true as const, moved };
  });
}

export type DebriefRow = { id: string; starts_at: Date; property_id: string; reference: string; street: string | null; contact_id: string | null; first_name: string | null; last_name: string | null; first_name_he: string | null; last_name_he: string | null };
/** Visites passées (14 jours) de l'agent, avec un client, sans compte rendu. */
export async function pendingDebriefs(ctx: Ctx): Promise<DebriefRow[]> {
  return (await db(ctx, (tx) => tx`select v.id, v.starts_at, v.property_id, p.reference, p.street, v.contact_id, c.first_name, c.last_name, c.first_name_he, c.last_name_he
    from public.visits v join public.properties p on p.id = v.property_id left join public.contacts c on c.id = v.contact_id
    where v.agent_id = ${ctx.userId} and v.feedback is null and v.contact_id is not null and v.status in ('planned','done') and v.starts_at <= now() and v.starts_at > now() - interval '14 days'
    order by v.starts_at desc limit 8`)) as unknown as DebriefRow[];
}

export type FeedbackRow = { id: string; starts_at: Date; feedback: Feedback; contact_id: string | null; first_name: string | null; last_name: string | null; first_name_he: string | null; last_name_he: string | null; agent_name: string | null };
export async function propertyFeedback(ctx: Ctx, propertyId: string): Promise<FeedbackRow[]> {
  return (await db(ctx, (tx) => tx`select v.id, v.starts_at, v.feedback, v.contact_id, c.first_name, c.last_name, c.first_name_he, c.last_name_he, a.full_name as agent_name
    from public.visits v left join public.contacts c on c.id = v.contact_id left join public.profiles a on a.id = v.agent_id
    where v.property_id = ${propertyId} and v.feedback is not null order by v.starts_at desc limit 20`)) as unknown as FeedbackRow[];
}
