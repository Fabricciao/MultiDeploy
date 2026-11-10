import "server-only";
import { headers } from "next/headers";
import { db, type Ctx } from "../session";
import { sql } from "../db";
import { signToken } from "../crypto";
import { sendEmail } from "../email";
import { sendViaGmail } from "../integrations/gmail";
import { getUserTokens, saveUserTokens } from "./connections";
import { slipEmail, slipMessage } from "../visit-sheet/message";
import type { Loc } from "../visit-sheet/html";
import { pickName } from "./types";

/** Bons de visite : une visite avec un client = un bon, à signer en ligne par le client (lien personnel, 7 jours). */
export type SlipRow = {
  id: string; starts_at: Date; status: string; signed_at: Date | null; signer_name: string | null; document_path: string | null; agent_id: string | null; agent_name: string | null;
  property_id: string; reference: string; street: string | null; city_fr: string | null; city_he: string | null; city_en: string | null; title: string | null;
  contact_id: string | null; first_name: string | null; last_name: string | null; first_name_he: string | null; last_name_he: string | null; preferred_locale: string | null; phone: string | null; email: string | null; sent_at: Date | null; total: string;
};
export type SlipInfo = { id: string; signed: boolean; signedAt: Date | null; signer: string | null; doc: string | null; url: string | null; wa: string | null; hasEmail: boolean; hasContact: boolean; sentAt: Date | null };
export type SlipFilter = { visitId?: string; visitIds?: string[]; contactId?: string; propertyId?: string; state?: "signed" | "pending" | "all"; q?: string; limit?: number; page?: number };

export async function listSlips(ctx: Ctx, f: SlipFilter = {}): Promise<{ rows: SlipRow[]; total: number; counts: { signed: number; pending: number } }> {
  const limit = Math.min(f.limit ?? 50, 200), page = Math.max(1, f.page ?? 1);
  return db(ctx, async (tx) => {
    const w = [tx`v.status <> 'cancelled'`, tx`v.contact_id is not null`];
    if (f.visitId) w.push(tx`v.id = ${f.visitId}`);
    if (f.visitIds) w.push(tx`v.id = any(${f.visitIds}::uuid[])`);
    if (f.contactId) w.push(tx`v.contact_id = ${f.contactId}`);
    if (f.propertyId) w.push(tx`v.property_id = ${f.propertyId}`);
    if (f.q) w.push(tx`(p.search_text like '%' || app.normalize_search(${f.q}) || '%' or c.search_text like '%' || app.normalize_search(${f.q}) || '%')`);
    const base = w.reduce((a, b) => tx`${a} and ${b}`);
    const where = f.state === "signed" ? tx`${base} and v.signed_at is not null` : f.state === "pending" ? tx`${base} and v.signed_at is null` : base;
    const rows = (await tx`
      select v.id, v.starts_at, v.status, v.signed_at, v.signer_name, v.document_path, v.agent_id, a.full_name as agent_name,
        v.property_id, p.reference, p.street, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en,
        (select t.title from public.property_translations t where t.property_id = p.id order by (t.locale = ${ctx.locale}) desc limit 1) as title,
        v.contact_id, c.first_name, c.last_name, c.first_name_he, c.last_name_he, c.preferred_locale, c.phones->0->>'e164' as phone, c.emails->0->>'email' as email,
        (select max(x.occurred_at) from public.activities x where x.contact_id = v.contact_id and x.kind = 'visit_slip_sent' and x.payload->>'visit_id' = v.id::text) as sent_at,
        count(*) over() as total
      from public.visits v join public.properties p on p.id = v.property_id left join public.geo_places g on g.id = p.city_id
      left join public.contacts c on c.id = v.contact_id left join public.profiles a on a.id = v.agent_id
      where ${where} order by coalesce(v.signed_at, v.starts_at) desc limit ${limit} offset ${(page - 1) * limit}`) as unknown as SlipRow[];
    const [k] = await tx`select count(*) filter (where v.signed_at is not null)::int as signed, count(*) filter (where v.signed_at is null)::int as pending
      from public.visits v join public.properties p on p.id = v.property_id left join public.contacts c on c.id = v.contact_id where ${base}`;
    return { rows, total: rows[0] ? Number(rows[0].total) : 0, counts: { signed: Number(k?.signed ?? 0), pending: Number(k?.pending ?? 0) } };
  });
}

/** Adresse publique du site (domaine de l'agence), derrière Traefik. */
export async function siteBase(): Promise<string> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0]!.trim();
  const proto = (h.get("x-forwarded-proto") ?? "http").split(",")[0]!.trim();
  if (host && /^[a-z0-9.-]+(:\d{1,5})?$/i.test(host) && /^https?$/.test(proto)) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

const loc = (l: string | null | undefined): Loc => (l === "he" || l === "en" ? l : "fr");
const first = (r: Pick<SlipRow, "first_name" | "first_name_he">, l: Loc) => (l === "he" ? r.first_name_he || r.first_name : r.first_name || r.first_name_he) ?? "";
export const canSendSlip = (ctx: Ctx, r: Pick<SlipRow, "agent_id" | "signed_at" | "status" | "contact_id">) =>
  ctx.caps.has("properties.write") && !ctx.impersonating && !r.signed_at && r.status !== "cancelled" && !!r.contact_id && (r.agent_id === ctx.userId || ctx.caps.has("properties.write_all"));

