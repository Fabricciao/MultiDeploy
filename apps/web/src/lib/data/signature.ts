import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { db, type Ctx } from "../session";
import { sql } from "../db";
import { signToken, verifyToken } from "../crypto";
import { storage } from "../storage";
import { loadFonts, renderPdf } from "../poster/render";
import { docLocales, visitSheetHtml, type Loc } from "../visit-sheet/html";

const DAY = 86400;
export async function visitSignLink(ctx: Ctx, visitId: string, base: string): Promise<string | null> {
  if (!ctx.caps.has("properties.write") || ctx.impersonating) return null;
  const [v] = await db(ctx, (tx) => tx`select id from public.visits where id = ${visitId} and signed_at is null and status <> 'cancelled' and (agent_id = ${ctx.userId} or ${ctx.caps.has("properties.write_all")})`);
  if (!v) return null;
  return `${base}/${ctx.locale}/sign/${encodeURIComponent(signToken({ v: visitId }, 7 * DAY))}`;
}

type SignInfo = { visitId: string; orgId: string; orgName: string; reference: string; address: string; startsAt: Date; agent: string; signed: boolean; contactName: string };
export async function loadSignInfo(token: string, locale: string): Promise<SignInfo | null> {
  const t = verifyToken<{ v: string }>(token); if (!t) return null;
  const col = locale === "he" ? "he" : locale === "en" ? "en" : "fr";
  const [r] = await sql`select v.id, v.organization_id, v.starts_at, v.signed_at, p.reference, p.street, g.name_fr, g.name_he, g.name_en, o.name_fr as on_fr, o.name_he as on_he, o.name_en as on_en, a.full_name as agent,
      c.first_name, c.last_name, c.first_name_he, c.last_name_he
    from public.visits v join public.properties p on p.id = v.property_id join public.organizations o on o.id = v.organization_id
    left join public.geo_places g on g.id = p.city_id left join public.profiles a on a.id = v.agent_id left join public.contacts c on c.id = v.contact_id where v.id = ${t.v} and v.status <> 'cancelled'`;
  if (!r) return null;
  const orgName = (r[`on_${col}`] ?? r.on_fr ?? r.on_he ?? r.on_en ?? "") as string;
  const city = (r[`name_${col}`] ?? r.name_fr ?? "") as string;
  const contactName = (col === "he" ? [r.first_name_he ?? r.first_name, r.last_name_he ?? r.last_name] : [r.first_name, r.last_name]).filter(Boolean).join(" ");
  return { visitId: r.id, orgId: r.organization_id, orgName, reference: r.reference, address: [r.street, city].filter(Boolean).join(", "), startsAt: r.starts_at, agent: r.agent ?? "", signed: !!r.signed_at, contactName };
}

export type SignResult = { ok: true; documentKey: string } | { ok: false; error: "invalid_token" | "already_signed" | "invalid_signature" | "invalid_name" | "no_consent" };
const PNG_URL = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/;

/** Signature dessinée : PNG valide, taille raisonnable, et pas vide (au moins quelques pixels opaques). */
export async function checkSignaturePng(dataUrl: string): Promise<Buffer | null> {
  const m = PNG_URL.exec(dataUrl); if (!m || m[1]!.length > 400_000) return null;
  try {
    const raw = Buffer.from(m[1]!, "base64");
    const meta = await sharp(raw).metadata();
    if (meta.format !== "png" || !meta.width || !meta.height || meta.width > 2000 || meta.height > 1000) return null;
    const { data } = await sharp(raw).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let ink = 0; for (let k = 3; k < data.length; k += 4) if (data[k]! > 20) ink++;
    if (ink < 80) return null;
    return await sharp(raw).png().toBuffer();
  } catch { return null; }
}

export async function submitSignature(token: string, locale: Loc, i: { name: string; dataUrl: string; consent: boolean; ip: string }): Promise<SignResult> {
  const info = await loadSignInfo(token, locale);
  if (!info) return { ok: false, error: "invalid_token" };
  if (info.signed) return { ok: false, error: "already_signed" };
  const name = i.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return { ok: false, error: "invalid_name" };
  if (!i.consent) return { ok: false, error: "no_consent" };
  const png = await checkSignaturePng(i.dataUrl);
  if (!png) return { ok: false, error: "invalid_signature" };

  const signedAt = new Date();
  const fingerprint = createHash("sha256").update(png).update(`|${info.visitId}|${name}|${signedAt.toISOString()}`).digest("hex");
  const ipHash = createHash("sha256").update(`${i.ip}|${process.env.APP_SECRET ?? ""}`).digest("hex").slice(0, 32);
  const sigKey = `org/${info.orgId}/signatures/${info.visitId}.png`, docKey = `org/${info.orgId}/visit_docs/${info.visitId}.pdf`;
  // Le PDF est toujours établi en hébreu, suivi de la traduction dans la langue lue par le signataire.
  const fmt = (l: Loc) => new Intl.DateTimeFormat(l === "he" ? "he-IL" : l === "en" ? "en-GB" : "fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jerusalem" });
  const parts = await Promise.all(docLocales(locale).map(async (l) => { const x = l === locale ? info : (await loadSignInfo(token, l)) ?? info; return { locale: l, orgName: x.orgName, address: x.address, startsAt: fmt(l).format(info.startsAt), signedAt: fmt(l).format(signedAt) }; }));
  const html = visitSheetHtml({ parts, reference: info.reference, agent: info.agent, signer: name, signaturePng: `data:image/png;base64,${png.toString("base64")}`, fingerprint }, await loadFonts());
  const pdf = await renderPdf(html);
  // Verrou atomique : une seule signature par visite, même en cas de double envoi.
  const [claimed] = await sql`update public.visits set signer_name = ${name}, signed_at = ${signedAt}, signature_hash = ${fingerprint}, signed_ip_hash = ${ipHash}, signature_path = ${sigKey}, document_path = ${docKey}, status = case when status = 'planned' then 'done' else status end
    where id = ${info.visitId} and signed_at is null returning id, contact_id, property_id`;
  if (!claimed) return { ok: false, error: "already_signed" };
  await storage.put(sigKey, png, "image/png"); await storage.put(docKey, pdf, "application/pdf");
  await sql`insert into public.activities (organization_id, kind, contact_id, property_id, summary, payload) values (${info.orgId}, 'visit_signed', ${claimed.contact_id}, ${claimed.property_id}, 'visit_signed', ${sql.json({ visit_id: info.visitId, fingerprint })})`;
  return { ok: true, documentKey: docKey };
}
