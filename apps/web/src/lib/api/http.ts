import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { authenticateKey, type ApiAuth } from "./keys";
import { clientIp, rateLimit } from "../ratelimit";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Authorization,Content-Type", "Access-Control-Max-Age": "86400" };
export const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => NextResponse.json(body, { status, headers: { ...CORS, "Cache-Control": "no-store", ...extra } });
export const preflight = () => new NextResponse(null, { status: 204, headers: CORS });

/** Authentification + portée + limitation de débit (120 req/min par clé, 30/min par IP pour les clés invalides). */
export async function guard(req: NextRequest, scope: string): Promise<{ auth: ApiAuth } | { res: NextResponse }> {
  const ip = clientIp(req.headers);
  const auth = await authenticateKey(req.headers.get("authorization"));
  if (!auth) { const r = rateLimit(`bad:${ip}`, 30, 60_000); return { res: r.ok ? json({ error: "unauthorized" }, 401) : json({ error: "rate_limited" }, 429, { "Retry-After": String(r.retryAfter) }) }; }
  if (!auth.scopes.includes(scope)) return { res: json({ error: "forbidden_scope" }, 403) };
  const rl = rateLimit(`key:${auth.keyId}`, 120, 60_000);
  if (!rl.ok) return { res: json({ error: "rate_limited" }, 429, { "Retry-After": String(rl.retryAfter) }) };
  return { auth };
}
