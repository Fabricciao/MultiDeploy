import { describe, expect, it } from "vitest";
import { esc, posterHtml, readableOn, type PosterData } from "./html";

const fonts = { inter: "data:font/woff2;base64,AA", heeboHe: "data:font/woff2;base64,AA", heeboLatin: "data:font/woff2;base64,AA" };
const base: PosterData = { locale: "he", format: "portrait", variant: "A", brand: { primary: "#0f766e", secondary: "#14304a", fontLatin: "Rubik", fontHebrew: "Heebo" }, orgName: "Eliezer.immo", tag: "למכירה", title: "4 חדרים · רעננה", place: "רעננה", price: "₪3,450,000", specs: ["112 מ״ר", "ממ״ד"], phone: "050-123-4567", agentName: "יעל", legal: "מתווך מורשה" };

describe("posterHtml", () => {
  it("hébreu : dir=rtl et lang=he ; téléphone isolé en LTR", () => { const h = posterHtml(base, fonts); expect(h).toContain('dir="rtl"'); expect(h).toContain('class="ltr"'); });
  it.each(["A", "B", "C"] as const)("variante %s rend le prix, la mention légale et la ville", (v) => {
    const h = posterHtml({ ...base, variant: v }, fonts);
    expect(h).toContain("₪3,450,000"); expect(h).toContain("מתווך מורשה"); expect(h).toContain("רעננה");
  });
  it.each(["square", "portrait", "story", "facebook", "a4"] as const)("format %s : dimensions du canevas", (f) => { expect(posterHtml({ ...base, format: f }, fonts)).toMatch(/html,body\{width:\d+px;height:\d+px/); });
  it("échappe le HTML saisi (titre, nom, mention légale)", () => {
    const h = posterHtml({ ...base, title: '<img src=x onerror=alert(1)>', agentName: '"><script>x</script>', legal: "<b>x</b>" }, fonts);
    expect(h).not.toContain("<script>"); expect(h).not.toContain("<img src=x"); expect(h).toContain("&lt;img src=x");
  });
  it("police latine invalide ignorée (pas d'injection CSS)", () => expect(posterHtml({ ...base, brand: { ...base.brand, fontLatin: "x';}</style><script>" } }, fonts)).not.toContain("</style><script>"));
  it("couleur invalide remplacée par une valeur sûre", () => expect(posterHtml({ ...base, brand: { ...base.brand, primary: "red;}body{display:none" } }, fonts)).not.toContain("display:none"));
  it("sans photo : fond de marque avec la ville", () => expect(posterHtml({ ...base, photo: null }, fonts)).toContain("nophoto"));
  it("texte lisible sur la couleur de marque", () => { expect(readableOn("#0f766e")).toBe("#ffffff"); expect(readableOn("#ffd24a")).toBe("#111111"); });
  it("esc", () => expect(esc(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;"));
});
