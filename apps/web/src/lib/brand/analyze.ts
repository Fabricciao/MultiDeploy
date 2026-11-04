import "server-only";
import { parse } from "node-html-parser";
import { extractBrand, type BrandProposal } from "./extract";
import { assertPublicUrl, safeFetch } from "./ssrf";

export type Analysis = BrandProposal & { sourceUrl: string; logo: { bytes: Buffer } | null };

/** Récupère la page d'accueil + 3 feuilles CSS max (mêmes garde-fous SSRF), puis extrait la charte. */
export async function analyzeSite(rawUrl: string): Promise<Analysis> {
  const input = /^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`;
  await assertPublicUrl(input);
  const page = await safeFetch(input, { maxBytes: 1_500_000, types: /text\/html|application\/xhtml/i });
  const html = page.body.toString("utf8");
  const root = parse(html);
  const cssUrls = root.querySelectorAll('link[rel~="stylesheet"]').map((l) => l.getAttribute("href")).filter(Boolean).slice(0, 3) as string[];
  const css: string[] = [];
  for (const href of cssUrls) { try { css.push((await safeFetch(new URL(href, page.url).toString(), { maxBytes: 800_000, types: /css/i, timeoutMs: 5000 })).body.toString("utf8")); } catch { /* feuille inaccessible : on continue */ } }
  const proposal = extractBrand(html, css, page.url);
  let logo: Analysis["logo"] = null;
  if (proposal.logoUrl) { try { const r = await safeFetch(proposal.logoUrl, { maxBytes: 3_000_000, types: /image\//i, timeoutMs: 5000 }); logo = { bytes: r.body }; } catch { /* logo non récupérable */ } }
  return { ...proposal, sourceUrl: page.url, logo };
}
