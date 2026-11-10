import { parse, type HTMLElement } from "node-html-parser";
import { findCities, type CityRef } from "../intake/extract";
import { findAmount } from "../intake/numbers";

/**
 * Lecture d'une fiche de bien sur le site d'une agence, SANS IA : données structurées (JSON-LD schema.org), balises Open Graph,
 * puis champs étiquetés du texte (« Pièces : 4 », « חדרים: 4 », « Area: 120 m² »…). Chaque champ garde sa source.
 */
export type SiteListing = {
  url: string; title: string; description: string | null; transaction: "sale" | "rent" | null; property_type: string | null;
  price: number | null; currency: "ILS" | "USD" | "EUR"; rooms: number | null; bedrooms: number | null; area_built: number | null; floor: number | null; floors_total: number | null;
  city_id: string | null; city_text: string | null; street: string | null; house_number: string | null; images: string[]; features: string[]; lang: "fr" | "he" | "en";
};

const TYPES: [RegExp, string][] = [[/penthouse|פנטהאוז|פנטהאוס/i, "penthouse"], [/duplex|דופלקס/i, "duplex"], [/rez[- ]de[- ]jardin|garden ?(?:apartment|flat)|דירת גן/i, "garden_apt"],
  [/cottage|קוטג/i, "cottage"], [/villa|maison|house|בית פרטי|וילה/i, "house"], [/terrain|land|plot|מגרש|קרקע/i, "land"], [/bureau|office|משרד/i, "office"], [/commerce|local commercial|shop|store|חנות/i, "shop"],
  [/appartement|apartment|flat|studio|דירה|דירת/i, "apartment"]];
