import type { NextRequest } from "next/server";
import { guard, json, preflight } from "@/lib/api/http";
import { ingestLead, leadSchema } from "@/lib/api/leads";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;
/** POST /api/v1/leads — crée un lead depuis un formulaire de site (portée leads:write). */
export async function POST(req: NextRequest) {
  const g = await guard(req, "leads:write"); if ("res" in g) return g.res;
  const text = await req.text();
  if (text.length > 10_000) return json({ error: "payload_too_large" }, 413);
  let body: unknown; try { body = JSON.parse(text); } catch { return json({ error: "invalid_json" }, 400); }
  const p = leadSchema.safeParse(body);
  if (!p.success) return json({ error: "validation", details: p.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, 422);
  const r = await ingestLead(g.auth.orgId, { ...p.data, source: p.data.source ?? "api" });
  if ("error" in r) return json({ error: r.error }, 422);
  return json({ id: r.id, duplicate: r.duplicate }, r.duplicate ? 200 : 201);
}
