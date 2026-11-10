import "server-only";
import { createHash } from "node:crypto";
import { db, type Ctx } from "../session";
import { sql } from "../db";
import { signToken, verifyToken } from "../crypto";
import { storage } from "../storage";
import { sendEmail } from "../email";
import { sendViaGmail } from "../integrations/gmail";
import { getUserTokens, saveUserTokens } from "./connections";
import { loadFonts, renderPdf } from "../poster/render";
import { ACTIONS, mandateHtml, type MandateAction } from "../mandate/html";
import type { Loc } from "../visit-sheet/html";
import { checkSignaturePng } from "./signature";
import { pickName } from "./types";

const DAY = 86400;
const loc = (l: string | null | undefined): Loc => (l === "he" || l === "en" ? l : "fr");
const RESIDENTIAL_EXEMPT = ["land", "office", "shop"];

export type MandateRow = { id: string; property_id: string; contact_id: string | null; owner_name: string; broker_license: string | null; starts_on: string; ends_on: string; price: string | null; currency: string;
  commission_pct: string; actions: MandateAction[]; status: "sent" | "signed" | "cancelled"; signer_name: string | null; signed_at: Date | null; document_path: string | null; created_at: Date; agent_id: string | null; agent_name: string | null;
  phone: string | null; email: string | null; preferred_locale: string | null; sent_at: Date | null };
export type MandateLinks = { url: string | null; wa: string | null; hasEmail: boolean };

export async function listMandates(ctx: Ctx, propertyId: string): Promise<MandateRow[]> {
  return (await db(ctx, (tx) => tx`select m.id, m.property_id, m.contact_id, m.owner_name, m.broker_license, m.starts_on::text, m.ends_on::text, m.price, m.currency, m.commission_pct, m.actions, m.status, m.signer_name, m.signed_at, m.document_path, m.created_at,
      m.agent_id, a.full_name as agent_name, c.phones->0->>'e164' as phone, c.emails->0->>'email' as email, c.preferred_locale,
      (select max(x.occurred_at) from public.activities x where x.kind = 'mandate_sent' and x.payload->>'mandate_id' = m.id::text) as sent_at
    from public.property_mandates m left join public.contacts c on c.id = m.contact_id left join public.profiles a on a.id = m.agent_id
    where m.property_id = ${propertyId} order by m.created_at desc limit 10`)) as unknown as MandateRow[];
}

export type MandateInput = { propertyId: string; contactId: string | null; ownerName: string; license: string | null; startsOn: string; endsOn: string; price: number | null; commission: number; actions: string[] };
export type MandateError = "forbidden" | "invalid" | "dates" | "too_long" | "actions";
export async function createMandate(ctx: Ctx, i: MandateInput): Promise<{ id: string } | { error: MandateError }> {
  if (!ctx.caps.has("properties.write") || ctx.impersonating) return { error: "forbidden" };
  const actions = [...new Set(i.actions)].filter((a): a is MandateAction => (ACTIONS as readonly string[]).includes(a));
  const name = i.ownerName.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 120 || !Number.isFinite(i.commission) || i.commission < 0 || i.commission > 20) return { error: "invalid" };
  const s = Date.parse(i.startsOn), e = Date.parse(i.endsOn);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(i.endsOn) || Number.isNaN(s) || Number.isNaN(e) || e <= s) return { error: "dates" };
  if (actions.length < 2) return { error: "actions" };
  return db(ctx, async (tx) => {
    const [p] = await tx`select id, property_type from public.properties where id = ${i.propertyId} and deleted_at is null and (agent_id = ${ctx.userId} or ${ctx.caps.has("properties.write_all")})`;
    if (!p) return { error: "forbidden" as const };
    // Logement : 6 mois au plus (loi sur les courtiers en immobilier).
    const sixMonths = new Date(s); sixMonths.setUTCMonth(sixMonths.getUTCMonth() + 6);
    if (!RESIDENTIAL_EXEMPT.includes(p.property_type) && e > sixMonths.getTime()) return { error: "too_long" as const };
    const contact = i.contactId ? (await tx`select c.id from public.property_contacts pc join public.contacts c on c.id = pc.contact_id where pc.property_id = ${i.propertyId} and c.id = ${i.contactId}`)[0]?.id ?? null : null;
    const [r] = await tx`insert into public.property_mandates (organization_id, property_id, contact_id, agent_id, owner_name, broker_license, starts_on, ends_on, price, commission_pct, actions)
      values (${ctx.orgId}, ${i.propertyId}, ${contact}, ${ctx.userId}, ${name}, ${i.license?.trim().slice(0, 40) || null}, ${i.startsOn}, ${i.endsOn}, ${i.price}, ${i.commission}, ${actions}) returning id`;
    await tx`insert into public.activities (organization_id, kind, contact_id, property_id, summary, payload) values (${ctx.orgId}, 'mandate_created', ${contact}, ${i.propertyId}, 'mandate_created', ${tx.json({ mandate_id: r!.id })})`;
    return { id: r!.id as string };
  });
}