function compose(ctx: Ctx, r: SlipRow, base: string) {
  const l = loc(r.preferred_locale);
  const url = `${base}/${l}/sign/${encodeURIComponent(signToken({ v: r.id }, 7 * 86400))}`;
  const city = (l === "he" ? r.city_he : l === "en" ? r.city_en : r.city_fr) ?? r.city_fr ?? "";
  const date = new Intl.DateTimeFormat(l === "he" ? "he-IL" : l === "en" ? "en-GB" : "fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jerusalem" }).format(new Date(r.starts_at));
  return { l, url, msg: { first: first(r, l), address: [r.street, city].filter(Boolean).join(", ") || r.reference, date, url, agent: ctx.fullName, org: pickName(ctx.orgName, l) } };
}

/** Liens prêts à l'emploi : WhatsApp (message préenregistré + lien) et lien seul à copier. Calculés à l'affichage : un clic suffit. */
export function slipInfo(ctx: Ctx, r: SlipRow, base: string, direct = false): SlipInfo {
  const out: SlipInfo = { id: r.id, signed: !!r.signed_at, signedAt: r.signed_at, signer: r.signer_name, doc: r.document_path, url: null, wa: null, hasEmail: !!r.email, hasContact: !!r.contact_id, sentAt: r.sent_at };
  if (!canSendSlip(ctx, r)) return out;
  const c = compose(ctx, r, base);
  out.url = c.url;
  const digits = (r.phone ?? "").replace(/\D/g, "");
  // Par défaut, le lien passe par /api/slips/…/whatsapp pour noter l'envoi ; « direct » donne l'adresse wa.me finale.
  if (digits) out.wa = direct ? `https://wa.me/${digits}?text=${encodeURIComponent(slipMessage(c.l, c.msg))}` : `/api/slips/${r.id}/whatsapp`;
  return out;
}

export async function getSlip(ctx: Ctx, visitId: string): Promise<SlipRow | undefined> { return (await listSlips(ctx, { visitId, limit: 1 })).rows[0]; }

export type SlipSendResult = "sent" | "dry_run" | "failed" | "no_email" | "forbidden";
export async function sendSlipEmail(ctx: Ctx, visitId: string, base: string): Promise<SlipSendResult> {
  const r = await db(ctx, async (tx) => (await tx`
      select v.id, v.starts_at, v.status, v.signed_at, v.agent_id, v.contact_id, v.property_id, p.reference, p.street, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en,
        c.first_name, c.first_name_he, c.preferred_locale, c.emails->0->>'email' as email, (select b.colors->>'primary' from public.brand_kits b where b.organization_id = v.organization_id) as accent
      from public.visits v join public.properties p on p.id = v.property_id left join public.geo_places g on g.id = p.city_id left join public.contacts c on c.id = v.contact_id where v.id = ${visitId}`)[0]);
  if (!r || !canSendSlip(ctx, r as SlipRow)) return "forbidden";
  if (!r.email) return "no_email";
  const c = compose(ctx, r as SlipRow, base);
  const mail = slipEmail(c.l, { ...c.msg, accent: r.accent ?? undefined });
  let status: SlipSendResult;
  const gm = await getUserTokens(ctx.userId, "gmail");
  if (gm?.email) {
    try { const g = await sendViaGmail(gm, { to: r.email, ...mail, fromName: ctx.fullName || undefined, fromEmail: gm.email }); if (g.tokens.access_token !== gm.access_token) await saveUserTokens(ctx.userId, "gmail", g.tokens); status = "sent"; }
    catch { status = "failed"; }
  } else {
    // Réponse du client vers l'agent (l'expéditeur technique est no-reply@).
    let replyTo: string | undefined;
    try { const [u] = await sql`select email from auth.users where id = ${ctx.userId}`; replyTo = (u?.email as string | undefined) ?? undefined; } catch { /* schéma auth absent en local */ }
    status = (await sendEmail({ to: r.email, ...mail, replyTo })).status;
  }
  if (status !== "failed") await logSlipSent(ctx, r.id, r.contact_id, r.property_id, "email");
  return status;
}

export async function logSlipSent(ctx: Ctx, visitId: string, contactId: string, propertyId: string, channel: "email" | "whatsapp") {
  await db(ctx, (tx) => tx`insert into public.activities (organization_id, kind, contact_id, property_id, summary, payload)
    select ${ctx.orgId}, 'visit_slip_sent', v.contact_id, v.property_id, ${channel}, ${tx.json({ visit_id: visitId, channel })} from public.visits v where v.id = ${visitId} and v.contact_id = ${contactId} and v.property_id = ${propertyId}`);
}

/** Bons de visite d'un ensemble de visites (agenda, journée), prêts à afficher. */
export async function slipMap(ctx: Ctx, visitIds: string[]): Promise<Map<string, SlipInfo>> {
  if (!visitIds.length) return new Map();
  const [{ rows }, base] = await Promise.all([listSlips(ctx, { visitIds, limit: 200 }), siteBase()]);
  return new Map(rows.map((r) => [r.id, slipInfo(ctx, r, base)]));
}
