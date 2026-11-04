import { describe, expect, it } from "vitest";
import { rateLimit } from "./ratelimit";

describe("rateLimit", () => {
  it("bloque au-delà du plafond puis libère après la fenêtre", () => {
    const k = "t-" + Math.random(); const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit(k, 3, 60_000, t0 + i).ok).toBe(true);
    const r = rateLimit(k, 3, 60_000, t0 + 10); expect(r.ok).toBe(false); expect(r.retryAfter).toBeGreaterThan(0);
    expect(rateLimit(k, 3, 60_000, t0 + 61_000).ok).toBe(true);
  });
  it("clés indépendantes", () => { const a = "a-" + Math.random(), b = "b-" + Math.random(); rateLimit(a, 1, 1000, 1); expect(rateLimit(a, 1, 1000, 2).ok).toBe(false); expect(rateLimit(b, 1, 1000, 2).ok).toBe(true); });
});
