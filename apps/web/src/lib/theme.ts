import { converter, formatHex, wcagContrast, parse, type Oklch } from "culori";

export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const L: Record<number, number> = { 50: 0.97, 100: 0.94, 200: 0.88, 300: 0.8, 400: 0.7, 500: 0.6, 600: 0.52, 700: 0.44, 800: 0.36, 900: 0.28, 950: 0.2 };
const toOklch = converter("oklch");

export const contrast = (a: string, b: string) => wcagContrast(a, b);

/** Échelle de marque 50–950 en OKLCH, à partir d'une couleur d'agence (hex). */
export function brandScale(hex: string): Record<number, string> {
  const base = toOklch(parse(hex) ?? parse("#1f4fd8")!) as Oklch;
  const hue = base.h ?? 260;
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

/** CSS à injecter côté serveur dans <head> : aucune bascule visible au chargement. */
export function themeCss(brandHex: string, radius = 6, density: "comfortable" | "standard" | "compact" = "standard"): string {
  const scale = brandScale(brandHex);
  const step = accentStep(scale);
  const vars = STEPS.map((s) => `--brand-${s}:${scale[s]};`).join("");
  return `:root{${vars}--accent:${scale[step]};--accent-hover:${scale[Math.min(step + 100, 950) as 950]};--accent-soft:${scale[100]};--accent-text:${scale[Math.min(step + 100, 900) as 900]};--radius:${radius}px;--row-h:${{ comfortable: 40, standard: 36, compact: 30 }[density]}px;}`;
}

const HEX = /^#[0-9a-fA-F]{6}$/;
export const isHex = (v: string) => HEX.test(v);
