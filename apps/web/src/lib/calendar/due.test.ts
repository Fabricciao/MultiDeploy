import { describe, expect, it } from "vitest";
import { parseDue } from "./due";

describe("parseDue", () => {
  it("date seule → 18:00 à Jérusalem", () => {
    const r = parseDue("2026-11-10", "");
    expect(r.timed).toBe(false);
    expect(r.at?.toISOString()).toBe("2026-11-10T16:00:00.000Z");
  });
  it("date + heure → instant exact (heure d'été)", () => {
    const r = parseDue("2026-07-01", "09:30");
    expect(r.timed).toBe(true);
    expect(r.at?.toISOString()).toBe("2026-07-01T06:30:00.000Z");
  });
  it("date invalide → null", () => expect(parseDue("demain", "10:00").at).toBeNull());
});
