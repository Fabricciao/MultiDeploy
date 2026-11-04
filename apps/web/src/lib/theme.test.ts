import { describe, expect, it } from "vitest";
import { accentStep, brandScale, contrast, themeCss, STEPS } from "./theme";

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
    const css = themeCss("#1f4fd8", 8);
    expect(css).toContain("--accent:");
    expect(css).toContain("--radius:8px");
  });
});
