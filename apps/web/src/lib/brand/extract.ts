import { parse } from "node-html-parser";
import { converter, parse as parseColor, formatHex } from "culori";

const toOklch = converter("oklch");
export type BrandProposal = {
  colors: { primary: string; secondary: string; accent: string };
  fonts: { latin: string | null; hebrew: string };
  siteName: string | null; logoUrl: string | null; signals: string[];
};

const HEX = /#(?:[0-9a-f]{3}){1,2}\b/gi;
const GENERIC = new Set(["inherit", "initial", "unset", "sans-serif", "serif", "monospace", "system-ui", "ui-sans-serif", "ui-serif", "cursive", "fantasy", "-apple-system", "blinkmacsystemfont", "segoe ui", "arial", "helvetica", "helvetica neue", "times new roman", "georgia", "roboto"]);

const norm = (c: string) => { const p = parseColor(c); return p ? formatHex(p) : null; };
const lch = (hex: string) => { const o = toOklch(parseColor(hex)!); return { l: o?.l ?? 0, c: o?.c ?? 0, h: o?.h ?? 0 }; };
const saturated = (hex: string) => { const { l, c } = lch(hex); return c >= 0.08 && l > 0.2 && l < 0.85; };
const hueDist = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

/** Extraction déterministe (HTML + CSS déjà récupérés). Aucune IA : chaque couleur retenue est justifiée dans `signals`. */
export function extractBrand(html: string, cssTexts: string[], baseUrl: string): BrandProposal {
  const root = parse(html);
  const signals: string[] = [];
  const css = [...cssTexts, ...root.querySelectorAll("style").map((s) => s.text)].join("\n");

  // 1) couleurs : theme-color > variables CSS « marque » > couleurs saturées les plus fréquentes
  const themeColor = norm(root.querySelector('meta[name="theme-color"]')?.getAttribute("content") ?? "");
  const varColors: Record<string, string> = {};
  for (const m of css.matchAll(/--([\w-]*(?:primary|brand|accent|main|secondary)[\w-]*)\s*:\s*(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/gi)) { const c = norm(m[2]!); if (c) varColors[m[1]!.toLowerCase()] = c; }
  const freq = new Map<string, number>();
  for (const m of css.matchAll(HEX)) { const c = norm(m[0]); if (c) freq.set(c, (freq.get(c) ?? 0) + 1); }
  for (const m of css.matchAll(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi)) { const c = norm(`rgb(${m[1]},${m[2]},${m[3]})`); if (c) freq.set(c, (freq.get(c) ?? 0) + 1); }
  const ranked = [...freq.entries()].filter(([c]) => saturated(c)).sort((a, b) => b[1] - a[1]).map(([c]) => c);

  const varPrimary = Object.entries(varColors).find(([k]) => /primary|brand|main/.test(k))?.[1];
  const varSecondary = Object.entries(varColors).find(([k]) => /secondary/.test(k))?.[1];
  const varAccent = Object.entries(varColors).find(([k]) => /accent/.test(k))?.[1];
  let primary = (themeColor && saturated(themeColor) ? themeColor : undefined) ?? (varPrimary && saturated(varPrimary) ? varPrimary : undefined) ?? ranked[0];
  if (primary) signals.push(themeColor && primary === themeColor ? "theme-color" : varPrimary && primary === varPrimary ? "css-variable" : "frequent-color");
  else { primary = "#1f4fd8"; signals.push("default-primary"); }
  const pl = lch(primary);
  const others = ranked.filter((c) => c !== primary);
  const secondary = varSecondary ?? others.find((c) => hueDist(lch(c).h, pl.h) > 40) ?? formatHex({ mode: "oklch", l: 0.28, c: 0.06, h: pl.h })!;
  const accent = varAccent ?? others.find((c) => c !== secondary && hueDist(lch(c).h, pl.h) > 25) ?? formatHex({ mode: "oklch", l: 0.68, c: 0.14, h: (pl.h + 150) % 360 })!;

  // 2) polices
  const fams: string[] = [];
  for (const l of root.querySelectorAll('link[href*="fonts.googleapis.com"]')) for (const m of (l.getAttribute("href") ?? "").matchAll(/family=([^:&]+)/g)) fams.push(decodeURIComponent(m[1]!.replace(/\+/g, " ")));
  for (const m of css.matchAll(/font-family\s*:\s*([^;}{]+)/gi)) for (const f of m[1]!.split(",")) { const n = f.trim().replace(/^["']|["']$/g, ""); if (n && !GENERIC.has(n.toLowerCase()) && !n.startsWith("var(")) fams.push(n); }
  const latin = fams[0] ?? null;
  if (latin) signals.push("font");

  // 3) logo
  const abs = (u: string | undefined) => { try { return u ? new URL(u, baseUrl).toString() : null; } catch { return null; } };
  const logoImg = root.querySelectorAll("img").find((i) => /logo/i.test(`${i.getAttribute("class") ?? ""} ${i.getAttribute("alt") ?? ""} ${i.getAttribute("src") ?? ""} ${i.getAttribute("id") ?? ""}`));
  const logoUrl = abs(logoImg?.getAttribute("src")) ?? abs(root.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href")) ?? abs(root.querySelector('meta[property="og:image"]')?.getAttribute("content")) ?? abs(root.querySelector('link[rel~="icon"]')?.getAttribute("href"));
  if (logoUrl) signals.push("logo");
  const siteName = root.querySelector('meta[property="og:site_name"]')?.getAttribute("content") ?? root.querySelector("title")?.text.trim().split(/[|–—-]/)[0]?.trim() ?? null;
  return { colors: { primary, secondary, accent }, fonts: { latin, hebrew: "Heebo" }, siteName, logoUrl, signals };
}

export const isHexColor = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
