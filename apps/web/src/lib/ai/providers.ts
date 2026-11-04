import "server-only";
import { aiConfig } from "./config";

/** Interfaces de fournisseurs interchangeables. Les adaptateurs ci-dessous suivent les API HTTP publiques ; NON TESTÉS sans clés. */
export type Transcript = { text: string; language?: string };

export async function transcribe(audio: Buffer, mime: string, hint?: string): Promise<Transcript> {
  const c = aiConfig().stt;
  if (!c) throw new Error("stt_not_configured");
  const fd = new FormData();
  fd.append("file", new Blob([new Uint8Array(audio)], { type: mime }), mime.includes("mp4") ? "audio.m4a" : "audio.webm");
  fd.append("model", c.model);
  if (hint && ["fr", "he", "en"].includes(hint)) fd.append("language", hint);
  fd.append("prompt", "Immobilier en Israël : mamad, tabou, arnona, va'ad bayit, soukka, Raanana, Kfar Saba, Herzliya, Netanya, Modiin. ממ״ד, טאבו, ארנונה, ועד בית, מרפסת סוכה."); // vocabulaire du domaine
  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${c.key}` }, body: fd });
  if (!r.ok) throw new Error(`stt_failed_${r.status}`);
  const j = (await r.json()) as { text?: string; language?: string };
  return { text: (j.text ?? "").trim(), language: j.language };
}

export type ExtractKind = "contact" | "property";
const SCHEMAS: Record<ExtractKind, object> = {
  contact: { type: "object", properties: {
    first_name: { type: ["string", "null"] }, last_name: { type: ["string", "null"] }, first_name_he: { type: ["string", "null"] }, last_name_he: { type: ["string", "null"] },
    phone: { type: ["string", "null"], description: "numéro tel que dit/écrit" }, email: { type: ["string", "null"] }, preferred_locale: { type: ["string", "null"], enum: ["fr", "he", "en", null] },
    kinds: { type: "array", items: { type: "string", enum: ["buyer", "seller", "landlord", "tenant", "investor", "other"] } }, aliyah_status: { type: ["string", "null"], enum: ["pre_aliyah", "recent", "resident", "none", null] },
    transaction: { type: ["string", "null"], enum: ["sale", "rent", null] }, cities: { type: "array", items: { type: "string" } }, budget_max: { type: ["number", "null"] }, rooms_min: { type: ["number", "null"] }, rooms_max: { type: ["number", "null"] },
    must_have: { type: "array", items: { type: "string", enum: ["mamad", "parking", "elevator", "sukkah_balcony", "storage", "ac"] } }, notes: { type: ["string", "null"] },
    evidence: { type: "object", description: "champ -> extrait exact qui le justifie", additionalProperties: { type: "string" } } }, required: ["kinds", "cities", "must_have", "evidence"] },
  property: { type: "object", properties: {
    transaction: { type: ["string", "null"], enum: ["sale", "rent", null] }, property_type: { type: ["string", "null"] }, city: { type: ["string", "null"] }, street: { type: ["string", "null"] }, house_number: { type: ["string", "null"] },
    price: { type: ["number", "null"] }, rooms: { type: ["number", "null"] }, area_built: { type: ["number", "null"] }, floor: { type: ["number", "null"] }, floors_total: { type: ["number", "null"] },
    features: { type: "array", items: { type: "string", enum: ["mamad", "parking", "elevator", "sukkah_balcony", "storage", "ac"] } }, notes: { type: ["string", "null"] },
    evidence: { type: "object", additionalProperties: { type: "string" } } }, required: ["features", "evidence"] },
};
const SYSTEM = "Tu extrais des champs structurés d'une dictée ou d'un document manuscrit d'une agence immobilière en Israël (français, hébreu, anglais, souvent mélangés). RÈGLES : n'invente jamais — si l'information n'est pas dite, mets null ou une liste vide. Ne déduis pas un budget d'un quartier. Nombres en chiffres (« quatre millions » → 4000000). Pièces avec demi-pièces (3.5). Pour chaque champ rempli, cite dans `evidence` l'extrait exact (même langue que la source) qui le justifie.";

/** Extraction structurée par LLM (Anthropic, appel d'outil forcé). `image` = base64 JPEG pour les papiers manuscrits. */
export async function llmExtract(kind: ExtractKind, input: { text?: string; imageB64?: string }): Promise<Record<string, any>> {
  const cfg = input.imageB64 ? aiConfig().vision : aiConfig().extract;
  if (!cfg) throw new Error("llm_not_configured");
  const content: unknown[] = [];
  if (input.imageB64) content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: input.imageB64 } });
  content.push({ type: "text", text: input.text ? `Texte à analyser :\n"""${input.text.slice(0, 8000)}"""` : "Analyse le document ci-joint." });
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "x-api-key": cfg.key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: cfg.model, max_tokens: 1500, system: SYSTEM, tools: [{ name: "record_fields", description: "Enregistre les champs extraits", input_schema: SCHEMAS[kind] }], tool_choice: { type: "tool", name: "record_fields" }, messages: [{ role: "user", content }] }),
  });
  if (!r.ok) throw new Error(`llm_failed_${r.status}`);
  const j = (await r.json()) as { content?: { type: string; input?: Record<string, any> }[] };
  const tool = j.content?.find((b) => b.type === "tool_use");
  if (!tool?.input) throw new Error("llm_no_output");
  return tool.input;
}

/** Retouche d'une photo (niveau « amélioré »). */
export async function enhancePhoto(photo: Buffer, prompt: string): Promise<Buffer> {
  const c = aiConfig().image;
  if (!c) throw new Error("image_not_configured");
  const fd = new FormData();
  fd.append("model", c.model); fd.append("prompt", prompt);
  fd.append("image", new Blob([new Uint8Array(photo)], { type: "image/jpeg" }), "photo.jpg");
  const r = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${c.key}` }, body: fd });
  if (!r.ok) throw new Error(`image_failed_${r.status}`);
  const j = (await r.json()) as { data?: { b64_json?: string }[] };
  const b64 = j.data?.[0]?.b64_json;
  if (!b64) throw new Error("image_no_output");
  return Buffer.from(b64, "base64");
}
