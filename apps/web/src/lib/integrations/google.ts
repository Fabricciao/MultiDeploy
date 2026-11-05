import "server-only";

/** Google Calendar (OAuth 2.0 « web server flow », accès hors-ligne). NON TESTÉ contre l'API réelle ; formes de requêtes vérifiées en test. */
export const googleConfigured = () => !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events";
export const GMAIL_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/gmail.send"];
export const authUrl = (redirectUri: string, state: string, scopes: string[] = [GOOGLE_SCOPE]) => `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!, redirect_uri: redirectUri, response_type: "code", scope: scopes.join(" "), access_type: "offline", prompt: "consent", state }).toString()}`;

export type Tokens = { access_token: string; refresh_token?: string; expires_at: number; email?: string };
/** Adresse e-mail contenue dans l'id_token renvoyé directement par Google (TLS) ; sert uniquement à l'affichage et à l'en-tête From. */
export function emailFromIdToken(idToken: string | undefined): string | undefined {
  try { const p = JSON.parse(Buffer.from(String(idToken).split(".")[1] ?? "", "base64url").toString()) as { email?: string; email_verified?: boolean }; return p.email && p.email_verified !== false && /^[^\s@<>"]+@[^\s@<>"]+$/.test(p.email) ? p.email : undefined; } catch { return undefined; }
}
async function token(body: Record<string, string>, fetchFn: typeof fetch): Promise<Tokens> {
  const r = await fetchFn("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!, client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!, ...body }).toString() });
  const j = (await r.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; id_token?: string; error?: string };
  if (!r.ok || !j.access_token) throw new Error(j.error ?? `google_${r.status}`);
  return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in ?? 3600) * 1000 - 60_000, email: emailFromIdToken(j.id_token) };
}
export const exchangeCode = (code: string, redirectUri: string, fetchFn: typeof fetch = fetch) => token({ code, redirect_uri: redirectUri, grant_type: "authorization_code" }, fetchFn);
export async function freshTokens(t: Tokens, fetchFn: typeof fetch = fetch): Promise<Tokens> {
  if (t.expires_at > Date.now()) return t;
  if (!t.refresh_token) throw new Error("google_reauth_required");
  const n = await token({ refresh_token: t.refresh_token, grant_type: "refresh_token" }, fetchFn);
  return { ...n, refresh_token: t.refresh_token, email: t.email ?? n.email };
}
export async function insertEvent(t: Tokens, e: { summary: string; description?: string; location?: string; start: Date; end: Date }, fetchFn: typeof fetch = fetch): Promise<string> {
  const r = await fetchFn("https://www.googleapis.com/calendar/v3/calendars/primary/events", { method: "POST", headers: { Authorization: `Bearer ${t.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ summary: e.summary, description: e.description, location: e.location, start: { dateTime: e.start.toISOString() }, end: { dateTime: e.end.toISOString() } }) });
  const j = (await r.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
  if (!r.ok || !j.id) throw new Error(j.error?.message ?? `google_${r.status}`);
  return j.id;
}
