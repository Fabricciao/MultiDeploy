import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db, type Ctx } from "../session";
import { sql } from "../db";
import { storage } from "../storage";
import { aiConfig, CREDIT_COST } from "../ai/config";
import { llmExtract, transcribe, type ExtractKind } from "../ai/providers";
import { extractContact, extractProperty, type CityRef, type ExtractResult, type FieldMeta } from "./extract";
import { normalizeLlm } from "./normalize";

export type IntakeInput = { mode: "voice" | "scan" | "text"; target: ExtractKind; locale: string; text?: string; audio?: { data: Buffer; mime: string }; image?: Buffer };
export type IntakeOutcome = { ok: true; jobId: string } | { ok: false; error: "empty" | "forbidden" | "stt_not_configured" | "vision_not_configured" | "insufficient_credits" | "too_large" | "bad_image" | "provider_failed" | "bad_audio" };

export async function loadCities(ctx: Ctx): Promise<CityRef[]> {
  return (await db(ctx, (tx) => tx`select id, name_fr, name_he, name_en, aliases from public.geo_places where kind = 'city'`)) as unknown as CityRef[];
}

export async function processIntake(ctx: Ctx, i: IntakeInput): Promise<IntakeOutcome> {
  if (!ctx.caps.has("ai.use") && !ctx.caps.has("contacts.write")) return { ok: false, error: "forbidden" };
  const cfg = aiConfig();
  let transcript = (i.text ?? "").trim(), provider = "rules", cost = 0, imageB64: string | undefined, inputKey: string | null = null;

  if (i.mode === "voice") {
    if (!cfg.stt) return { ok: false, error: "stt_not_configured" };
    if (!i.audio || i.audio.data.length < 800) return { ok: false, error: "empty" };
    if (i.audio.data.length > 15_000_000) return { ok: false, error: "too_large" };
    cost += CREDIT_COST.intake_voice;
  } else if (i.mode === "scan") {
    if (!cfg.vision) return { ok: false, error: "vision_not_configured" };
    if (!i.image) return { ok: false, error: "empty" };
    try { const jpg = await sharp(i.image, { limitInputPixels: 80_000_000 }).rotate().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer(); imageB64 = jpg.toString("base64"); inputKey = `org/${ctx.orgId}/scan/${randomUUID()}.jpg`; await storage.put(inputKey, jpg, "image/jpeg"); }
    catch { return { ok: false, error: "bad_image" }; }
    cost += CREDIT_COST.intake_photo;
  } else {
    if (!transcript) return { ok: false, error: "empty" };
    if (cfg.extract) cost += CREDIT_COST.intake_voice; // texte + LLM
  }

  if (cost > 0) {
    try { await db(ctx, (tx) => tx`select public.ai_spend(${cost}, ${"intake_" + i.mode}, null)`); }
    catch (e) { return { ok: false, error: /insufficient_credits/.test(String(e)) ? "insufficient_credits" : "forbidden" }; }
  }
  const refund = async () => { if (cost > 0) await sql`select public.ai_grant(${ctx.orgId}::uuid, ${cost}::numeric, 'refund_intake')`; };

  const cities = await loadCities(ctx);
  let result: ExtractResult;
  try {
    if (i.mode === "voice") { transcript = (await transcribe(i.audio!.data, i.audio!.mime, i.locale)).text; if (!transcript) { await refund(); return { ok: false, error: "empty" }; } }
    if (i.mode === "scan") { provider = "llm-vision"; result = normalizeLlm(i.target, await llmExtract(i.target, { imageB64 }), cities); }
    else if (cfg.extract) { provider = "llm"; result = normalizeLlm(i.target, await llmExtract(i.target, { text: transcript }), cities); }
    else result = i.target === "contact" ? extractContact(transcript, cities) : extractProperty(transcript, cities);
  } catch (e) {
    await refund(); if (inputKey) await storage.remove(inputKey);
    console.error("intake failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "provider_failed" };
  }
  const resultDoc = { fields: result.fields, meta: result.meta, missing: result.missing };
  const [job] = await db(ctx, (tx) => tx`insert into public.ai_jobs (organization_id, kind, target, status, input_path, transcript, result, provider, finished_at)
    values (${ctx.orgId}, ${"intake_" + (i.mode === "scan" ? "photo" : i.mode)}, ${i.target}, 'needs_review', ${inputKey}, ${transcript || null}, ${tx.json(resultDoc)}, ${provider}, now()) returning id`);
  return { ok: true, jobId: job!.id };
}

export async function getJob(ctx: Ctx, id: string) {
  const [j] = await db(ctx, (tx) => tx`select id, kind, target, status, input_path, transcript, result, provider, created_at from public.ai_jobs where id = ${id}`);
  return (j ?? null) as null | { id: string; kind: string; target: "contact" | "property"; status: string; input_path: string | null; transcript: string | null; result: { fields: Record<string, any>; meta: Record<string, FieldMeta>; missing: string[] }; provider: string };
}
export async function closeJob(ctx: Ctx, id: string, status: "done" | "discarded", targetId?: string) {
  const j = await getJob(ctx, id);
  await db(ctx, (tx) => tx`update public.ai_jobs set status = ${status}, target_id = ${targetId ?? null}, input_path = null, transcript = case when ${status} = 'discarded' then null else transcript end where id = ${id}`);
  if (j?.input_path) await storage.remove(j.input_path); // la photo source n'est conservée que le temps de la revue
}
