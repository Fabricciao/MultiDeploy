import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class FetchError extends Error { constructor(public code: "invalid_url" | "blocked" | "timeout" | "too_large" | "bad_type" | "http" | "failed") { super(code); } }

/** Adresses non routables / internes (IPv4 & IPv6) : jamais jointes depuis le serveur. */
export function isPrivateIp(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v.includes(":")) {
    if (v === "::1" || v === "::" || v.startsWith("fe80") || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("ff")) return true;
    const m = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
    return m ? isPrivateIp(m[1]!) : false;
  }
  const p = v.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p as [number, number, number, number];
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}

/** Mode test (hors production uniquement) : autorise SEULEMENT le loopback ; métadonnées cloud, réseaux privés et link-local restent bloqués. */
const allowLoopback = () => process.env.NODE_ENV !== "production" && process.env.BRAND_FETCH_ALLOW_PRIVATE === "1";
const isLoopback = (ip: string) => ip === "::1" || ip.startsWith("127.");

export async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try { u = new URL(raw); } catch { throw new FetchError("invalid_url"); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new FetchError("invalid_url");
  if (u.username || u.password) throw new FetchError("invalid_url");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const loopLiteral = allowLoopback() && (host === "localhost" || (isIP(host) !== 0 && isLoopback(host)));
  if (u.port && !["80", "443"].includes(u.port) && !loopLiteral) throw new FetchError("blocked"); // avant toute résolution DNS
  if ((host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) && !loopLiteral) throw new FetchError("blocked");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => { throw new FetchError("failed"); });
  const loop = allowLoopback() && addrs.every((a) => isLoopback(a.address));
  if (!loop && addrs.some((a) => isPrivateIp(a.address))) throw new FetchError("blocked");
  return u;
}

/** fetch durci : DNS vérifié à chaque redirection (3 max), délai, taille plafonnée, type de contenu contrôlé. */
export async function safeFetch(raw: string, opts: { maxBytes: number; types: RegExp; timeoutMs?: number }): Promise<{ body: Buffer; type: string; url: string }> {
  let url = raw;
  for (let hop = 0; hop < 4; hop++) {
    const u = await assertPublicUrl(url);
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 8000);
    try {
      const res = await fetch(u, { redirect: "manual", signal: ctl.signal, headers: { "User-Agent": "MultiDeployBot/1.0 (+brand-import)", Accept: "text/html,text/css,image/*;q=0.8" } });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) { url = new URL(res.headers.get("location")!, u).toString(); continue; }
      if (!res.ok) throw new FetchError("http");
      const type = res.headers.get("content-type") ?? "";
      if (!opts.types.test(type)) throw new FetchError("bad_type");
      const reader = res.body?.getReader();
      if (!reader) throw new FetchError("failed");
      const chunks: Uint8Array[] = []; let n = 0;
      for (;;) { const { done, value } = await reader.read(); if (done) break; n += value.length; if (n > opts.maxBytes) { await reader.cancel(); throw new FetchError("too_large"); } chunks.push(value); }
      return { body: Buffer.concat(chunks), type, url: u.toString() };
    } catch (e) {
      if (e instanceof FetchError) throw e;
      throw new FetchError((e as Error).name === "AbortError" ? "timeout" : "failed");
    } finally { clearTimeout(timer); }
  }
  throw new FetchError("failed");
}