export async function cancelMandate(ctx: Ctx, id: string) {
  if (!ctx.caps.has("properties.write") || ctx.impersonating) return false;
  return db(ctx, async (tx) => (await tx`update public.property_mandates set status = 'cancelled' where id = ${id} and status = 'sent' and (agent_id = ${ctx.userId} or ${ctx.caps.has("properties.write_all")}) returning id`).length > 0);
}

const canSend = (ctx: Ctx, m: Pick<MandateRow, "status" | "agent_id">) => m.status === "sent" && ctx.caps.has("properties.write") && !ctx.impersonating && (m.agent_id === ctx.userId || ctx.caps.has("properties.write_all"));
const MSG: Record<Loc, (first: string, url: string, agent: string, org: string) => string> = {
  fr: (n, u, a, o) => `Bonjour ${n},\nVoici le mandat d'exclusivité pour votre bien, à relire et signer en ligne : ${u}\n\n${a} · ${o}`,
  he: (n, u, a, o) => `שלום ${n},\nמצורפת הזמנת התיווך בבלעדיות עבור הנכס שלך, לקריאה ולחתימה אונליין: ${u}\n\n${a} · ${o}`,
  en: (n, u, a, o) => `Hello ${n},\nHere is the exclusive agreement for your property, to read and sign online: ${u}\n\n${a} · ${o}`,
};
function compose(ctx: Ctx, m: MandateRow, base: string) {
  const l = loc(m.preferred_locale);
  const url = `${base}/${l}/mandate/${encodeURIComponent(signToken({ m: m.id }, 14 * DAY))}`;
  return { l, url, text: MSG[l](m.owner_name.split(" ")[0] ?? "", url, ctx.fullName, pickName(ctx.orgName, l)) };
}
export function mandateLinks(ctx: Ctx, m: MandateRow, base: string, direct = false): MandateLinks {
  if (!canSend(ctx, m)) return { url: null, wa: null, hasEmail: false };
  const c = compose(ctx, m, base), digits = (m.phone ?? "").replace(/\D/g, "");
  return { url: c.url, wa: digits ? (direct ? `https://wa.me/${digits}?text=${encodeURIComponent(c.text)}` : `/api/mandates/${m.id}/whatsapp`) : null, hasEmail: !!m.email };
}
export async function getMandate(ctx: Ctx, id: string): Promise<MandateRow | undefined> {
  const [r] = await db(ctx, (tx) => tx`select property_id from public.property_mandates where id = ${id}`);
  return r ? (await listMandates(ctx, r.property_id)).find((m) => m.id === id) : undefined;
}
export async function logMandateSent(ctx: Ctx, m: MandateRow, channel: "email" | "whatsapp") {
  await db(ctx, (tx) => tx`insert into public.activities (organization_id, kind, contact_id, property_id, summary, payload) values (${ctx.orgId}, 'mandate_sent', ${m.contact_id}, ${m.property_id}, ${channel}, ${tx.json({ mandate_id: m.id, channel })})`);
}
export async function sendMandateEmail(ctx: Ctx, id: string, base: string): Promise<"sent" | "dry_run" | "failed" | "no_email" | "forbidden"> {
  const m = await getMandate(ctx, id);
  if (!m || !canSend(ctx, m)) return "forbidden";
  if (!m.email) return "no_email";
  const c = compose(ctx, m, base);
  const subject = c.l === "he" ? `הזמנת תיווך בבלעדיות — ${pickName(ctx.orgName, c.l)}` : c.l === "en" ? `Exclusive agreement — ${pickName(ctx.orgName, c.l)}` : `Mandat d'exclusivité — ${pickName(ctx.orgName, c.l)}`;
  const esc = (x: string) => x.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
  const html = `<div dir="${c.l === "he" ? "rtl" : "ltr"}" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#112127">${c.text.split("\n").map((x) => esc(x).replace(esc(c.url), `<a href="${esc(c.url)}">${esc(c.url)}</a>`)).join("<br>")}</div>`;
  const mail = { subject, html, text: c.text };
  let status: "sent" | "dry_run" | "failed";
  const gm = await getUserTokens(ctx.userId, "gmail");
  if (gm?.email) {
    try { const g = await sendViaGmail(gm, { to: m.email, ...mail, fromName: ctx.fullName || undefined, fromEmail: gm.email }); if (g.tokens.access_token !== gm.access_token) await saveUserTokens(ctx.userId, "gmail", g.tokens); status = "sent"; } catch { status = "failed"; }
  } else {
    let replyTo: string | undefined;
    try { const [u] = await sql`select email from auth.users where id = ${ctx.userId}`; replyTo = (u?.email as string | undefined) ?? undefined; } catch { /* schéma auth absent en local */ }
    status = (await sendEmail({ to: m.email, ...mail, replyTo })).status;
  }
  if (status !== "failed") await logMandateSent(ctx, m, "email");
  return status;
}

