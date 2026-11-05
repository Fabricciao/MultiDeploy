import "server-only";
import { freshTokens, type Tokens } from "./google";

/** Envoi par l'API Gmail depuis la boîte de l'utilisateur (portée gmail.send). Requêtes vérifiées avec des réponses simulées ; NON TESTÉ contre Google. */
const b64url = (b: Buffer) => b.toString("base64url");
const encWord = (v: string) => (/^[\x20-\x7e]*$/.test(v) ? v : `=?UTF-8?B?${Buffer.from(v, "utf8").toString("base64")}?=`);
const noCrlf = (v: string) => v.replace(/[\r\n]+/g, " ").trim(); // anti injection d'en-têtes
const wrap = (s: string) => s.replace(/(.{76})/g, "$1\r\n");

export type MailIn = { to: string; subject: string; html: string; text: string; fromName?: string; fromEmail: string; replyTo?: string; unsubscribeUrl?: string };
export function buildRawMessage(m: MailIn, boundary = `md_${Date.now().toString(36)}`): string {
  const from = m.fromName ? `${encWord(noCrlf(m.fromName).replace(/"/g, ""))} <${noCrlf(m.fromEmail)}>` : noCrlf(m.fromEmail);
  const lines = [`From: ${from}`, `To: ${noCrlf(m.to)}`, `Subject: ${encWord(noCrlf(m.subject))}`, "MIME-Version: 1.0",
    ...(m.replyTo ? [`Reply-To: ${noCrlf(m.replyTo)}`] : []), ...(m.unsubscribeUrl ? [`List-Unsubscribe: <${noCrlf(m.unsubscribeUrl)}>`] : []),
    `Content-Type: multipart/alternative; boundary="${boundary}"`, "",
    `--${boundary}`, 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", wrap(Buffer.from(m.text, "utf8").toString("base64")),
    `--${boundary}`, 'Content-Type: text/html; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", wrap(Buffer.from(m.html, "utf8").toString("base64")), `--${boundary}--`, ""];
  return lines.join("\r\n");
}

export async function sendViaGmail(t: Tokens, m: MailIn, fetchFn: typeof fetch = fetch): Promise<{ id: string; tokens: Tokens }> {
  const tokens = await freshTokens(t, fetchFn);
  const r = await fetchFn("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { Authorization: `Bearer ${tokens.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw: b64url(Buffer.from(buildRawMessage(m), "utf8")) }) });
  const j = (await r.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
  if (!r.ok || !j.id) throw new Error(r.status === 401 || r.status === 403 ? "gmail_reauth_required" : (j.error?.message ?? `gmail_${r.status}`).slice(0, 160));
  return { id: j.id, tokens };
}
