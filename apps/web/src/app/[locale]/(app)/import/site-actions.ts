"use server";
import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/session";
import { rateLimit } from "@/lib/ratelimit";
import { listCitiesWithAliases } from "@/lib/data/geo";
import { scanSite, type ScanResult } from "@/lib/site-import/crawl";
import { alreadyImported, importSiteListings, sanitizeListing, type SiteImportReport } from "@/lib/site-import/apply";
import type { SiteListing } from "@/lib/site-import/parse";

export type ScanState = (ScanResult & { imported: string[] }) | { error: "forbidden" | "rate" | "invalid_url" } | null;
export type SiteImportState = { report?: SiteImportReport; error?: "forbidden" | "empty" } | null;
const loc = (fd: FormData) => { const l = String(fd.get("locale")); return ["fr", "he", "en"].includes(l) ? l : "fr"; };

export async function scanSiteAction(_p: ScanState, fd: FormData): Promise<ScanState> {
  const ctx = await getCtx(loc(fd));
  if (!ctx.caps.has("properties.write") || ctx.impersonating) return { error: "forbidden" };
  if (!rateLimit(`sitescan:${ctx.orgId}`, 6, 600_000).ok) return { error: "rate" };
  const url = String(fd.get("url") ?? "").trim().slice(0, 300);
  if (url.length < 4) return { error: "invalid_url" };
  const r = await scanSite(url, await listCitiesWithAliases(ctx));
  return { ...r, imported: [...await alreadyImported(ctx, r.listings.map((l) => l.url))] };
}

export async function importSiteAction(_p: SiteImportState, fd: FormData): Promise<SiteImportState> {
  const locale = loc(fd); const ctx = await getCtx(locale);
  if (!ctx.caps.has("properties.write") || ctx.impersonating) return { error: "forbidden" };
  let raw: unknown; try { raw = JSON.parse(String(fd.get("items") ?? "[]")); } catch { return { error: "empty" }; }
  const ids = new Set((await listCitiesWithAliases(ctx)).map((c) => c.id));
  const items = (Array.isArray(raw) ? raw : []).map((x) => sanitizeListing(x, ids)).filter((x): x is SiteListing => !!x);
  if (!items.length) return { error: "empty" };
  const report = await importSiteListings(ctx, items, locale);
  revalidatePath(`/${locale}/properties`);
  return { report };
}
