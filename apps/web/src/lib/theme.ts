import { converter, formatHex, wcagContrast, parse, type Oklch } from "culori";

export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const L: Record<number, number> = { 50: 0.97, 100: 0.94, 200: 0.88, 300: 0.8, 400: 0.7, 500: 0.6, 600: 0.52, 700: 0.44, 800: 0.36, 900: 0.28, 950: 0.2 };
const toOklch = converter("oklch");

/** Couleur de marque NadlanHub (Yam 800). */
export const DEFAULT_BRAND = "#0F3F50";
/** Ancienne valeur par défaut stockée en base : une agence qui l'a encore n'a pas choisi de couleur. */
const LEGACY_DEFAULT = "#1f4fd8";

export const contrast = (a: string, b: string) => wcagContrast(a, b);

/** Échelle de marque 50–950 en OKLCH, à partir d'une couleur d'agence (hex). */
export function brandScale(hex: string): Record<number, string> {
  const base = toOklch(parse(hex) ?? parse(DEFAULT_BRAND)!) as Oklch;
  const hue = base.h ?? 222;
  const chroma = Math.min(base.c ?? 0.15, 0.2);
  const out: Record<number, string> = {};
  for (const s of STEPS) {
    // chroma réduit aux extrêmes pour rester dans la gamme sRGB
    const k = s <= 100 || s >= 900 ? 0.35 : s <= 200 || s >= 800 ? 0.65 : 1;
    out[s] = formatHex({ mode: "oklch", l: L[s]!, c: chroma * k, h: hue })!;
  }
  return out;
}

/**
 * Choisit le pas de l'échelle utilisé pour les boutons/liens : le plus clair qui garde
 * un contraste AA (≥ 4.5) avec du blanc. Évite les thèmes d'agence illisibles.
 */
export function accentStep(scale: Record<number, string>): number {
  for (const s of [500, 600, 700, 800, 900] as const) if (contrast(scale[s]!, "#ffffff") >= 4.5) return s;
  return 900;
}

/** Couleurs du rail et des fonds doux : clarté fixe, seule la teinte vient de l'agence, donc toujours lisibles. */
function railVars(hex: string) {
  const base = toOklch(parse(hex) ?? parse(DEFAULT_BRAND)!) as Oklch;
  const h = base.h ?? 222, c = Math.min(base.c ?? 0.1, 0.2);
  const o = (l: number, k: number) => formatHex({ mode: "oklch", l, c: c * k, h })!;
  return {
    light: { "--rail": o(0.2, 0.3), "--rail-hover": o(0.27, 0.35), "--rail-active": o(0.34, 0.45), "--rail-text": o(0.95, 0.06), "--rail-muted": o(0.77, 0.15) },
    dark: { "--rail": o(0.14, 0.12), "--rail-hover": o(0.2, 0.14), "--rail-active": o(0.27, 0.22), "--rail-text": o(0.93, 0.05), "--rail-muted": o(0.72, 0.1), "--accent-soft": o(0.3, 0.35) },
  };
}

const decl = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `${k}:${v};`).join("");

/** CSS à injecter côté serveur : aucune bascule visible au chargement. Sans couleur d'agence, les tokens de la charte s'appliquent. */
export function themeCss(brandHex: string | null | undefined, radius = 6, density: "comfortable" | "standard" | "compact" = "standard"): string {
  const base = `--radius:${radius}px;--row-h:${{ comfortable: 52, standard: 44, compact: 36 }[density]}px;`;
  const custom = !!brandHex && brandHex.toLowerCase() !== LEGACY_DEFAULT && brandHex.toLowerCase() !== DEFAULT_BRAND.toLowerCase();
  if (!custom) return `:root{${base}}`;
  const scale = brandScale(brandHex);
  const step = accentStep(scale);
  const r = railVars(brandHex);
  const vars = STEPS.map((s) => `--brand-${s}:${scale[s]};`).join("");
  const light = `${vars}${decl(r.light)}--accent:${scale[step]};--accent-hover:${scale[Math.min(step + 100, 950) as 950]};--accent-soft:${scale[100]};--accent-text:${scale[Math.min(step + 100, 900) as 900]};--on-accent:#ffffff;--focus-ring:${scale[step]};`;
  const dark = `${decl(r.dark)}--accent:${scale[300]};--accent-hover:${scale[200]};--accent-text:${scale[200]};--on-accent:${scale[950]};--focus-ring:${scale[300]};`;
  return `:root{${base}${light}}@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${dark}}}:root[data-theme="dark"]{${dark}}`;
}

const HEX = /^#[0-9a-fA-F]{6}$/;
export const isHex = (v: string) => HEX.test(v);
