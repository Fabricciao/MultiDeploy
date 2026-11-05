import { describe, expect, it } from "vitest";
import { dayKey, jerusalemToDate, weekStart } from "./week";

describe("heure de Jérusalem", () => {
  it("hiver (UTC+2) et été (UTC+3)", () => { expect(jerusalemToDate("2026-11-05T14:30")!.toISOString()).toBe("2026-11-05T12:30:00.000Z"); expect(jerusalemToDate("2026-07-05T14:30")!.toISOString()).toBe("2026-07-05T11:30:00.000Z"); });
  it("entrée invalide → null", () => { expect(jerusalemToDate("demain")).toBeNull(); expect(jerusalemToDate("2026-13-40T99:00")).toBeNull(); });
  it("dayKey suit le jour LOCAL (23 h UTC = lendemain à Jérusalem)", () => expect(dayKey(new Date("2026-11-04T23:30:00Z"))).toBe("2026-11-05"));
  it("la semaine commence le dimanche à minuit local", () => { const w = weekStart(new Date("2026-11-04T10:00:00Z")); expect(w.toISOString()).toBe("2026-10-31T22:00:00.000Z"); expect(dayKey(w)).toBe("2026-11-01"); });
  it("décalage de semaines", () => expect(weekStart(new Date("2026-11-04T10:00:00Z"), 1).getTime() - weekStart(new Date("2026-11-04T10:00:00Z"), 0).getTime()).toBe(7 * 86_400_000));
});
