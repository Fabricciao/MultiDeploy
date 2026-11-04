import { describe, expect, it } from "vitest";
import { normalizeLlm } from "./normalize";

const CITIES = [{ id: "c1", name_fr: "Raanana", name_he: "רעננה", name_en: "Ra'anana", aliases: [] }];
describe("normalizeLlm : la sortie d'un LLM n'est jamais crue telle quelle", () => {
  it("valide, borne et résout les villes", () => {
    const r = normalizeLlm("contact", { first_name: "Dana", phone: "050-123-4567", budget_max: 4000000, rooms_min: 4, cities: ["רעננה"], must_have: ["mamad", "piscine"], kinds: ["buyer", "hacker"], evidence: { budget_max: "תקציב ארבעה מיליון" } }, CITIES);
    expect(r.fields).toMatchObject({ first_name: "Dana", phone: "+972501234567", budget_max: 4000000, rooms_min: 4, city_ids: ["c1"], must_have: ["mamad"], kinds: ["buyer"] });
    expect(r.meta.budget_max!.confidence).toBeGreaterThan(0.7);
  });
  it("rejette les valeurs aberrantes ou de mauvais type", () => {
    const r = normalizeLlm("contact", { budget_max: -5, rooms_min: 999, email: "pas-un-email", preferred_locale: "klingon", phone: "abc", transaction: "swap" }, CITIES);
    expect(r.fields.budget_max).toBeUndefined(); expect(r.fields.rooms_min).toBeUndefined(); expect(r.fields.email).toBeUndefined(); expect(r.fields.preferred_locale).toBeUndefined(); expect(r.fields.phone).toBeUndefined(); expect(r.fields.transaction).toBeUndefined();
    expect(r.missing).toEqual(expect.arrayContaining(["first_name", "phone"]));
  });
  it("champ sans extrait source → confiance basse (à vérifier)", () => { const r = normalizeLlm("contact", { first_name: "Dana", evidence: {} }, CITIES); expect(r.meta.first_name!.confidence).toBeLessThan(0.7); });
  it("bien : prix, ville, équipements", () => {
    const r = normalizeLlm("property", { price: 3450000, rooms: 4, city: "Raanana", features: ["parking", "elevator", "x"], property_type: "castle", evidence: { price: "3 450 000" } }, CITIES);
    expect(r.fields).toMatchObject({ price: 3450000, rooms: 4, city_id: "c1", parking_count: 1, elevator: true }); expect(r.fields.property_type).toBeUndefined(); expect(r.missing).toEqual([]);
  });
  it("valeur nulle ou vide ignorée (rien d'inventé)", () => { const r = normalizeLlm("property", { price: null, city: "", features: [] }, CITIES); expect(r.missing).toEqual(["price", "city_id"]); });
});
