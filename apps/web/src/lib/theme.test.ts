import { describe, expect, it } from "vitest";
import { accentStep, brandScale, contrast, themeCss, STEPS } from "./theme";

const v = (css: string, name: string) => css.match(new RegExp(`${name}:(#[0-9a-f]{6})`))?.[1] ?? "";

describe("thème d'agence", () => {
  it("génère les 11 pas de l'échelle", () => {
    expect(Object.keys(brandScale("#d6336c"))).toHaveLength(STEPS.length);
  });

  it.each(["#1f4fd8", "#d6336c", "#f6c90e", "#0e8f6e", "#ffffff", "#000000", "#fff200"])(
    "le pas d'accent de %s garde un contraste AA avec le blanc",
    (hex) => {
      const scale = brandScale(hex);
      expect(contrast(scale[accentStep(scale)]!, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("injecte des variables CSS exploitables côté serveur", () => {
    const css = themeCss("#d6336c", 8);
    expect(css).toContain("--accent:");
    expect(css).toContain("--rail:");
    expect(css).toContain("--radius:8px");
  });

  it.each(["#d6336c", "#f6c90e", "#0e8f6e", "#ffffff", "#000000", "#fff200"])("le rail de %s reste lisible", (hex) => {
    const css = themeCss(hex);
    expect(contrast(v(css, "--rail-text"), v(css, "--rail"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(v(css, "--rail-muted"), v(css, "--rail"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(v(css, "--rail-text"), v(css, "--rail-active"))).toBeGreaterThanOrEqual(4.5);
  });

  it("garde les tokens de la charte sans couleur choisie, y compris avec l'ancien bleu par défaut", () => {
    for (const hex of [null, undefined, "#1f4fd8", "#0F3F50"]) {
      const css = themeCss(hex, 6);
      expect(css).not.toContain("--accent:");
      expect(css).toContain("--radius:6px");
    }
  });

  it("prévoit un thème sombre pour la couleur d'agence", () => {
    expect(themeCss("#d6336c")).toContain('[data-theme="dark"]');
  });
});
