import "server-only";
import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { db, type Ctx } from "../session";
import { sql } from "../db";
import { storage } from "../storage";
import { toPngDataUri } from "../images";
import { aiConfig, CREDIT_COST } from "../ai/config";
import { enhancePhoto } from "../ai/providers";
import { posterHtml, FORMATS, type PosterFormat, type PosterVariant } from "../poster/html";
import { loadFonts, renderPoster } from "../poster/render";
import { getBrandKit } from "./brand";
import { getProperty } from "./properties";
import { coverBytes } from "./media";
import { cityName } from "./geo";
import { money, num } from "../format";
import { formatPhone } from "../phone";

export type Level = "faithful" | "enhanced" | "creative";
export type PosterRequest = { propertyId: string; format: PosterFormat; locale: "fr" | "he" | "en"; variant: PosterVariant; level: Level; showPrice: boolean; showAddress: boolean; showContact: boolean; showQr: boolean; headline?: string | null; siteUrl: string };
export type PosterResult = { ok: true; id: string; key: string; credits: number; balance: number } | { ok: false; error: "forbidden" | "not_found" | "no_legal" | "insufficient_credits" | "provider_missing" | "render_failed" | "not_active" };

const T = {
  fr: { tag: "À VENDRE", rent: "À LOUER", rooms: "pièces", sqm: "m²", mamad: "Mamad", parking: (n: number) => `${n} parking${n > 1 ? "s" : ""}`, elevator: "Ascenseur", staging: "Image retouchée" },
  he: { tag: "למכירה", rent: "להשכרה", rooms: "חדרים", sqm: "מ״ר", mamad: "ממ״ד", parking: (n: number) => (n > 1 ? `${n} חניות` : "חניה"), elevator: "מעלית", staging: "תמונה ערוכה" },
  en: { tag: "FOR SALE", rent: "FOR RENT", rooms: "rooms", sqm: "sqm", mamad: "Safe room", parking: (n: number) => `${n} parking`, elevator: "Elevator", staging: "Retouched image" },
} as const;

export const levelCost = (l: Level) => CREDIT_COST[`poster_${l}` as keyof typeof CREDIT_COST];
export const levelAvailable = (l: Level) => l === "faithful" || !!aiConfig().image;

