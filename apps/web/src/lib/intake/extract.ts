import { findAmount, HALF, tokens } from "./numbers";
import { normalizePhone } from "../phone";

export type CityRef = { id: string; name_fr: string; name_he: string; name_en: string; aliases?: string[] };
export type FieldMeta = { confidence: number; evidence?: string };
export type ExtractResult = { fields: Record<string, any>; meta: Record<string, FieldMeta>; missing: string[] };

const NIQQUD = /[֑-ׇ]/g;
export const norm = (s: string) => s.replace(NIQQUD, "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/["״'׳’]/g, "");
const ctx = (text: string, i: number, len: number, pad = 18) => text.slice(Math.max(0, i - pad), Math.min(text.length, i + len + pad)).trim();

const FEATURES: [string, RegExp][] = [
  ["mamad", /mamad|ממד|safe\s?room|pi[eè]ce s[eé]curis/i], ["parking", /parking|חניה|חנייה|חניות|stationnement/i], ["elevator", /ascenseur|מעלית|elevator|\blift\b/i],
  ["sukkah_balcony", /soukka|sukkah|סוכה/i], ["storage", /\bcave\b|machsan|מחסן|storage/i], ["ac", /climatisation|\bclim\b|מיזוג|air.?condition/i],
];
const ALL_FEATURES = ["mamad", "parking", "elevator", "sukkah_balcony", "storage", "ac"];

export function findCities(text: string, cities: CityRef[]): { id: string; evidence: string }[] {
  const n = norm(text), out: { id: string; evidence: string }[] = [];
  for (const c of cities) {
    const names = [c.name_fr, c.name_he, c.name_en, ...(c.aliases ?? [])].filter(Boolean).map(norm).filter((x) => x.length >= 3);
    for (const nm of names) {
      const re = /[֐-׿]/.test(nm) ? new RegExp(nm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) : new RegExp(`(?<![\\p{L}])${nm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "u");
      const m = re.exec(n);
      if (m) { if (!out.some((o) => o.id === c.id)) out.push({ id: c.id, evidence: text.slice(m.index, m.index + m[0].length) }); break; }
    }
  }
  return out;
}

function features(text: string, fields: Record<string, any>, meta: Record<string, FieldMeta>, key: string) {
  const found: string[] = [];
  const plain = text.replace(/["״׳'’]/g, "");
  for (const [k, re] of FEATURES) { const m = re.exec(plain); if (m) { found.push(k); meta[`${key}.${k}`] = { confidence: 0.85, evidence: m[0] }; } }
  fields[key] = found;
}

const ROOMS_RE = /(\d+(?:[.,]5)?|[\p{L}]+(?:\s+(?:et|ו)\s*(?:demie?|חצי))?)\s*(?:pi[eè]ces?|chambres?|rooms?|חדרים|חד׳|חד'|\bp\b)/giu;
const parseRooms = (raw: string): number | null => {
  const n = Number(raw.replace(",", "."));
  if (!Number.isNaN(n) && /^\d/.test(raw)) return n;
  const t = tokens(raw); const half = t.some((x) => HALF.has(x));
  const base = findAmount(t.filter((x) => !HALF.has(x) && x !== "et" && x !== "ו").join(" "));
  return base ? base.value + (half ? 0.5 : 0) : null;
};
function rooms(text: string): { min?: number; max?: number; ev: string } | null {
  const range = /(?:de|entre|from|בין)?\s*(\d+(?:[.,]5)?)\s*(?:à|a|et|to|-|–|עד|ל)\s*(\d+(?:[.,]5)?)\s*(?:pi[eè]ces?|chambres?|rooms?|חדרים)/iu.exec(text);
  if (range) return { min: Number(range[1]!.replace(",", ".")), max: Number(range[2]!.replace(",", ".")), ev: range[0].trim() };
  for (let m = ROOMS_RE.exec(text); m; m = ROOMS_RE.exec(text)) { let v = parseRooms(m[1]!); if (v !== null && /^\s*(?:et\s+)?demie?\b/i.test(text.slice(m.index + m[0].length, m.index + m[0].length + 14))) v += 0.5; if (v !== null && v >= 1 && v <= 20) { ROOMS_RE.lastIndex = 0; return { min: v, max: v, ev: m[0].trim() }; } }
  ROOMS_RE.lastIndex = 0; return null;
}

const BUDGET_KW = /(budget|jusqu['’]?[àa]|maximum|\bmax\b|up to|under|תקציב|עד\s|\bpour\b|plafond)/giu;
function budget(text: string): { value: number; ev: string; currency: boolean } | null {
  for (let k = BUDGET_KW.exec(text); k; k = BUDGET_KW.exec(text)) {
    const a = findAmount(text, k.index + k[0].length);
    if (a && a.start - (k.index + k[0].length) < 40 && a.value >= 1000) { BUDGET_KW.lastIndex = 0; return { value: a.value, ev: text.slice(k.index, a.end + 8).trim(), currency: a.hasCurrency }; }
  }
  BUDGET_KW.lastIndex = 0; return null;
}

const VERBS = /\b(cherche|recherche|souhaite|veut|voudrait|d[eé]sire|looking|wants|searching|interested)\b|מחפש|מחפשת|רוצה|מעוניין|מעוניינת|מעוניינים/iu;

export function extractContact(text: string, cities: CityRef[]): ExtractResult {
  const fields: Record<string, any> = {}, meta: Record<string, FieldMeta> = {};
  const t = text.replace(/\s+/g, " ").trim();

  const ph = /(?:\+?972[\s-]?|0)5\d[\s-]?\d{3}[\s-]?\d{4}|\+\d[\d\s-]{8,16}\d/.exec(t);
  if (ph) { const e = normalizePhone(ph[0]); if (e) { fields.phone = e; meta.phone = { confidence: 0.95, evidence: ph[0] }; } }
  const em = /[\w.+-]+@[\w-]+\.[\w.-]+/.exec(t); if (em) { fields.email = em[0]; meta.email = { confidence: 0.95, evidence: em[0] }; }

  // identité : segment avant le premier verbe de recherche
  const v = VERBS.exec(t); const prefix = v ? t.slice(0, v.index) : t.slice(0, 60);
  const lat = [...prefix.matchAll(/\b([A-ZÉÈÀÂÎÔÛÇ][\p{Ll}'’-]+)\b/gu)].map((m) => m[1]!).filter((w) => !/^(Monsieur|Madame|Mme|Client|Cliente|Nouveau|Nouvelle|Le|La)$/.test(w));
  const he = [...prefix.matchAll(/[א-ת]{2,}(?:[׳'][א-ת]*)?/g)].map((m) => m[0]).filter((w) => !/^(לקוח|לקוחה|חדש|חדשה|שם)$/.test(w));
  if (lat.length) { fields.first_name = lat[0]; meta.first_name = { confidence: 0.7, evidence: lat[0] }; if (lat[1]) { fields.last_name = lat.slice(1, 3).join(" "); meta.last_name = { confidence: 0.65, evidence: lat.slice(1, 3).join(" ") }; } }
  if (he.length) {
    const hs = he.filter((w) => !/^(עולה|עולים|עלה|דיבר)$/.test(w)).slice(0, 3);
    if (hs[0]) { fields.first_name_he = hs[0]; meta.first_name_he = { confidence: 0.7, evidence: hs[0] }; }
    if (hs[1]) { fields.last_name_he = hs[1]; meta.last_name_he = { confidence: 0.65, evidence: hs[1] }; }
  }

  // langue préférée : uniquement si dite explicitement
  const lang = /parle\s+(fran[cç]ais|h[eé]breu|anglais)|francophone|דוברת?\s+(צרפתית|עברית|אנגלית)|speaks?\s+(french|hebrew|english)/iu.exec(t);
  if (lang) { const w = norm(lang[0]); fields.preferred_locale = /fran|צרפת|french/.test(w) ? "fr" : /hebr|עבר/.test(w) ? "he" : "en"; meta.preferred_locale = { confidence: 0.85, evidence: lang[0] }; }

  // type de contact + transaction
  const rent = /\blouer\b|location|לשכור|השכרה|to rent|\brent\b/iu.test(t), buy = /acheter|achat|לקנות|רכישה|to buy|purchase/iu.test(t) || (!rent && VERBS.test(t));
  const kinds: string[] = [];
  if (/vendeur|vendre|מוכר|למכור|to sell/iu.test(t) && !buy) kinds.push("seller");
  else if (/bailleur|propri[eé]taire|משכיר|להשכיר|landlord/iu.test(t) && !rent) kinds.push("landlord");
  else if (rent) kinds.push("tenant"); else kinds.push("buyer");
  if (/investisseur|משקיע|investor/iu.test(t)) kinds.push("investor");
  fields.kinds = kinds; meta.kinds = { confidence: 0.6 };
  fields.transaction = rent ? "rent" : "sale"; meta.transaction = { confidence: rent || buy ? 0.8 : 0.5 };

  const a = /(?:ol[eé]h?|olim|עולה|עולים|עלה|alyah|aliyah|עלייה)[^.]{0,40}/iu.exec(t);
  if (a) { fields.aliyah_status = /pr[eé]|avant|לפני|will|va faire/iu.test(a[0]) ? "pre_aliyah" : "recent"; meta.aliyah_status = { confidence: 0.7, evidence: a[0].trim() }; }

  const cs = findCities(t, cities); fields.city_ids = cs.map((c) => c.id); cs.forEach((c) => (meta[`city.${c.id}`] = { confidence: 0.85, evidence: c.evidence })); if (cs.length) meta.city_ids = { confidence: 0.85, evidence: cs.map((c) => c.evidence).join(", ") };
  const r = rooms(t); if (r) { fields.rooms_min = r.min; fields.rooms_max = r.max; meta.rooms_min = { confidence: 0.85, evidence: r.ev }; meta.rooms_max = { confidence: 0.85, evidence: r.ev }; }
  const b = budget(t); if (b) { fields.budget_max = b.value; meta.budget_max = { confidence: b.currency ? 0.85 : 0.6, evidence: b.ev }; }
  features(t, fields, meta, "must_have");
  // « indispensable » seulement si formulé comme besoin : sinon confiance réduite
  for (const k of ALL_FEATURES) if (fields.must_have.includes(k) && !/faut|indispensable|obligatoire|חייב|חובה|must|need/iu.test(t)) meta[`must_have.${k}`] = { confidence: 0.55, evidence: meta[`must_have.${k}`]?.evidence };
  fields.notes = text.trim().slice(0, 500);

  const missing: string[] = [];
  if (!fields.first_name && !fields.last_name && !fields.first_name_he && !fields.last_name_he) missing.push("first_name");
  if (!fields.phone) missing.push("phone");
  return { fields, meta, missing };
}

const TYPES: [string, RegExp][] = [["penthouse", /penthouse|פנטהאוז/i], ["duplex", /duplex|דופלקס/i], ["garden_apt", /jardin|גינה|garden/i], ["house", /maison|villa|בית פרטי|\bhouse\b|קוטג/i], ["apartment", /appartement|דירה|apartment|\bflat\b/i]];
export function extractProperty(text: string, cities: CityRef[]): ExtractResult {
  const fields: Record<string, any> = {}, meta: Record<string, FieldMeta> = {};
  const t = text.replace(/\s+/g, " ").trim();
  const rent = /[àa] louer|להשכרה|for rent/iu.test(t), sale = /[àa] vendre|למכירה|for sale/iu.test(t);
  if (rent || sale) { fields.transaction = rent ? "rent" : "sale"; meta.transaction = { confidence: 0.85 }; }
  for (const [k, re] of TYPES) { const m = re.exec(t); if (m) { fields.property_type = k; meta.property_type = { confidence: 0.8, evidence: m[0] }; break; } }
  const cs = findCities(t, cities); if (cs[0]) { fields.city_id = cs[0].id; meta.city_id = { confidence: 0.85, evidence: cs[0].evidence }; }
  const r = rooms(t); if (r) { fields.rooms = r.min; meta.rooms = { confidence: 0.85, evidence: r.ev }; }
  const area = /(\d{2,4})\s*(?:m²|m2|mètres? carrés?|מ"ר|מ״ר|מטר|sqm|sq\.? ?m)/iu.exec(t); if (area) { fields.area_built = Number(area[1]); meta.area_built = { confidence: 0.85, evidence: area[0] }; }
  const fl = /(?:[eé]tage|קומה|floor)\s*(\d{1,2})(?:\s*(?:sur|\/|מתוך|of)\s*(\d{1,2}))?/iu.exec(t); if (fl) { fields.floor = Number(fl[1]); meta.floor = { confidence: 0.85, evidence: fl[0] }; if (fl[2]) { fields.floors_total = Number(fl[2]); meta.floors_total = { confidence: 0.8, evidence: fl[0] }; } }
  const st = /(?:rue|רחוב|street|st\.)\s+([\p{L}'’ .-]{3,30}?)(?:\s+(\d{1,3}))?(?=[,.;]|\s+(?:à|ב|in|a)(?![\p{L}])|$|\s+\d)/iu.exec(t);
  if (st) { fields.street = st[1]!.trim(); meta.street = { confidence: 0.65, evidence: st[0] }; if (st[2]) { fields.house_number = st[2]; meta.house_number = { confidence: 0.65, evidence: st[0] }; } }
  const pk = /(?:prix|מחיר|price|asking|[àa] vendre\s+[àa]|loyer|שכירות)\s*:?\s*/iu.exec(t);
  const pa = pk ? findAmount(t, pk.index + pk[0].length) : null;
  if (pa && pa.value >= 500) { fields.price = pa.value; meta.price = { confidence: pa.hasCurrency ? 0.85 : 0.6, evidence: t.slice(pk!.index, pa.end + 8).trim() }; }
  const feat: Record<string, any> = {}; features(t, feat, meta, "features");
  for (const k of feat.features) { if (k === "parking") fields.parking_count = 1; else fields[k] = true; }
  fields.notes = text.trim().slice(0, 500);
  const missing: string[] = []; if (!fields.price) missing.push("price"); if (!fields.city_id) missing.push("city_id");
  return { fields, meta, missing };
}
