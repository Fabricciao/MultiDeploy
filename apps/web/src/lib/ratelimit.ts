/** Fenêtre glissante en mémoire (par instance). En multi-instances : remplacer par Redis/Upstash (même interface). */
const hits = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs: number, now = Date.now()): { ok: boolean; retryAfter: number } {
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return { ok: false, retryAfter: Math.ceil((windowMs - (now - arr[0]!)) / 1000) }; }
  arr.push(now); hits.set(key, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return { ok: true, retryAfter: 0 };
}
export const clientIp = (h: Headers) => (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
