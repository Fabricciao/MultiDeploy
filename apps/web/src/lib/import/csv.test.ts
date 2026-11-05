import { describe, expect, it } from "vitest";
import { CONTACT_FIELDS, PROPERTY_FIELDS, csvNumber, detectDelimiter, guessMapping, mapRows, parseCsv } from "./csv";

describe("parseCsv", () => {
  it("guillemets, virgules et retours ligne dans un champ", () => { const r = parseCsv('a,b\r\n"x, y","l1\nl2"\r\n"he said ""hi""",z'); expect(r.rows).toEqual([["x, y", "l1\nl2"], ['he said "hi"', "z"]]); });
  it("BOM UTF-8 et hébreu", () => { const r = parseCsv("\uFEFFשם,טלפון\nדנה,050-1\n"); expect(r.headers).toEqual(["שם", "טלפון"]); expect(r.rows[0]).toEqual(["דנה", "050-1"]); });
  it("détecte ; et tabulation (Excel français)", () => { expect(detectDelimiter("a;b;c")).toBe(";"); expect(detectDelimiter("a\tb")).toBe("\t"); expect(parseCsv("nom;prénom\nLévi;Dana").rows[0]).toEqual(["Lévi", "Dana"]); });
  it("ignore les lignes vides, plafonne les lignes", () => { expect(parseCsv("a\n\n1\n\n2\n").rows).toEqual([["1"], ["2"]]); const big = parseCsv("a\n" + Array.from({ length: 50 }, (_, i) => i).join("\n"), 10); expect(big.rows).toHaveLength(10); expect(big.truncated).toBe(true); });
  it("dernière ligne sans saut de ligne", () => expect(parseCsv("a,b\n1,2").rows).toEqual([["1", "2"]]));
});
describe("guessMapping", () => {
  it("français", () => expect(guessMapping(["Prénom", "Nom", "Téléphone", "E-mail", "Budget", "Notes", "Autre"], CONTACT_FIELDS)).toEqual(["first_name", "last_name", "phone", "email", "budget_max", "notes", "ignore"]));
  it("hébreu", () => expect(guessMapping(["שם פרטי", "שם משפחה", "טלפון", "אימייל"], CONTACT_FIELDS)).toEqual(["first_name", "last_name", "phone", "email"]));
  it("biens (FR)", () => expect(guessMapping(["Ville", "Rue", "Prix", "Pièces", "Surface", "Étage", "Mamad"], PROPERTY_FIELDS)).toEqual(["city", "street", "price", "rooms", "area_built", "floor", "mamad"]));
  it("un champ n'est mappé qu'une fois", () => expect(guessMapping(["Tel", "Mobile"], CONTACT_FIELDS)).toEqual(["phone", "ignore"]));
});
describe("mapRows / nombres", () => {
  it("ne garde que les cellules renseignées", () => expect(mapRows([["Dana", "", "050"]], ["first_name", "last_name", "phone"])).toEqual([{ values: { first_name: "Dana", phone: "050" }, line: 2 }]));
  it.each([["3 450 000 ₪", 3450000], ["3,450,000", 3450000], ["3.5", 3.5], ["3,5", 3.5], ["", null], ["abc", null]])("%s", (s, v) => expect(csvNumber(s)).toBe(v));
});
