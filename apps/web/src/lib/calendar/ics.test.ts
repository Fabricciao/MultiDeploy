import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";

describe("buildIcs", () => {
  const ics = buildIcs([{ uid: "v1", start: new Date("2026-11-04T14:30:00Z"), end: new Date("2026-11-04T15:00:00Z"), summary: "Visite; 4 pièces, Raanana", description: "Ligne1\nLigne2", location: "Ahuza 24" }]);
  it("structure et dates UTC", () => { expect(ics).toContain("BEGIN:VCALENDAR"); expect(ics).toContain("DTSTART:20261104T143000Z"); expect(ics).toContain("DTEND:20261104T150000Z"); expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true); });
  it("échappe ; , et sauts de ligne", () => { expect(ics).toContain("SUMMARY:Visite\; 4 pièces\\, Raanana"); expect(ics).toContain("DESCRIPTION:Ligne1\\nLigne2"); });
  it("plie les lignes longues (≤ 75 octets) sans casser l'hébreu", () => { const l = buildIcs([{ uid: "x", start: new Date(), end: new Date(), summary: "דירת ארבעה חדרים ברעננה ".repeat(8) }]); for (const line of l.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(76); });
});
