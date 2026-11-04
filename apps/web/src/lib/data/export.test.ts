import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { csvCell, toCsv } from "./export";

describe("CSV", () => {
  it("échappe guillemets, virgules et sauts de ligne", () => { expect(csvCell('a,"b"')).toBe('"a,""b"""'); expect(csvCell("x\ny")).toBe('"x\ny"'); });
  it("neutralise l'injection de formules", () => { for (const v of ["=HYPERLINK(\"http://evil\")", "+cmd|' /C calc'!A0", "@SUM(1)", "-2+3"]) expect(csvCell(v).replace(/^"/, "")).toMatch(/^'/); });
  it("conserve les nombres négatifs et numéros internationaux", () => { expect(csvCell("-12.5")).toBe("-12.5"); expect(csvCell("+972501234567")).toBe("+972501234567"); });
  it("sérialise objets/null, BOM UTF-8 et hébreu", () => { const c = toCsv([{ a: { x: 1 }, b: null, c: "דירה" }]); expect(c.startsWith("﻿")).toBe(true); expect(c).toContain('"{""x"":1}"'); expect(c).toContain("דירה"); });
  it("vide → chaîne vide", () => expect(toCsv([])).toBe(""));
});
describe("zip", () => { it("round-trip fflate", async () => { const { zipSync, strToU8 } = await import("fflate"); expect(strFromU8(unzipSync(zipSync({ "a.csv": strToU8("x") }))["a.csv"]!)).toBe("x"); }); });
