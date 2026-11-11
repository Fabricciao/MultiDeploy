import { describe, expect, it } from "vitest";
import { mandateHtml, MTEXT } from "./html";
import { ACTIONS } from "./actions";
import { docLocales, type Loc } from "../visit-sheet/html";

const fonts = { sans: "", sansBold: "", sansHe: "", sansHeBold: "", display: "", displayHe: "" };
const parts = (l: Loc) => docLocales(l).map((locale) => ({ locale, orgName: "<Eliezer>", address: "Herzl 12", price: "₪ 3,000,000", from: "1 nov.", to: "30 avr.", pct: "2", signedAt: "x" }));
const d = { broker: "Yaël", license: "123", owner: "Dana", idNumber: "012345678", ownerAddress: "Herzl 1", reference: "P-1", actions: ["sign", "internet"] as const, signaturePng: "data:image/png;base64,AAA", fingerprint: "abc" };

describe("mandat d'exclusivité", () => {
  it("contient les mentions, les actions choisies et échappe le HTML", () => {
    const h = mandateHtml({ ...d, parts: parts("he"), actions: [...d.actions] }, fonts as never);
    expect(h).toContain('dir="rtl"');
    expect(h).toContain("&lt;Eliezer&gt;");
    expect(h).toContain(MTEXT.he.actions.sign);
    expect(h).not.toContain(MTEXT.he.actions.newspaper);
    expect(h).toContain("012345678");
    expect(h).not.toContain(MTEXT.fr.title);
  });
  it("l'hébreu d'abord, puis la traduction dans la langue du propriétaire", () => {
    const h = mandateHtml({ ...d, parts: parts("fr"), actions: [...d.actions] }, fonts as never);
    expect(h).toContain(MTEXT.he.title); expect(h).toContain(MTEXT.fr.title);
    expect(h.indexOf(MTEXT.he.title)).toBeLessThan(h.indexOf(MTEXT.fr.title));
    expect(h).toContain(MTEXT.fr.actions.sign); expect(h).toContain(MTEXT.he.actions.sign);
    expect(h).toContain('lang="fr" dir="ltr"');
  });
  it("traduit toutes les actions dans les trois langues", () => {
    for (const l of ["fr", "he", "en"] as const) for (const a of ACTIONS) expect(MTEXT[l].actions[a]).toBeTruthy();
  });
});