/* ───────── Page publique de signature (sans session, par jeton) ───────── */
export type MandateSignInfo = { id: string; orgId: string; orgName: string; broker: string; license: string; owner: string; reference: string; address: string; price: string; from: string; to: string; pct: string; actions: MandateAction[]; signed: boolean; propertyId: string; contactId: string | null };
export async function loadMandateInfo(token: string, locale: string): Promise<MandateSignInfo | null> {
  const t = verifyToken<{ m: string }>(token); if (!t?.m) return null;
  const l = loc(locale);
  const [r] = await sql`select m.*, p.reference, p.street, g.name_fr, g.name_he, g.name_en, o.name_fr as on_fr, o.name_he as on_he, o.name_en as on_en, a.full_name as broker
    from public.property_mandates m join public.properties p on p.id = m.property_id join public.organizations o on o.id = m.organization_id and o.status = 'active'
    left join public.geo_places g on g.id = p.city_id left join public.profiles a on a.id = m.agent_id where m.id = ${t.m} and m.status <> 'cancelled'`;
  if (!r) return null;
  const nf = new Intl.NumberFormat(l === "he" ? "he-IL" : l === "en" ? "en-IL" : "fr-FR", { style: "currency", currency: r.currency ?? "ILS", maximumFractionDigits: 0 });
  const df = new Intl.DateTimeFormat(l === "he" ? "he-IL" : l === "en" ? "en-GB" : "fr-FR", { dateStyle: "long", timeZone: "UTC" });
  return { id: r.id, orgId: r.organization_id, orgName: (r[`on_${l}`] ?? r.on_fr ?? r.on_he ?? "") as string, broker: r.broker ?? "", license: r.broker_license ?? "", owner: r.owner_name, reference: r.reference,
    address: [r.street, r[`name_${l}`] ?? r.name_fr].filter(Boolean).join(", "), price: r.price != null ? nf.format(Number(r.price)) : "", from: df.format(new Date(r.starts_on)), to: df.format(new Date(r.ends_on)),
    pct: new Intl.NumberFormat(l === "he" ? "he-IL" : l === "en" ? "en-IL" : "fr-FR", { maximumFractionDigits: 2 }).format(Number(r.commission_pct)), actions: r.actions as MandateAction[], signed: r.status === "signed", propertyId: r.property_id, contactId: r.contact_id };
}

