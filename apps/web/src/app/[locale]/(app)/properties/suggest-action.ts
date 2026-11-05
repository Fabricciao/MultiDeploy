"use server";
import { db, getCtx } from "@/lib/session";
import { sql } from "@/lib/db";
import { buildDescription, type DescFields, type L } from "@/lib/descriptions";
import { llmTranslate } from "@/lib/ai/providers";
import { aiConfig } from "@/lib/ai/config";

export type Suggest = { ok: true; title?: string; description: string } | { ok: false; error: "forbidden" | "empty" | "insufficient_credits" | "unavailable" };
const LOC = ["fr", "he", "en"] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** mode « template » : gratuit, déterministe. mode « translate » : 1 crédit, remboursé en cas d'échec. */
export async function suggestTextAction(input: { mode: "template" | "translate"; target: string; source?: string; v: Record<string, string>; text?: string }): Promise<Suggest> {
  const ctx = await getCtx();
  if (!ctx.caps.has("properties.write") || ctx.impersonating) return { ok: false, error: "forbidden" };
  const target = (LOC as readonly string[]).includes(input.target) ? (input.target as L) : "fr";
  if (input.mode === "template") {
    const v = input.v, n = (k: string) => { const x = Number(v[k]); return Number.isFinite(x) && v[k] !== "" ? x : null; };
    let city: string | null = null;
    if (v.city_id && uuid.test(v.city_id)) { const [g] = await db(ctx, (tx) => tx`select name_fr, name_he, name_en from public.geo_places where id = ${v.city_id!}`); city = g ? ((g as any)[`name_${target}`] ?? g.name_fr ?? null) : null; }
    const f: DescFields = { transaction: v.transaction === "rent" ? "rent" : "sale", propertyType: v.property_type ?? "apartment", rooms: n("rooms"), area: n("area_built"), floor: n("floor"), floorsTotal: n("floors_total"), city,
      mamad: v.mamad === "on", parking: Math.max(0, Math.min(20, Math.floor(n("parking_count") ?? 0))), elevator: v.elevator === "on", sukkah: v.sukkah_balcony === "on", storage: v.storage === "on", ac: v.ac === "on" };
    return { ok: true, ...buildDescription(f, target) };
  }
  const source = (LOC as readonly string[]).includes(input.source ?? "") ? (input.source as L) : null;
  const text = (input.text ?? "").trim();
  if (!source || source === target || !text) return { ok: false, error: "empty" };
  if (!!!aiConfig().extract) return { ok: false, error: "unavailable" };
  try { await db(ctx, (tx) => tx`select public.ai_spend(1, 'translate', null)`); }
  catch (e) { return { ok: false, error: /insufficient_credits/.test(String(e)) ? "insufficient_credits" : "forbidden" }; }
  try { return { ok: true, description: await llmTranslate(text, source, target) }; }
  catch { await sql`select public.ai_grant(${ctx.orgId}::uuid, 1::numeric, 'refund_translate')`; return { ok: false, error: "unavailable" }; }
}