const RENT = /(?:^|[^\p{L}])(?:[àa] louer|location|loyer|for rent|to rent|rental|להשכרה|השכרה|שכירות)(?:$|[^\p{L}])/iu;
const SALE = /(?:^|[^\p{L}])(?:[àa] vendre|vente|for sale|sale|למכירה|מכירה)(?:$|[^\p{L}])/iu;
const SIMILAR = /(biens similaires|annonces similaires|vous aimerez aussi|similar (?:properties|listings)|related (?:properties|listings)|you may also like|נכסים דומים|נכסים נוספים|עוד נכסים)/i;
const CUR: [RegExp, "ILS" | "USD" | "EUR"][] = [[/₪|nis|ils|ש"ח|ש״ח|שח/i, "ILS"], [/€|eur/i, "EUR"], [/\$|usd/i, "USD"]];

const num = (s: string | null | undefined) => { if (!s) return null; const n = Number(s.replace(/[\s  ]/g, "").replace(/,(?=\d{3}\b)/g, "").replace(",", ".")); return Number.isFinite(n) ? n : null; };
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const decode = (s: string) => s.replace(/&#8211;|&ndash;/g, "–").replace(/&#8217;|&rsquo;/g, "’").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&hellip;|&#8230;/g, "…");

/** Valeur après une étiquette (« Superficie : 167 m² ») dans le texte de la page. */
function labeled(t: string, labels: string, value: string): RegExpExecArray | null {
  // D'abord « Étiquette : valeur », sinon « Étiquette valeur » (listes de définitions sans deux-points).
  return new RegExp(`(?:${labels})\\s*[:：]\\s*${value}`, "iu").exec(t) ?? new RegExp(`(?:${labels})\\s+${value}`, "iu").exec(t);
}

function jsonLd(root: HTMLElement): Record<string, any>[] {
  const out: Record<string, any>[] = [];
  const walk = (x: any) => { if (!x || typeof x !== "object") return; if (Array.isArray(x)) { x.forEach(walk); return; } out.push(x); if (x["@graph"]) walk(x["@graph"]); if (x.mainEntity) walk(x.mainEntity); if (x.itemOffered) walk(x.itemOffered); };
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) { try { walk(JSON.parse(s.text)); } catch { /* JSON invalide : ignoré */ } }
  return out;
}
const LD_TYPES = /RealEstateListing|Residence|Apartment|House|SingleFamilyResidence|Accommodation|Product|Offer|Place/i;

export function parseListing(html: string, url: string, cities: CityRef[]): SiteListing | null {
  const root = parse(html, { blockTextElements: { script: true, style: true, noscript: false } });
  const meta = (p: string) => root.querySelector(`meta[property="${p}"]`)?.getAttribute("content") ?? root.querySelector(`meta[name="${p}"]`)?.getAttribute("content") ?? null;
  const ld = jsonLd(root).filter((o) => LD_TYPES.test(String(o["@type"] ?? "")));
  const pick = (k: string) => { for (const o of ld) { const v = o[k] ?? o.offers?.[k] ?? (Array.isArray(o.offers) ? o.offers[0]?.[k] : undefined); if (v !== undefined && v !== null && v !== "") return v; } return undefined; };

  // Contenu principal : sans en-tête, pied de page, navigation ni « biens similaires ».
  for (const sel of ["script", "style", "noscript", "header", "footer", "nav", "form", "svg", "iframe"]) root.querySelectorAll(sel).forEach((n) => n.remove());
  const main = root.querySelector("main") ?? root.querySelector("article") ?? root.querySelector("body") ?? root;
  let text = clean(decode(main.text));
  const h1 = clean(decode(root.querySelector("h1")?.text ?? ""));
  const sim = SIMILAR.exec(text); if (sim && sim.index > 200) text = text.slice(0, sim.index);
  const start = h1 ? Math.max(0, text.indexOf(h1)) : 0;
  const top = text.slice(start, start + 2500);

  const site = clean(decode(meta("og:site_name") ?? ""));
  const strip = (x: string) => { let y = x.replace(/\s*\|.*$/, ""); if (site) y = y.replace(new RegExp(`\\s*[–—-]\\s*${site.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), ""); return y.trim(); };
  const title = strip(clean(decode(String(pick("name") ?? (h1 || meta("og:title")) ?? ""))));
  if (!title) return null;

  // Transaction : URL, étiquette « Catégorie », puis début de fiche.
  const cat = labeled(top, "catégorie|category|statut|status|סטטוס|סוג עסקה", "([^:]{2,30}?)(?=\\s+\\p{L}+\\s*[:：]|$)");
  const txSrc = [decodeURIComponent(url), title, cat?.[1] ?? "", top.slice(0, 600)];
  let transaction: SiteListing["transaction"] = null;
  for (const s of txSrc) { const r = RENT.test(s), v = SALE.test(s); if (r !== v) { transaction = r ? "rent" : "sale"; break; } }

  // Prix
  let price = num(String(pick("price") ?? meta("product:price:amount") ?? meta("og:price:amount") ?? ""));
  let currency: SiteListing["currency"] = (String(pick("priceCurrency") ?? meta("product:price:currency") ?? "").toUpperCase() as SiteListing["currency"]) || "ILS";
  if (!["ILS", "USD", "EUR"].includes(currency)) currency = "ILS";
  if (!price) {
    const lp = labeled(top, "prix|price|loyer|rent|מחיר|שכר דירה", "");
    // Montants avec devise, hors prix au m² ; « Prix sur demande » = pas de prix.
    const onRequest = /prix sur demande|price on request|upon request|מחיר לפי בקשה|מחיר בהתאם/i.test(top.slice(0, 400));
    const cand = onRequest ? [] : [...top.matchAll(/(?:₪|€|\$)\s?\d[\d\s.,\u202f\u00a0]{2,}|\d[\d\s.,\u202f\u00a0]{2,}\s?(?:₪|€|\$|nis|ils|ש"ח|ש״ח|שח)/giu)]
      .filter((m) => !/^\s*(?:\/|par|per|ל)\s*(?:m²|m2|mètre|sqm|sq|מ"ר|מ״ר|מטר)/iu.test(top.slice(m.index! + m[0].length, m.index! + m[0].length + 12))).map((m) => ({ s: m[0], i: m.index! }));
    const first = lp ? cand.find((c) => c.i >= lp.index) ?? cand[0] : cand[0];
    if (first) { price = num(first.s.replace(/[^\d.,\s]/g, "").trim()); currency = CUR.find(([re]) => re.test(first.s))?.[1] ?? "ILS"; }
    else if (lp) { const a = findAmount(top, lp.index + lp[0].length); if (a && a.value >= 500) price = a.value; }
  }
  if (price !== null && (price < 300 || price > 500_000_000)) price = null;
  if (!transaction && /(?:\/|par|per)\s*(?:mois|month)|לחודש/i.test(top.slice(0, 800))) transaction = "rent";
  if (!transaction && price !== null && currency === "ILS") transaction = price < 40_000 ? "rent" : "sale";
  if (transaction === "sale" && price !== null && currency === "ILS" && price < 100_000) price = null; // prix au m² ou acompte : pas un prix de vente

  // Pièces, chambres, surface, étage
  const rl = labeled(top, "nombre de pièces|pièces|rooms?|חדרים|מספר חדרים", "(\\d{1,2}(?:[.,]5)?)") ?? /(\d{1,2}(?:[.,]5)?)\s*(?:pièces|pieces|rooms|חדרים|חד'?)(?![\p{L}])/iu.exec(top);
  const ldRooms = num(String(pick("numberOfRooms") ?? ""));
  let rooms = ldRooms ?? num(rl?.[1]);
  const bl = labeled(top, "nombre de chambres|chambres|bedrooms?|חדרי שינה", "(\\d{1,2})") ?? /(\d{1,2})\s*(?:chambres|bedrooms|חדרי שינה)/iu.exec(top);
  const bedrooms = num(String(pick("numberOfBedrooms") ?? "")) ?? num(bl?.[1]);
  if (rooms === null && bedrooms !== null) rooms = bedrooms + 1; // usage israélien : pièces = chambres + séjour
  if (rooms !== null && (rooms < 0.5 || rooms > 30 || (rooms * 2) % 1 !== 0)) rooms = null;
  const fs = pick("floorSize"); const ldArea = num(typeof fs === "object" ? String(fs?.value ?? "") : String(fs ?? ""));
  const al = labeled(top, "superficie|surface habitable|surface|area|size|living area|שטח|גודל|מ\"ר בנוי", "(\\d{2,5}(?:[.,]\\d)?)") ?? /(\d{2,5})\s*(?:m²|m2|mètres? carrés|sqm|sq\.? ?m|מ"ר|מ״ר|מטר)/iu.exec(top);
  let area_built = ldArea ?? num(al?.[1]); if (area_built !== null && (area_built < 8 || area_built > 20_000)) area_built = null;
  const fl = labeled(top, "étages?|etages?|floor|קומה", "(-?\\d{1,2})(?:\\s*(?:sur|/|מתוך|of|out of)\\s*(\\d{1,2}))?");
  const floor = num(fl?.[1]), floors_total = num(fl?.[2]) ?? num(labeled(top, "nombre d'étages|étages de l'immeuble|floors in building|total floors|קומות בבניין|מס' קומות", "(\\d{1,2})")?.[1]);

  // Type de bien : étiquette, sinon titre.
  const tl = labeled(top, "types? de biens?|type de bien|property type|type|סוג נכס|סוג הנכס", "([\\p{L} '-]{3,30})");
  const property_type = TYPES.find(([re]) => re.test(tl?.[1] ?? ""))?.[1] ?? TYPES.find(([re]) => re.test(title))?.[1] ?? null;

  // Adresse et ville
  const addr = pick("address");
  const street0 = typeof addr === "object" ? addr?.streetAddress : null;
  const locality = typeof addr === "object" ? addr?.addressLocality : typeof addr === "string" ? addr : null;
  const vl = labeled(top, "ville(?: / département)?|ville|city|localité|town|עיר|יישוב|ישוב", "([\\p{L}' -]{2,30}?)(?=\\s+\\p{L}+\\s*[:：]|\\s{2}|$|,)");
  const adl = labeled(top, "adresse|address|כתובת", "([^:]{4,60}?)(?=\\s+\\p{L}+\\s*[:：]|$)");
  const cityText = clean(String(vl?.[1] ?? locality ?? "")) || null;
  const city = [cityText, locality, title, adl?.[1], top.slice(0, 800)].filter(Boolean).map((s) => findCities(String(s), cities)[0]).find(Boolean) ?? null;
  let street: string | null = street0 ? clean(String(street0)) : adl ? clean(adl[1]!.split(",")[0]!) : null, house_number: string | null = null;
  if (street) { const m = /^(.*?)[\s,]+(\d{1,4}[a-zA-Z]?)$/.exec(street) ?? /^(\d{1,4}[a-zA-Z]?)\s+(.*)$/.exec(street); if (m) { if (/^\d/.test(m[1]!)) { house_number = m[1]!; street = m[2]!; } else { street = m[1]!; house_number = m[2]!; } } }
  if (street && street.length > 60) street = null;

  // Description : JSON-LD, sinon le plus long paragraphe du contenu principal, sinon méta.
  // Le plus long paragraphe, avec ses voisins du même bloc (descriptions en plusieurs paragraphes).
  const pEl = main.querySelectorAll("p").filter((p) => clean(p.text).length > 60).sort((a, b) => clean(b.text).length - clean(a.text).length)[0];
  const block = pEl?.parentNode ? clean(decode(pEl.parentNode.querySelectorAll("p").map((p) => p.text).join("\n"))) : "";
  const ldDesc = pick("description"); const longest = block.length > 60 && block.length <= 4000 ? block : pEl ? clean(decode(pEl.text)) : undefined;
  let description = clean(decode(String(ldDesc ?? ""))).replace(/\s*\[…\]$/, "");
  if (!description || description.length < 80) description = longest ?? clean(decode(meta("og:description") ?? meta("description") ?? ""));
  description = description.slice(0, 4000);

  // Équipements
  const features: string[] = [];
  const F: [string, RegExp][] = [["mamad", /mamad|ממ"ד|ממ״ד|safe room|abri/i], ["elevator", /ascenseur|elevator|lift|מעלית/i], ["parking", /parking|חניה|חנייה/i], ["sukkah_balcony", /souc?cah?|sukkah|מרפסת סוכה/i], ["storage", /cave|storage|מחסן/i], ["ac", /climatisation|air[- ]?condition|מיזוג/i]];
  for (const [k, re] of F) if (re.test(top)) features.push(k);

  const lang: SiteListing["lang"] = /[֐-׿]{3,}/.test(title + " " + description.slice(0, 200)) ? "he" : /[àâçéèêëîïôûùüÿœ]|\b(le|la|les|des|une|avec|dans)\b/i.test(description.slice(0, 400) + " " + title) ? "fr" : "en";
  return { url, title: title.slice(0, 160), description: description || null, transaction, property_type, price, currency, rooms, bedrooms, area_built, floor, floors_total,
    city_id: city?.id ?? null, city_text: cityText, street, house_number, images: [], features, lang };
}

/** Photos du bien (avant « biens similaires ») : JSON-LD, Open Graph, galerie. Les tailles WordPress (-300x200) sont ramenées à l'original. */
export function listingImages(html: string, url: string): string[] {
  // On coupe à « biens similaires » trouvé APRÈS le titre de la fiche (pas dans un menu en haut de page).
  const h1 = Math.max(0, html.search(/<h1[\s>]/i)); const re = new RegExp(SIMILAR.source, "gi"); re.lastIndex = h1;
  const cut = re.exec(html); const part = cut ? html.slice(0, cut.index) : html;
  const root = parse(part);
  const out: string[] = [];
  const add = (u: string | null | undefined) => {
    if (!u || u.startsWith("data:")) return;
    let abs: URL; try { abs = new URL(u.trim(), url); } catch { return; }
    if (!/^https?:$/.test(abs.protocol) || !/\.(jpe?g|png|webp)(?:$|\?)/i.test(abs.pathname)) return;
    if (/(?:^|[/_.-])(?:logo|icons?|favicon|avatar|placeholder|sprite|flags?|banner)(?:[/_.-]|$)|whatsapp\.(?:png|svg)|cropped-/i.test(abs.pathname)) return;
    abs.pathname = abs.pathname.replace(/-\d{2,4}x\d{2,4}(?=\.(?:jpe?g|png|webp)$)/i, "").replace(/-scaled(?=\.(?:jpe?g|png|webp)$)/i, "");
    const s = abs.toString(); if (!out.includes(s)) out.push(s);
  };
  for (const o of jsonLd(root)) { const im = o.image; (Array.isArray(im) ? im : [im]).forEach((x: any) => add(typeof x === "object" ? x?.url : x)); }
  add(root.querySelector('meta[property="og:image"]')?.getAttribute("content"));
  for (const a of root.querySelectorAll("a[href]")) add(a.getAttribute("href"));
  for (const m of part.matchAll(/background-image:\s*url\((['"]?)([^'")]+)\1\)/gi)) add(m[2]);
  for (const i of root.querySelectorAll("img")) {
    const ss = i.getAttribute("srcset") ?? i.getAttribute("data-srcset"); const big = ss?.split(",").map((x) => x.trim().split(/\s+/)[0]).pop();
    add(i.getAttribute("data-src") ?? i.getAttribute("data-lazy-src") ?? i.getAttribute("data-full") ?? big ?? i.getAttribute("src"));
  }
  return out.slice(0, 40);
}

/** URL qui ressemble à une fiche de bien (et pas à une page de liste, d'article ou de catégorie). */
export const LISTING_PATH = /\/(?:property|properties|listing|listings|annonce|annonces|bien|biens|immobilier|real-estate|realestate|apartment|apartments|appartement|nekes|nehasim|nadlan|estate|homes?|for-sale|for-rent|a-vendre|a-louer|sale|rent|vente|location|דירה|דירות|נכס|נכסים)\/[^/?#]{2,}/i;
export const SKIP_PATH = /\/(?:wp-|feed|tag|category|categorie|author|page\/\d|blog|news|actualites?|conseils|contact|about|a-propos|privacy|legal|cart|account|login|search)(?:\/|$)|\.(?:pdf|jpe?g|png|webp|gif|svg|css|js|xml|zip)$/i;
