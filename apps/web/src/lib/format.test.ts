import { describe, expect, it } from "vitest";
import { dateShort, timeOnly } from "./format";

describe("format (fuseau de Jérusalem, quel que soit celui du serveur)", () => {
  it("affiche l'heure locale d'Israël", () => {
    expect(timeOnly("fr", "2026-11-09T08:00:00Z")).toBe("10:00"); // hiver : UTC+2
    expect(timeOnly("fr", "2026-07-09T08:00:00Z")).toBe("11:00"); // été : UTC+3
  });
  it("prend le jour de Jérusalem, pas celui d'UTC", () => {
    expect(dateShort("fr", "2026-11-09T22:30:00Z")).toBe("10 nov.");
  });
});
