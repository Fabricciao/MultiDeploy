import { describe, expect, it } from "vitest";
import { isRtl, locales } from "./routing";

describe("i18n", () => {
  it("seul l'hébreu est RTL", () => {
    expect(locales.filter(isRtl)).toEqual(["he"]);
  });
});