export type MandateSignResult = { ok: true } | { ok: false; error: "invalid_token" | "already_signed" | "invalid_signature" | "invalid_name" | "invalid_id" | "invalid_address" | "no_consent" };
export async function submitMandate(token: string, locale: string, i: { name: string; idNumber: string; address: string; dataUrl: string; consent: boolean; ip: string }): Promise<MandateSignResult> {
  const info = await loadMandateInfo(token, locale);
  if (!info) return { ok: false, error: "invalid_token" };
  if (info.signed) return { ok: false, error: "already_signed" };
  const name = i.name.trim().replace(/\s+/g, " "), idn = i.idNumber.replace(/[\s-]/g, ""), address = i.address.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 120) return { ok: false, error: "invalid_name" };
  if (!/^[A-Za-z0-9]{5,12}$/.test(idn)) return { ok: false, error: "invalid_id" };
  if (address.length < 4 || address.length > 200) return { ok: false, error: "invalid_address" };
  if (!i.consent) return { ok: false, error: "no_consent" };
  const png = await checkSignaturePng(i.dataUrl);
  if (!png) return { ok: false, error: "invalid_signature" };
  const l = loc(locale), signedAt = new Date();
  const fingerprint = createHash("sha256").update(png).update(`|${info.id}|${name}|${idn}|${signedAt.toISOString()}`).digest("hex");
  const ipHash = createHash("sha256").update(`${i.ip}|${process.env.APP_SECRET ?? ""}`).digest("hex").slice(0, 32);
  const sigKey = `org/${info.orgId}/signatures/${info.id}.png`, docKey = `org/${info.orgId}/mandate_docs/${info.id}.pdf`;
  const fmt = new Intl.DateTimeFormat(l === "he" ? "he-IL" : l === "en" ? "en-GB" : "fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jerusalem" });
  const pdf = await renderPdf(mandateHtml({ locale: l, orgName: info.orgName, broker: info.broker, license: info.license, owner: name, idNumber: idn, ownerAddress: address, reference: info.reference, address: info.address,
    price: info.price, from: info.from, to: info.to, pct: info.pct, actions: info.actions, signaturePng: `data:image/png;base64,${png.toString("base64")}`, signedAt: fmt.format(signedAt), fingerprint }, await loadFonts()));
  // Verrou atomique : une seule signature par mandat.
  const [m] = await sql`update public.property_mandates set status = 'signed', signer_name = ${name}, signed_at = ${signedAt}, signature_hash = ${fingerprint}, signed_ip_hash = ${ipHash}, signature_path = ${sigKey}, document_path = ${docKey}
    where id = ${info.id} and status = 'sent' returning id, property_id, contact_id, starts_on::text, ends_on::text, commission_pct, organization_id`;
  if (!m) return { ok: false, error: "already_signed" };
  await storage.put(sigKey, png, "image/png"); await storage.put(docKey, pdf, "application/pdf");
  // Le bien passe en exclusivité, avec les dates et le taux signés.
  await sql`update public.properties set mandate = coalesce(mandate, '{}'::jsonb) || ${sql.json({ type: "exclusive", start: m.starts_on, end: m.ends_on, signed: true, mandate_id: m.id })}, commission_pct = ${m.commission_pct} where id = ${m.property_id}`;
  await sql`insert into public.activities (organization_id, kind, contact_id, property_id, summary, payload) values (${m.organization_id}, 'mandate_signed', ${m.contact_id}, ${m.property_id}, 'mandate_signed', ${sql.json({ mandate_id: m.id, fingerprint })})`;
  return { ok: true };
}
