import "server-only";
import { parse } from "node-html-parser";
import { FetchError, safeFetch } from "../brand/ssrf";
import type { CityRef } from "../intake/extract";
import { LISTING_PATH, SKIP_PATH, listingImages, parseListing, type SiteListing } from "./parse";

/**
 * Exploration du site d'une agence, sans IA : plan du site (sitemap.xml, robots.txt), puis liens des pages d'accueil et de listes
 * (« à vendre », « à louer »…). Seules les pages du même domaine sont lues, avec le fetch durci (pas d'adresses internes).
 */
const MAX_PAGES = 120, CONCURRENCY = 5;
const LIST_HINT = /vendre|louer|vente|location|sale|rent|buy|acheter|properties|biens|annonces|listings|nekasim|למכירה|להשכרה|נכסים|דירות/i;

async function get(url: string, xml = false): Promise<{ body: string; url: string } | null> {
  try { const r = await safeFetch(url, { maxBytes: 3_000_000, types: xml ? /xml|text\/plain|text\/html/i : /text\/html|application\/xhtml/i, timeoutMs: 10_000 }); return { body: r.body.toString("utf8"), url: r.url }; }
  catch { return null; }
}
const sameSite = (a: URL, b: URL) => a.hostname.replace(/^www\./, "") === b.hostname.replace(/^www\./, "");
const canon = (u: URL) => { u.hash = ""; u.search = ""; if (!u.pathname.endsWith("/") && !/\.[a-z]{2,4}$/i.test(u.pathname)) u.pathname += "/"; return u.toString(); };

export type ScanResult = { site: string; pagesRead: number; listings: SiteListing[]; error?: "invalid_url" | "blocked" | "unreachable" | "none_found" };

export async function scanSite(rawUrl: string, cities: CityRef[]): Promise<ScanResult> {
  let base: URL;
  try { base = new URL(/^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`); } catch { return { site: rawUrl, pagesRead: 0, listings: [], error: "invalid_url" }; }
  let home: { body: string; url: string };
  try { home = await safeFetch(base.toString(), { maxBytes: 3_000_000, types: /text\/html/i, timeoutMs: 12_000 }).then((r) => ({ body: r.body.toString("utf8"), url: r.url })); }
  catch (e) { return { site: base.hostname, pagesRead: 0, listings: [], error: e instanceof FetchError && e.code === "blocked" ? "blocked" : e instanceof FetchError && e.code === "invalid_url" ? "invalid_url" : "unreachable" }; }
  const origin = new URL(home.url);
  const detail = new Set<string>(), lists = new Set<string>();
  const consider = (href: string | undefined, from: string) => {
    if (!href) return; let u: URL; try { u = new URL(href, from); } catch { return; }
    if (!/^https?:$/.test(u.protocol) || !sameSite(u, origin) || SKIP_PATH.test(u.pathname)) return;
    const c = canon(u);
    if (LISTING_PATH.test(u.pathname) && u.pathname.split("/").filter(Boolean).length >= 2) detail.add(c);
    else if (LIST_HINT.test(decodeURIComponent(u.pathname)) && u.pathname.split("/").filter(Boolean).length <= 2) lists.add(c);
  };

  // 1) Plan du site (et sous-plans dont le nom évoque des biens).
  const smQueue = [`${origin.origin}/sitemap.xml`, `${origin.origin}/sitemap_index.xml`, `${origin.origin}/wp-sitemap.xml`];
  const robots = await get(`${origin.origin}/robots.txt`, true);
  for (const m of robots?.body.matchAll(/^sitemap:\s*(\S+)/gim) ?? []) smQueue.unshift(m[1]!);
  const seenSm = new Set<string>();
  while (smQueue.length && seenSm.size < 12) {
    const sm = smQueue.shift()!; if (seenSm.has(sm)) continue; seenSm.add(sm);
    const r = await get(sm, true); if (!r || !/<(?:urlset|sitemapindex)/i.test(r.body)) continue;
    const locs = [...r.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]!.replace(/&amp;/g, "&"));
    if (/<sitemapindex/i.test(r.body)) { for (const l of locs) if (/propert|listing|bien|annonce|estate|apartment|nekes|nadlan|home|product|post_type|posts-(?!post|page)/i.test(l)) smQueue.push(l); }
    else for (const l of locs) consider(l, sm);
  }
  // 2) Liens de l'accueil et des pages de listes (une profondeur, pagination simple incluse).
  const linksOf = (html: string, from: string) => parse(html).querySelectorAll("a[href]").forEach((a) => consider(a.getAttribute("href"), from));
  linksOf(home.body, home.url);
  for (const l of [...lists].slice(0, 8)) {
    const r = await get(l); if (!r) continue; linksOf(r.body, r.url);
    for (const pg of [2, 3]) { const r2 = await get(`${l}page/${pg}/`); if (!r2) break; linksOf(r2.body, r2.url); }
  }
  if (!detail.size) return { site: origin.hostname, pagesRead: 1, listings: [], error: "none_found" };

  // 3) Lecture des fiches.
  const urls = [...detail].slice(0, MAX_PAGES);
  const found: { l: SiteListing; imgs: string[] }[] = [];
  let read = 1, i = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (i < urls.length) {
      const u = urls[i++]!; const r = await get(u); read++;
      if (!r) continue;
      const l = parseListing(r.body, r.url, cities);
      if (l && (l.price !== null || l.rooms !== null || l.area_built !== null)) found.push({ l, imgs: listingImages(r.body, r.url) });
    }
  }));
  // Images présentes sur beaucoup de fiches = décor du site (logo, bannière) : retirées.
  const freq = new Map<string, number>(); for (const f of found) for (const im of new Set(f.imgs)) freq.set(im, (freq.get(im) ?? 0) + 1);
  const limit = found.length >= 4 ? Math.max(2, Math.ceil(found.length * 0.3)) : Infinity;
  const listings = found.map(({ l, imgs }) => ({ ...l, images: imgs.filter((im) => (freq.get(im) ?? 0) < limit).slice(0, 15) }));
  // Doublons (même fiche sous deux adresses) : même titre, prix et surface.
  // Doublons (même bien publié sous deux adresses) : on garde la fiche la plus complète.
  const score = (l: SiteListing) => [l.price, l.rooms, l.area_built, l.city_id, l.transaction].filter((x) => x !== null).length * 10 + l.images.length;
  listings.sort((a, b) => score(b) - score(a));
  const seen = new Set<string>(); const norm = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const uniq = listings.filter((l) => {
    const keys = [`t:${norm(l.title)}|${l.area_built ?? ""}`, ...(l.price !== null ? [`p:${l.price}|${l.rooms}|${l.area_built}`] : [])];
    if (keys.some((k) => seen.has(k)) || (l.price === null && [...seen].some((k) => k.startsWith(`t:${norm(l.title)}|`)))) return false;
    keys.forEach((k) => seen.add(k)); return true;
  });
  uniq.sort((a, b) => (a.transaction ?? "z").localeCompare(b.transaction ?? "z") || (b.price ?? 0) - (a.price ?? 0));
  return { site: origin.hostname, pagesRead: read, listings: uniq, error: uniq.length ? undefined : "none_found" };
}
