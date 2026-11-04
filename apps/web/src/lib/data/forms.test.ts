import { describe, expect, it } from "vitest";
import { parseContactForm, parsePropertyForm } from "./forms";

const fd = (o: Record<string, string | string[]>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) (Array.isArray(v) ? v : [v]).forEach((x) => f.append(k, x)); return f; };

describe("parseContactForm", () => {
  it("exige un nom", () => expect(parseContactForm(fd({})).ok).toBe(false));
  it("normalise le téléphone et crée un profil", () => {
    const r = parseContactForm(fd({ first_name: "Dana", phone: "050-123-4567", with_profile: "on", budget_max: "4000000", rooms_min: "3.5", must_have: ["mamad", "evil"] }));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.data.phone).toBe("+972501234567"); expect(r.data.profile?.must_have).toEqual(["mamad"]); expect(r.data.profile?.price_max).toBe(4000000); }
  });
  it("rejette téléphone, e-mail et fourchette invalides", () => {
    const r = parseContactForm(fd({ first_name: "X", phone: "abc", email: "nope", rooms_min: "5", rooms_max: "3" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["email", "phone", "rooms_max"]);
  });
});
describe("parsePropertyForm", () => {
  it("valide les demi-pièces", () => {
    expect(parsePropertyForm(fd({ rooms: "3.5" })).ok).toBe(true);
    const r = parsePropertyForm(fd({ rooms: "3.3" }));
    expect(r.ok).toBe(false);
  });
  it("un bien actif exige prix et ville", () => {
    const r = parsePropertyForm(fd({ status: "active" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.status).toBe("active_needs_price_city");
  });
  it("ignore les valeurs hors liste", () => {
    const r = parsePropertyForm(fd({ transaction: "x", property_type: "castle", currency: "BTC" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toMatchObject({ transaction: "sale", property_type: "apartment", currency: "ILS" });
  });
});
