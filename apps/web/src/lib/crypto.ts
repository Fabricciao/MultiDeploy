import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Chiffrement AES-256-GCM des secrets d'intégration (jetons WhatsApp/Meta/Google) au repos. Clé : INTEGRATIONS_KEY (32 octets, base64). */
const key = (): Buffer => { const k = Buffer.from(process.env.INTEGRATIONS_KEY ?? "", "base64"); if (k.length !== 32) throw new Error("INTEGRATIONS_KEY manquante ou invalide (32 octets en base64)"); return k; };
export const cryptoConfigured = () => Buffer.from(process.env.INTEGRATIONS_KEY ?? "", "base64").length === 32;

export function encryptJson(value: unknown, aad = ""): string {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", key(), iv);
  c.setAAD(Buffer.from(aad));
  const enc = Buffer.concat([c.update(JSON.stringify(value), "utf8"), c.final()]);
  return `v1.${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${enc.toString("base64url")}`;
}
export function decryptJson<T = unknown>(blob: string, aad = ""): T {
  const [v, iv, tag, data] = blob.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("bad_blob");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAAD(Buffer.from(aad)); d.setAuthTag(Buffer.from(tag, "base64url"));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8")) as T;
}

/** URL/jeton signés à durée limitée (HMAC-SHA256) : liens de signature, images publiques temporaires pour Instagram. */
const secret = () => { const s = process.env.APP_SECRET ?? process.env.INTEGRATIONS_KEY; if (!s) throw new Error("APP_SECRET manquant"); return s; };
export function signToken(payload: Record<string, string | number>, ttlSec: number, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(now / 1000) + ttlSec })).toString("base64url");
  return `${body}.${createHmac("sha256", secret()).update(body).digest("base64url")}`;
}
export function verifyToken<T extends Record<string, string | number>>(token: string, now = Date.now()): (T & { exp: number }) | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest();
  const got = Buffer.from(sig, "base64url");
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
  try { const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { exp: number }; return p.exp * 1000 >= now ? p : null; } catch { return null; }
}
