import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { docLocales, visitSheetHtml, TEXT, type Loc } from "./html";
import { loadFonts, renderPdf } from "../poster/render";

const hasChromium = !!process.env.CHROMIUM_PATH || existsSync("/opt/pw-browsers/chromium");
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const fonts = { sans: "x", sansBold: "x", sansHe: "x", sansHeBold: "x", display: "x", displayHe: "x" };
const base = { reference: "EI-0001", agent: "Yaël", signer: "<script>alert(1)</script>", signaturePng: PNG, fingerprint: "ab".repeat(32) };
const parts = (l: Loc) => docLocales(l).map((locale) => ({ locale, orgName: "Eliezer.immo", address: "Ahuza 10, Raanana", startsAt: "5 nov. 2026", signedAt: "5 nov." }));

describe("bon de visite", () => {
  it("échappe les données et pose la direction", () => {
    const h = visitSheetHtml({ ...base, parts: parts("he") }, fonts);
    expect(h).toContain('dir="rtl"'); expect(h).not.toContain("<script>"); expect(h).toContain("&lt;script&gt;");
    expect(h).not.toContain(TEXT.fr.title);
  });
  it("l'hébreu est toujours présent, suivi de la traduction", () => {
    expect(docLocales("he")).toEqual(["he"]); expect(docLocales("fr")).toEqual(["he", "fr"]); expect(docLocales("en")).toEqual(["he", "en"]);
    const h = visitSheetHtml({ ...base, parts: parts("fr") }, fonts);
    expect(h).toContain(TEXT.he.title); expect(h).toContain(TEXT.fr.title); expect(h).toContain(TEXT.fr.translation);
    expect(h.indexOf(TEXT.he.title)).toBeLessThan(h.indexOf(TEXT.fr.title));
    expect(h).toContain('lang="fr" dir="ltr"');
  });
  it("trois langues, mêmes déclarations", () => { expect(TEXT.fr.declare.length).toBe(TEXT.he.declare.length); expect(TEXT.en.declare.length).toBe(3); });
  it.skipIf(!hasChromium)("génère un PDF valide", async () => {
    for (const locale of ["fr", "he"] as const) {
      const pdf = await renderPdf(visitSheetHtml({ ...base, parts: parts(locale), signer: locale === "he" ? "ישראל ישראלי" : "Jean Dupont" }, await loadFonts()));
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-"); expect(pdf.length).toBeGreaterThan(5000);
    }
  }, 60000);
});
