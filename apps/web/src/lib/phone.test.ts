import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it.each([
    ["050-123-4567", "+972501234567"],
    ["0501234567", "+972501234567"],
    ["+972 50-123-4567", "+972501234567"],
    ["972501234567", "+972501234567"],
    ["00972501234567", "+972501234567"],
    ["+9720501234567", "+972501234567"],
    ["03-1234567", "+97231234567"],
    ["+33 6 12 34 56 78", "+33612345678"],
  ])("%s → %s", (i, o) => expect(normalizePhone(i)).toBe(o));
  it.each(["", "abc", "123", "+12"])("rejette %j", (i) => expect(normalizePhone(i)).toBeNull());
  it("formate un mobile israélien", () => expect(formatPhone("+972501234567")).toBe("050-123-4567"));
});
