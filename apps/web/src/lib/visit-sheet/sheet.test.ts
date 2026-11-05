import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { visitSheetHtml, TEXT } from "./html";
import { loadFonts, renderPdf } from "../poster/render";

const hasChromium = !!process.env.CHROMIUM_PATH || existsSync("/opt/pw-browsers/chromium");
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const base = { orgName: "Eliezer.immo", reference: "EI-0001", address: "Ahuza 10, Raanana", startsAt: "5 nov. 2026", agent: "Yaël", signer: "<script>alert(1)</script>", signaturePng: PNG, signedAt: "5 nov.", fingerprint: "ab".repeat(32) };

describe("bon de visite", () => {
  it("échappe les données et pose la direction", () => {
    const h = visitSheetHtml({ ...base, locale: "he" }, { inter: "", heeboHe: "", heeboLatin: "" });
    expect(h).toContain('dir="rtl"'); expect(h).not.toContain("<script>"); expect(h).toContain("&lt;script&gt;");
    expect(visitSheetHtml({ ...base, locale: "fr" }, { inter: "", heeboHe: "", heeboLatin: "" })).toContain('dir="ltr"');
  });
  it("trois langues, mêmes déclarations", () => { expect(TEXT.fr.declare.length).toBe(TEXT.he.declare.length); expect(TEXT.en.declare.length).toBe(3); });
  it.skipIf(!hasChromium)("génère un PDF valide", async () => {
    for (const locale of ["fr", "he"] as const) {
      const pdf = await renderPdf(visitSheetHtml({ ...base, locale, signer: locale === "he" ? "ישראל ישראלי" : "Jean Dupont" }, await loadFonts()));
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-"); expect(pdf.length).toBeGreaterThan(5000);
    }
  }, 60000);
});
