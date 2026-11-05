import { describe, expect, it } from "vitest";
import { billingState } from "./state";
const d = new Date("2026-11-05T10:00:00Z");
describe("état de facturation manuelle", () => {
  it("essai", () => expect(billingState("trial", null, d)).toBe("trial"));
  it("sans échéance", () => expect(billingState("pro", null, d)).toBe("unset"));
  it("à jour", () => expect(billingState("pro", "2027-01-01", d)).toBe("paid"));
  it("expire bientôt (≤ 14 j, jour inclus)", () => { expect(billingState("pro", "2026-11-19", d)).toBe("expiring"); expect(billingState("pro", "2026-11-05", d)).toBe("expiring"); });
  it("en retard dès le lendemain de l'échéance", () => expect(billingState("pro", "2026-11-04", d)).toBe("overdue"));
  it("accepte un objet Date (colonne SQL)", () => expect(billingState("pro", new Date("2026-12-31T00:00:00Z"), d)).toBe("paid"));
});
