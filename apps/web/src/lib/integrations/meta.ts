import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const GRAPH = () => `${process.env.META_GRAPH_BASE ?? "https://graph.facebook.com"}/${process.env.META_GRAPH_VERSION ?? "v21.0"}`;
const norm = (p: string) => p.replace(/\D/g, "");

/** WhatsApp Business Cloud API — envoi d'un message texte (fenêtre de 24 h) ou d'un modèle approuvé. NON TESTÉ contre l'API réelle. */
export async function sendWhatsAppText(cfg: { phoneNumberId: string; accessToken: string }, to: string, body: string, fetchFn: typeof fetch = fetch) {
  const r = await fetchFn(`${GRAPH()}/${cfg.phoneNumberId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${cfg.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: norm(to), type: "text", text: { body: body.slice(0, 4000), preview_url: true } }) });
  const j = (await r.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
  if (!r.ok) throw new Error(j.error?.message ?? `whatsapp_${r.status}`);
  return { id: j.messages?.[0]?.id ?? null };
}
export async function sendWhatsAppTemplate(cfg: { phoneNumberId: string; accessToken: string }, to: string, template: string, lang: string, params: string[], fetchFn: typeof fetch = fetch) {
  const r = await fetchFn(`${GRAPH()}/${cfg.phoneNumberId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${cfg.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: norm(to), type: "template", template: { name: template, language: { code: lang }, components: params.length ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] : [] } }) });
  const j = (await r.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
  if (!r.ok) throw new Error(j.error?.message ?? `whatsapp_${r.status}`);
  return { id: j.messages?.[0]?.id ?? null };
}

/** Webhook Meta : signature X-Hub-Signature-256 = « sha256=<hmac(appSecret, corps brut)> ». */
export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith("sha256=") || !appSecret) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest(), got = Buffer.from(header.slice(7), "hex");
  return got.length === expected.length && timingSafeEqual(got, expected);
}
export type InboundMessage = { from: string; text: string; id: string; timestamp: number };
export function parseWhatsAppWebhook(payload: any): { phoneNumberId: string; messages: InboundMessage[] }[] {
  const out: { phoneNumberId: string; messages: InboundMessage[] }[] = [];
  for (const e of payload?.entry ?? []) for (const c of e?.changes ?? []) {
    const v = c?.value; if (!v?.metadata?.phone_number_id) continue;
    const messages = (v.messages ?? []).filter((m: any) => m?.type === "text" && m?.from).map((m: any) => ({ from: `+${String(m.from).replace(/\D/g, "")}`, text: String(m.text?.body ?? "").slice(0, 2000), id: String(m.id), timestamp: Number(m.timestamp) || 0 }));
    if (messages.length) out.push({ phoneNumberId: String(v.metadata.phone_number_id), messages });
  }
  return out;
}

/** Publication Facebook (photo sur une Page) et Instagram (conteneur puis publication ; l'image doit être une URL publique). NON TESTÉ contre l'API réelle. */
export async function publishFacebookPhoto(cfg: { pageId: string; accessToken: string }, imageUrl: string, caption: string, fetchFn: typeof fetch = fetch) {
  const r = await fetchFn(`${GRAPH()}/${cfg.pageId}/photos`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ url: imageUrl, caption: caption.slice(0, 2000), access_token: cfg.accessToken, published: "true" }).toString() });
  const j = (await r.json().catch(() => ({}))) as { id?: string; post_id?: string; error?: { message?: string } };
  if (!r.ok) throw new Error(j.error?.message ?? `facebook_${r.status}`);
  return { id: j.post_id ?? j.id ?? null };
}
export async function publishInstagram(cfg: { igUserId: string; accessToken: string }, imageUrl: string, caption: string, fetchFn: typeof fetch = fetch) {
  const post = async (path: string, body: Record<string, string>) => { const r = await fetchFn(`${GRAPH()}/${path}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ ...body, access_token: cfg.accessToken }).toString() }); const j = (await r.json().catch(() => ({}))) as { id?: string; error?: { message?: string } }; if (!r.ok) throw new Error(j.error?.message ?? `instagram_${r.status}`); return j; };
  const c = await post(`${cfg.igUserId}/media`, { image_url: imageUrl, caption: caption.slice(0, 2200) });
  const p = await post(`${cfg.igUserId}/media_publish`, { creation_id: c.id! });
  return { id: p.id ?? null };
}
