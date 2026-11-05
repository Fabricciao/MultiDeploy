import { describe, expect, it } from "vitest";
import { nlToPropertiesUrl } from "./nl";

const C = [{ id: "c1", name_fr: "Raanana", name_he: "רעננה", name_en: "Ra'anana" }, { id: "c2", name_fr: "Kfar Saba", name_he: "כפר סבא", name_en: "Kfar Saba" }];
describe("recherche en langage naturel", () => {
  it("FR : pièces, ville, plafond, équipement", () => { const r = nlToPropertiesUrl("4 pièces Raanana moins de 3,5 millions mamad", C)!; expect(r.href).toContain("rmin=4"); expect(r.href).toContain("city=c1"); expect(r.href).toContain("pmax=3500000"); expect(r.href).toContain("has=mamad"); });
  it("HE", () => { const r = nlToPropertiesUrl("דירת 4 חדרים בכפר סבא עד 3 מיליון", C)!; expect(r.href).toMatch(/city=c2/); expect(r.href).toContain("pmax=3000000"); });
  it("location", () => expect(nlToPropertiesUrl("à louer 3 pièces Raanana", C)!.href).toContain("tx=rent"));
  it("texte sans critère exploitable → null (la palette cherche par mots-clés)", () => expect(nlToPropertiesUrl("Dana", C)).toBeNull());
});
