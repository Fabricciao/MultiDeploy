import { describe, expect, it, vi } from "vitest";
import { buildRawMessage, sendViaGmail } from "./gmail";
import { authUrl, emailFromIdToken, GMAIL_SCOPES } from "./google";

const decode = (raw: string) => Buffer.from(raw, "base64url").toString("utf8");
const m = { to: "client@example.test", subject: "Sélection pour vous — שלום", html: "<p>Bonjour</p>", text: "Bonjour", fromName: "Yaël Lévy", fromEmail: "yael@gmail.test" };
describe("Gmail", () => {
  it("message MIME : en-têtes encodés UTF-8, parties texte et HTML", () => {
    const raw = buildRawMessage(m, "B"); expect(raw).toContain("From: =?UTF-8?B?"); expect(raw).toContain("<yael@gmail.test>"); expect(raw).toContain("Subject: =?UTF-8?B?");
    expect(raw).toContain("multipart/alternative"); expect(Buffer.from(raw.split("text/plain")[1]!.split("\r\n\r\n")[1]!.split("\r\n--")[0]!.replace(/\r\n/g, ""), "base64").toString()).toBe("Bonjour");
  });
  it("anti injection d'en-têtes (retours à la ligne dans le sujet / destinataire)", () => {
    const raw = buildRawMessage({ ...m, subject: "Hi\r\nBcc: spy@evil.test", to: "a@b.test\r\nBcc: spy@evil.test" }, "B");
    expect(raw.split("\r\n").some((l) => /^Bcc:/i.test(l))).toBe(false);
  });
  it("List-Unsubscribe et Reply-To", () => { const raw = buildRawMessage({ ...m, replyTo: "r@x.test", unsubscribeUrl: "https://x.test/u/1" }, "B"); expect(raw).toContain("List-Unsubscribe: <https://x.test/u/1>"); expect(raw).toContain("Reply-To: r@x.test"); });
  it("envoi : jeton Bearer, corps {raw} en base64url", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ id: "g1" }), { status: 200 }));
    const r = await sendViaGmail({ access_token: "tok", expires_at: Date.now() + 3600_000 }, m, f as unknown as typeof fetch);
    expect(r.id).toBe("g1"); const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://gmail.googleapis.com/gmail/v1/users/me/messages/send"); expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(decode(JSON.parse(String(init.body)).raw)).toContain("To: client@example.test");
  });
  it("401 → reconnexion demandée", async () => { await expect(sendViaGmail({ access_token: "t", expires_at: Date.now() + 3600_000 }, m, (async () => new Response("{}", { status: 401 })) as unknown as typeof fetch)).rejects.toThrow("gmail_reauth_required"); });
  it("URL d'autorisation : portée gmail.send + e-mail, hors ligne", () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "cid"; const u = new URL(authUrl("https://x/cb", "st", GMAIL_SCOPES));
    expect(u.searchParams.get("scope")).toBe("openid email https://www.googleapis.com/auth/gmail.send"); expect(u.searchParams.get("access_type")).toBe("offline");
  });
  it("adresse lue dans l'id_token (et refus d'une valeur douteuse)", () => {
    const tok = (o: object) => `h.${Buffer.from(JSON.stringify(o)).toString("base64url")}.s`;
    expect(emailFromIdToken(tok({ email: "a@b.test", email_verified: true }))).toBe("a@b.test"); expect(emailFromIdToken(tok({ email: "a@b.test", email_verified: false }))).toBeUndefined(); expect(emailFromIdToken(tok({ email: "a b@c" }))).toBeUndefined(); expect(emailFromIdToken("garbage")).toBeUndefined();
  });
});
