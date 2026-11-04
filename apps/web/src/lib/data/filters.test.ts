import { describe, expect, it } from "vitest";
import { parsePropertyFilters, toQuery } from "./filters";

describe("parsePropertyFilters", () => {
  it("valeurs par défaut", () => {
    const f = parsePropertyFilters({});
    expect(f).toMatchObject({ sort: "recent", page: 1, status: [], cityIds: [], has: [] });
  });
  it("ignore les valeurs invalides (pas d'injection de colonnes/UUID)", () => {
    const f = parsePropertyFilters({ sort: "price; drop table", status: "active,hack", city: "not-a-uuid", has: "mamad,evil", rmin: "abc", page: "-4", tx: "x" });
    expect(f.sort).toBe("recent");
    expect(f.status).toEqual(["active"]);
    expect(f.cityIds).toEqual([]);
    expect(f.has).toEqual(["mamad"]);
    expect(f.roomsMin).toBeUndefined();
    expect(f.page).toBe(1);
    expect(f.transaction).toBeUndefined();
  });
  it("lit les fourchettes et listes", () => {
    const f = parsePropertyFilters({ rmin: "3.5", pmax: "4000000", tx: "sale", city: "0b0e6f5a-0000-4000-8000-000000000001,0b0e6f5a-0000-4000-8000-000000000002" });
    expect(f).toMatchObject({ roomsMin: 3.5, priceMax: 4000000, transaction: "sale" });
    expect(f.cityIds).toHaveLength(2);
  });
});
describe("toQuery", () => {
  it("omet les vides et joint les listes", () => expect(toQuery({ a: "1", b: "", c: ["x", "y"], d: [], e: undefined })).toBe("?a=1&c=x%2Cy"));
});
