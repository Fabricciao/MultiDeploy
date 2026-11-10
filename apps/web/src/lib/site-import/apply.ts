import "server-only";
import { db, type Ctx } from "../session";
import { safeFetch } from "../brand/ssrf";
import { createProperty, type PropertyInput } from "../data/properties";
import { addPhotos, MAX_PHOTOS } from "../data/media";
import { PROPERTY_TYPES } from "../data/forms";
import type { SiteListing } from "./parse";

export type SiteImportReport = { created: number; skipped: number; photos: number; failed: number };
const MAX_ITEMS = 200, PHOTOS_PER_ITEM = 12;
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const nb = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null);
const httpUrl = (v: unknown) => { try { const u = new URL(String(v)); return /^https?:$/.test(u.protocol) ? u.toString() : null; } catch { return null; } };

/** Données renvoyées par le navigateur : revalidées champ par champ (rien n'est cru sur parole). */
export function sanitizeListing(x: any, cityIds: Set<string>): SiteListing | null {
  const url = httpUrl(x?.url), title = str(x?.title, 160);
  if (!url || !title) return null;
  const rooms = nb(x.rooms, 0.5, 30);
  return { url, title, description: str(x.description, 4000), transaction: x.transaction === "rent" ? "rent" : x.transaction === "sale" ? "sale" : null,
    property_type: (PROPERTY_TYPES as readonly string[]).includes(x.property_type) ? x.property_type : null, price: nb(x.price, 1, 500_000_000), currency: ["ILS", "USD", "EUR"].includes(x.currency) ? x.currency : "ILS",
    rooms: rooms !== null && (rooms * 2) % 1 === 0 ? rooms : null, bedrooms: nb(x.bedrooms, 0, 30), area_built: nb(x.area_built, 5, 20_000), floor: nb(x.floor, -5, 120), floors_total: nb(x.floors_total, 1, 120),
    city_id: typeof x.city_id === "string" && cityIds.has(x.city_id) ? x.city_id : null, city_text: str(x.city_text, 60), street: str(x.street, 80), house_number: str(x.house_number, 10),
    images: Array.isArray(x.images) ? x.images.map(httpUrl).filter(Boolean).slice(0, PHOTOS_PER_ITEM) as string[] : [], features: Array.isArray(x.features) ? x.features.filter((f: unknown) => typeof f === "string").slice(0, 10) : [],
    lang: x.lang === "he" || x.lang === "en" ? x.lang : "fr" };
}

/** Biens déjà importés depuis ces adresses (pour ne pas créer deux fois la même fiche). */
export async function alreadyImported(ctx: Ctx, urls: string[]): Promise<Set<string>> {
  if (!urls.length) return new Set();
  const rows = await db(ctx, (tx) => tx`select custom->>'source_url' as u from public.properties where deleted_at is null and custom->>'source_url' = any(${urls})`);
  return new Set(rows.map((r) => r.u as string));
}

export async function importSiteListings(ctx: Ctx, items: SiteListing[], locale: string): Promise<SiteImportReport> {
  const rep: SiteImportReport = { created: 0, skipped: 0, photos: 0, failed: 0 };
  const done = await alreadyImported(ctx, items.map((i) => i.url));
  for (const l of items.slice(0, MAX_ITEMS)) {
    if (done.has(l.url)) { rep.skipped++; continue; }
    const lang = l.lang, has = (k: string) => l.features.includes(k);
    const input: PropertyInput = { transaction: l.transaction ?? "sale", property_type: (l.property_type ?? "apartment") as PropertyInput["property_type"], status: "draft", city_id: l.city_id, street: l.street, house_number: l.house_number,
      address_visibility: "street", price: l.price, currency: l.currency, rooms: l.rooms, area_built: l.area_built, floor: l.floor, floors_total: l.floors_total,
      mamad: has("mamad"), parking_count: has("parking") ? 1 : 0, elevator: has("elevator"), sukkah_balcony: has("sukkah_balcony"), storage: has("storage"), ac: has("ac"),
      arnona_monthly: null, vaad_bayit_monthly: null, registration_type: null, mandate_type: "non_exclusive", mandate_end: null, mandate_origin: "own", mandate_partner: null, mandate_co_broke: false, commission_pct: null,
      internal_notes: null, titles: { fr: "", he: "", en: "", [lang]: l.title }, descriptions: { fr: "", he: "", en: "", [lang]: l.description ?? "" }, agent_id: null };
    let id: string;
    try { id = await createProperty(ctx, input, lang); }
    catch { rep.failed++; continue; }
    rep.created++; done.add(l.url);
    await db(ctx, (tx) => tx`update public.properties set custom = coalesce(custom, '{}'::jsonb) || ${tx.json({ source_url: l.url, imported_at: new Date().toISOString() })} where id = ${id}`);
    // Photos : téléchargées depuis le site (fetch durci), puis traitées comme un envoi normal (redimensionnement, vignette, quota).
    const files: File[] = [];
    for (const src of l.images.slice(0, Math.min(PHOTOS_PER_ITEM, MAX_PHOTOS))) {
      try { const r = await safeFetch(src, { maxBytes: 15_000_000, types: /^image\/(jpeg|png|webp)/i, timeoutMs: 15_000 }); files.push(new File([new Uint8Array(r.body)], `photo.${r.type.includes("png") ? "png" : r.type.includes("webp") ? "webp" : "jpg"}`, { type: r.type })); }
      catch { /* photo inaccessible : ignorée */ }
    }
    if (files.length) { const r = await addPhotos(ctx, id, files); rep.photos += r?.added ?? 0; }
  }
  return rep;
}
