import { describe, expect, it } from "vitest";
import { renderShareEmail } from "./email-templates";

const base = { orgName: "Eliezer.immo", contactName: "Dana", agentName: "Yaël", selectionUrl: "https://x.test/he/p/abc", unsubscribeUrl: "https://x.test/he/unsubscribe/abc", properties: [{ title: "4 חדרים <script>", place: "רעננה", price: "₪3,450,000", specs: "112 מ״ר", url: "https://x.test/p/1" }] };

describe("renderShareEmail", () => {
  it("hébreu : dir=rtl, lang=he, sujet traduit", () => {
    const r = renderShareEmail({ ...base, locale: "he" });
    expect(r.html).toContain('dir="rtl"');
    expect(r.html).toContain('lang="he"');
    expect(r.subject).toContain("מבחר נכסים");
  });
  it("français : ltr", () => expect(renderShareEmail({ ...base, locale: "fr" }).html).toContain('dir="ltr"'));
  it("échappe le HTML des champs saisis", () => {
    const r = renderShareEmail({ ...base, locale: "fr" });
    expect(r.html).not.toContain("<script>");
    expect(r.html).toContain("&lt;script&gt;");
  });
  it("inclut le lien de désinscription (HTML et texte)", () => {
    const r = renderShareEmail({ ...base, locale: "en" });
    expect(r.html).toContain("unsubscribe");
    expect(r.text).toContain("unsubscribe");
  });
  it("ignore une couleur d'accent invalide", () => expect(renderShareEmail({ ...base, locale: "en", accent: "red;}</style>" }).html).toContain("#1f4fd8"));
});
