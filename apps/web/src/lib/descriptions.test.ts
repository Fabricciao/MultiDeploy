import { describe, expect, it } from "vitest";
import { buildDescription, type DescFields } from "./descriptions";
const f: DescFields = { transaction: "sale", propertyType: "apartment", rooms: 4.5, area: 112, floor: 3, floorsTotal: 8, city: "Raanana", mamad: true, parking: 2, elevator: true, sukkah: false, storage: false, ac: true };
describe("modèles d'annonce", () => {
  it("FR", () => { const r = buildDescription(f, "fr"); expect(r.title).toContain("4.5 pièces"); expect(r.description).toContain("112 m²"); expect(r.description).toContain("mamad"); expect(r.description).toContain("2 places de parking"); });
  it("HE", () => { const r = buildDescription(f, "he"); expect(r.title).toContain("למכירה"); expect(r.description).toContain("ממ״ד"); expect(r.description).toContain("מ״ר"); });
  it("EN location", () => { const r = buildDescription({ ...f, transaction: "rent" }, "en"); expect(r.title).toContain("For rent"); });
  it("n'invente rien : champs absents ignorés", () => { const r = buildDescription({ ...f, rooms: null, area: null, floor: null, city: null, mamad: false, parking: 0, elevator: false, ac: false }, "fr"); expect(r.description).not.toMatch(/mamad|parking|m²|étage|undefined|null/); });
});
