import { describe, expect, it } from "vitest";
import { slipEmail, slipMessage } from "./message";

const base = { first: "Dana", address: "Herzl 12, Jérusalem", date: "12 novembre à 10:00", url: "https://x.test/fr/sign/abc", agent: "Yaël", org: "Eliezer Immo" };

describe("message du bon de visite", () => {
  it("contient le lien, l'adresse et la signature", () => {
    const m = slipMessage("fr", base);
    expect(m).toContain("Bonjour Dana,");
    expect(m).toContain(base.url);
    expect(m).toContain("Herzl 12");
    expect(m.endsWith("Yaël · Eliezer Immo")).toBe(true);
  });
  it("salue sans prénom et parle la langue du client", () => {
    expect(slipMessage("he", { ...base, first: "" }).startsWith("שלום,")).toBe(true);
    expect(slipMessage("en", base)).toContain("viewing form");
  });
  it("échappe le HTML de l'e-mail", () => {
    const e = slipEmail("fr", { ...base, org: "<b>A&B</b>" });
    expect(e.html).toContain("&lt;b&gt;A&amp;B&lt;/b&gt;");
    expect(e.html).not.toContain("<b>A&B</b>");
    expect(e.text).toContain(base.url);
  });
});