export async function generatePoster(ctx: Ctx, r: PosterRequest): Promise<PosterResult> {
  if (!ctx.caps.has("posters.create")) return { ok: false, error: "forbidden" };
  const data = await getProperty(ctx, r.propertyId);
  if (!data) return { ok: false, error: "not_found" };
  const p = data.p;
  if (!["active", "under_offer"].includes(p.status)) return { ok: false, error: "not_active" };
  if (!levelAvailable(r.level)) return { ok: false, error: "provider_missing" };
  const brand = await getBrandKit(ctx);
  const legal = brand.legal_footer[r.locale]?.trim();
  if (!legal) return { ok: false, error: "no_legal" }; // mention légale obligatoire du kit de marque : pas d'affiche sans elle
  const t = T[r.locale];
  const [agent] = await db(ctx, (tx) => tx`select full_name, phone from public.profiles where id = ${p.agent_id}`);
  const [org] = await db(ctx, (tx) => tx`select name_fr, name_he, name_en from public.organizations where id = ${ctx.orgId}`);

  // 1) crédits (débit atomique ; remboursé si le rendu échoue)
  const cost = levelCost(r.level);
  let balance: number;
  try { balance = Number((await db(ctx, (tx) => tx`select public.ai_spend(${cost}, ${"poster_" + r.level}, ${r.propertyId}) as b`))[0]!.b); }
  catch (e) { return { ok: false, error: /insufficient_credits/.test(String(e)) ? "insufficient_credits" : "forbidden" }; }
  const refund = async () => { if (cost > 0) await sql`select public.ai_grant(${ctx.orgId}::uuid, ${cost}::numeric, 'refund_poster')`; };

  try {
    // 2) photo (réelle) ; niveau « amélioré » = retouche IA de la photo réelle, jamais d'invention du bien
    let cover = await coverBytes(ctx, r.propertyId);
    let staging: string | null = null;
    if (cover && r.level === "enhanced") { cover = await enhancePhoto(cover, "Improve lighting, sky and sharpness. Do not add, remove or alter any building element, furniture or feature."); staging = t.staging; }
    const photo = cover ? await toPngDataUri(cover, 1600) : null;
    const title = r.locale === "he" ? (data.translations.find((x) => x.locale === "he")?.title ?? "") : (data.translations.find((x) => x.locale === r.locale)?.title ?? "");
    const place = [r.showAddress && p.address_visibility !== "hidden" ? p.street : null, cityName({ name_fr: p.city_fr, name_he: p.city_he, name_en: p.city_en }, r.locale)].filter(Boolean).join(", ");
    const specs = [p.rooms ? `${num(r.locale, p.rooms)} ${t.rooms}` : null, p.area_built ? `${num(r.locale, p.area_built, 0)} ${t.sqm}` : null, p.mamad ? t.mamad : null, p.parking_count > 0 ? t.parking(p.parking_count) : null, p.elevator ? t.elevator : null].filter(Boolean) as string[];
    const qr = r.showQr && p.public_token ? await QRCode.toDataURL(`${r.siteUrl}/${r.locale}/l/${p.public_token}`, { margin: 1, width: 360 }) : null;
    let logo: string | null = null;
    if (brand.logo_path) { const f = await storage.get(brand.logo_path); if (f) logo = `data:image/png;base64,${f.data.toString("base64")}`; }
    const html = posterHtml({
      locale: r.locale, format: r.format, variant: r.variant, brand: { primary: brand.colors.primary, secondary: brand.colors.secondary, fontLatin: brand.fonts.latin, fontHebrew: brand.fonts.hebrew },
      orgName: (r.locale === "he" ? org?.name_he : r.locale === "en" ? org?.name_en : org?.name_fr) ?? org?.name_fr ?? "", tag: p.transaction.includes("rent") ? t.rent : t.tag,
      title: title || `${num(r.locale, p.rooms)} ${t.rooms}`, place, price: r.showPrice ? money(r.locale, p.price, p.currency) : "", specs, phone: r.showContact && agent?.phone ? formatPhone(agent.phone) : null,
      agentName: r.showContact ? agent?.full_name ?? null : null, legal, headline: r.headline?.slice(0, 90) || null, photo, logo, qr, virtualStaging: staging,
    }, await loadFonts());
    const png = await renderPoster(html, r.format);
    const id = randomUUID(), key = `org/${ctx.orgId}/poster/${id}.png`;
    await storage.put(key, png, "image/png");
    const { w, h } = FORMATS[r.format];
    await db(ctx, (tx) => tx`insert into public.poster_generations (id, organization_id, property_id, format, locale, template, level, params, output_path, width, height, credits, brand_version)
      values (${id}, ${ctx.orgId}, ${r.propertyId}, ${r.format}, ${r.locale}, ${r.variant}, ${r.level}, ${tx.json({ showPrice: r.showPrice, showAddress: r.showAddress, showContact: r.showContact, showQr: r.showQr, headline: r.headline ?? null })}, ${key}, ${w}, ${h}, ${cost}, ${brand.version})`);
    return { ok: true, id, key, credits: cost, balance };
  } catch (e) {
    await refund();
    console.error("poster render failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "render_failed" };
  }
}

export async function listPosters(ctx: Ctx, propertyId: string) {
  return (await db(ctx, (tx) => tx`select pg.id, pg.format, pg.locale, pg.template, pg.level, pg.output_path, pg.width, pg.height, pg.created_at, u.full_name as author from public.poster_generations pg left join public.profiles u on u.id = pg.created_by where pg.property_id = ${propertyId} order by pg.created_at desc limit 24`)) as unknown as { id: string; format: string; locale: string; template: string; level: string; output_path: string; width: number; height: number; created_at: Date; author: string | null }[];
}
/** Toutes les affiches de l'agence, les plus récentes d'abord (page Marketing). */
export async function listAgencyPosters(ctx: Ctx, format: string | null, limit = 48) {
  return (await db(ctx, (tx) => tx`
    select pg.id, pg.format, pg.locale, pg.output_path, pg.created_at, pg.property_id, p.reference, p.street, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en
    from public.poster_generations pg join public.properties p on p.id = pg.property_id left join public.geo_places g on g.id = p.city_id
    where p.deleted_at is null and (${format}::text is null or pg.format = ${format}) order by pg.created_at desc limit ${limit}`)) as unknown as Record<string, any>[];
}

export async function marketingStats(ctx: Ctx) {
  const [r] = await db(ctx, (tx) => tx`select
    (select count(*) from public.poster_generations)::int as total,
    (select count(*) from public.poster_generations where created_at >= date_trunc('month', now()))::int as month,
    (select count(*) from public.properties p where p.status in ('active','under_offer') and p.deleted_at is null and not exists (select 1 from public.poster_generations pg where pg.property_id = p.id))::int as todo`);
  return r as unknown as { total: number; month: number; todo: number };
}

/** Biens en ligne qui n'ont encore aucune affiche. */
export async function propertiesWithoutPoster(ctx: Ctx, limit = 6) {
  return (await db(ctx, (tx) => tx`
    select p.id, p.reference, p.street, p.price, p.currency, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en,
      (select pm.thumb_path from public.property_media pm where pm.property_id = p.id and pm.kind = 'photo' order by pm.is_cover desc, pm.position limit 1) as cover_thumb
    from public.properties p left join public.geo_places g on g.id = p.city_id
    where p.status in ('active','under_offer') and p.deleted_at is null and not exists (select 1 from public.poster_generations pg where pg.property_id = p.id)
    order by p.created_at desc limit ${limit}`)) as unknown as Record<string, any>[];
}

export async function aiBalance(ctx: Ctx) { return Number((await db(ctx, (tx) => tx`select public.ai_balance() as b`))[0]!.b); }
