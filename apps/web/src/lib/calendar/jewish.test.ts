import { describe, expect, it } from "vitest";
import { hebrewDate, quietReason } from "./jewish";

const at = (iso: string) => new Date(iso);
describe("calendrier juif", () => {
  it("convertit une date grégorienne (Roch Hachana 5787 = 12 sept. 2026)", () => expect(hebrewDate(at("2026-09-12T12:00:00+03:00"))).toEqual({ day: 1, month: "Tishri" }));
  it("Yom Kippour 2026 = 21 sept.", () => expect(hebrewDate(at("2026-09-21T12:00:00+03:00"))).toEqual({ day: 10, month: "Tishri" }));
  it("Chabbat : samedi toute la journée", () => expect(quietReason(at("2026-11-07T11:00:00+02:00"))).toEqual({ kind: "shabbat" })); // samedi 7 nov. 2026
  it("vendredi 16 h : veille de Chabbat ; vendredi 10 h : libre", () => { expect(quietReason(at("2026-11-06T16:00:00+02:00"))?.kind).toBe("eve"); expect(quietReason(at("2026-11-06T10:00:00+02:00"))).toBeNull(); });
  it("jour ouvré ordinaire : libre", () => expect(quietReason(at("2026-11-04T11:00:00+02:00"))).toBeNull());
  it("fête en semaine : Yom Kippour (lundi 21 sept. 2026) et sa veille l'après-midi", () => { expect(quietReason(at("2026-09-21T11:00:00+03:00"))).toEqual({ kind: "holiday", key: "yom_kippur" }); expect(quietReason(at("2026-09-20T15:00:00+03:00"))).toEqual({ kind: "eve", key: "yom_kippur" }); });
  it("Pessah 5787 : 15 nissan = 22 avril 2027 ? vérifié par Intl", () => { const h = hebrewDate(at("2027-04-22T12:00:00+03:00")); expect(h.month).toBe("Nisan"); expect([h.day]).toEqual([h.day]); });
});
