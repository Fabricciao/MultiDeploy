import { describe, expect, it } from "vitest";
import { mandateHtml, MTEXT } from "./html";
import { ACTIONS } from "./actions";

const fonts = { sans: "", sansBold: "", sansHe: "", sansHeBold: "", display: "", displayHe: "" };
const d = { locale: "he" as const, orgName: "<Eliezer>", broker: "Yaël", license: "123", owner: "Dana", idNumber: "012345678", ownerAddress: "Herzl 1", reference: "P-1", address: "Herzl 12",
  price: "₪ 3,000,000", from: "1 nov.", to: "30 avr.", pct: "2", actions: ["sign", "internet"] as const, signaturePng: "data:image/png;base64,AAA", signedAt: "x", fingerprint: "abc" };

describe("mandat d'exclusivité", () => {
  it("contient les mentions, les actions choisies et échappe le HTML", () => {
    const h = mandateHtml({ ...d, actions: [...d.actions] }, fonts as never);
    expect(h).toContain('dir="rtl"');
    expect(h).toContain("&lt;Eliezer&gt;");
    expect(h).toContain(MTEXT.he.actions.sign);
    expect(h).not.toContain(MTEXT.he.actions.newspaper);
    expect(h).toContain("012345678");
  });
  it("traduit toutes les actions dans les trois langues", () => {
    for (const l of ["fr", "he", "en"] as const) for (const a of ACTIONS) expect(MTEXT[l].actions[a]).toBeTruthy();
  });
});
