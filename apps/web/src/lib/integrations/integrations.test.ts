import { describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { parseWhatsAppWebhook, publishFacebookPhoto, publishInstagram, sendWhatsAppText, sendWhatsAppTemplate, verifyMetaSignature } from "./meta";
import { authUrl, freshTokens, insertEvent } from "./google";

const okJson = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
describe("WhatsApp Cloud API (requêtes vérifiées, API simulée)", () => {
  it("texte : URL, auth Bearer, numéro nettoyé, corps conforme", async () => {
    const f = okJson({ messages: [{ id: "wamid.1" }] });
    const r = await sendWhatsAppText({ phoneNumberId: "123", accessToken: "tok" }, "+972 50-123-4567", "Bonjour", f as never);
    expect(r.id).toBe("wamid.1");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/graph\.facebook\.com\/v[\d.]+\/123\/messages$/); expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body as string)).toMatchObject({ messaging_product: "whatsapp", to: "972501234567", type: "text", text: { body: "Bonjour" } });
  });
  it("modèle avec paramètres", async () => { const f = okJson({ messages: [{ id: "w2" }] }); await sendWhatsAppTemplate({ phoneNumberId: "1", accessToken: "t" }, "050", "selection_biens", "he", ["דנה"], f as never); expect(JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).template).toMatchObject({ name: "selection_biens", language: { code: "he" }, components: [{ type: "body", parameters: [{ type: "text", text: "דנה" }] }] }); });
  it("erreur API → exception avec le message", async () => { await expect(sendWhatsAppText({ phoneNumberId: "1", accessToken: "t" }, "1", "x", okJson({ error: { message: "Token expired" } }, 401) as never)).rejects.toThrow("Token expired"); });
});
describe("webhook Meta", () => {
  const body = JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: "123" }, messages: [{ type: "text", from: "972501234567", id: "m1", timestamp: "1700000000", text: { body: "Je suis intéressée" } }, { type: "image", from: "1", id: "m2" }] } }] }] });
  it("signature valide / invalide", () => { const sig = "sha256=" + createHmac("sha256", "appsecret").update(body).digest("hex"); expect(verifyMetaSignature(body, sig, "appsecret")).toBe(true); expect(verifyMetaSignature(body + " ", sig, "appsecret")).toBe(false); expect(verifyMetaSignature(body, null, "appsecret")).toBe(false); expect(verifyMetaSignature(body, sig, "")).toBe(false); });
  it("extrait uniquement les messages texte, numéro en E.164", () => expect(parseWhatsAppWebhook(JSON.parse(body))).toEqual([{ phoneNumberId: "123", messages: [{ from: "+972501234567", text: "Je suis intéressée", id: "m1", timestamp: 1700000000 }] }]));
  it("charge utile inattendue : aucune erreur", () => { expect(parseWhatsAppWebhook(null)).toEqual([]); expect(parseWhatsAppWebhook({ entry: [{ changes: [{}] }] })).toEqual([]); });
});
describe("publication Meta", () => {
  it("Facebook : photo par URL avec légende", async () => { const f = okJson({ post_id: "p_1" }); expect((await publishFacebookPhoto({ pageId: "9", accessToken: "t" }, "https://x.test/a.png", "Légende", f as never)).id).toBe("p_1"); const [u, i] = f.mock.calls[0] as unknown as [string, RequestInit]; expect(u).toMatch(/\/9\/photos$/); expect(String(i.body)).toContain("url=https%3A%2F%2Fx.test%2Fa.png"); });
  it("Instagram : conteneur puis publication", async () => { const f = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ id: "c1" }))).mockResolvedValueOnce(new Response(JSON.stringify({ id: "i1" }))); expect((await publishInstagram({ igUserId: "7", accessToken: "t" }, "https://x.test/a.png", "cap", f as never)).id).toBe("i1"); expect(String((f.mock.calls[0] as unknown as [string, RequestInit])[0])).toMatch(/\/7\/media$/); expect(String((f.mock.calls[1] as unknown as [string, RequestInit])[1].body)).toContain("creation_id=c1"); });
});
describe("Google Calendar", () => {
  it("URL d'autorisation : accès hors-ligne + portée minimale", () => { process.env.GOOGLE_OAUTH_CLIENT_ID = "cid"; const u = new URL(authUrl("https://app.test/cb", "st")); expect(u.searchParams.get("access_type")).toBe("offline"); expect(u.searchParams.get("scope")).toContain("calendar.events"); expect(u.searchParams.get("state")).toBe("st"); });
  it("jeton expiré → rafraîchi avec le refresh_token", async () => { process.env.GOOGLE_OAUTH_CLIENT_ID = "cid"; process.env.GOOGLE_OAUTH_CLIENT_SECRET = "sec"; const f = okJson({ access_token: "new", expires_in: 3600 }); const t = await freshTokens({ access_token: "old", refresh_token: "r", expires_at: 1 }, f as never); expect(t.access_token).toBe("new"); expect(t.refresh_token).toBe("r"); expect(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body)).toContain("grant_type=refresh_token"); });
  it("sans refresh_token : réauthentification requise", async () => { await expect(freshTokens({ access_token: "old", expires_at: 1 })).rejects.toThrow("google_reauth_required"); });
  it("création d'événement", async () => { const f = okJson({ id: "ev1" }); expect(await insertEvent({ access_token: "t", expires_at: Date.now() + 1e6 }, { summary: "Visite", start: new Date("2026-11-04T10:00:00Z"), end: new Date("2026-11-04T10:30:00Z") }, f as never)).toBe("ev1"); expect(JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).start.dateTime).toBe("2026-11-04T10:00:00.000Z"); });
});
