import "server-only";
import { db, type Ctx } from "../session";
import { sql } from "../db";
import { decryptJson, encryptJson, cryptoConfigured } from "../crypto";

export type Provider = "whatsapp" | "facebook" | "instagram";
export type WhatsAppCfg = { phoneNumberId: string; accessToken: string; template?: string; lang?: string };
export type FacebookCfg = { pageId: string; accessToken: string };
export type InstagramCfg = { igUserId: string; accessToken: string };

export async function listConnections(ctx: Ctx) {
  return (await db(ctx, (tx) => tx`select provider, public_meta, status, updated_at from public.org_integrations_meta`)) as unknown as { provider: Provider; public_meta: Record<string, string>; status: string; updated_at: Date }[];
}
export async function saveConnection(ctx: Ctx, provider: Provider, config: Record<string, string>, meta: Record<string, string>): Promise<"ok" | "forbidden" | "no_key"> {
  if (!ctx.caps.has("org.manage") || ctx.impersonating) return "forbidden";
  if (!cryptoConfigured()) return "no_key";
  const enc = encryptJson(config, `${ctx.orgId}:${provider}`);
  await sql`insert into public.org_integrations (organization_id, provider, config_enc, public_meta, status, updated_at) values (${ctx.orgId}, ${provider}, ${enc}, ${sql.json(meta)}, 'connected', now())
    on conflict (organization_id, provider) do update set config_enc = excluded.config_enc, public_meta = excluded.public_meta, status = 'connected', updated_at = now()`;
  return "ok";
}
export async function removeConnection(ctx: Ctx, provider: Provider) { if (!ctx.caps.has("org.manage") || ctx.impersonating) return false; await sql`delete from public.org_integrations where organization_id = ${ctx.orgId} and provider = ${provider}`; return true; }
/** Lecture serveur uniquement (déchiffrement). Jamais renvoyé au navigateur. */
export async function getConnectionConfig<T>(orgId: string, provider: Provider): Promise<T | null> {
  const [r] = await sql`select config_enc from public.org_integrations where organization_id = ${orgId} and provider = ${provider} and status = 'connected'`;
  if (!r) return null;
  try { return decryptJson<T>(r.config_enc, `${orgId}:${provider}`); } catch { await sql`update public.org_integrations set status = 'error' where organization_id = ${orgId} and provider = ${provider}`; return null; }
}
export const orgByWhatsAppNumber = async (phoneNumberId: string) => (await sql`select organization_id from public.org_integrations where provider = 'whatsapp' and status = 'connected' and public_meta->>'phone_number_id' = ${phoneNumberId}`)[0]?.organization_id as string | undefined;
export async function hasWhatsApp(ctx: Ctx) { return ctx.features.has("whatsapp_api") && (await getConnectionConfig<WhatsAppCfg>(ctx.orgId, "whatsapp")) !== null; }

import type { Tokens } from "../integrations/google";
export async function saveGoogle(userId: string, t: Tokens) { await sql`insert into public.user_integrations (user_id, provider, config_enc) values (${userId}, 'google_calendar', ${encryptJson(t, `${userId}:google_calendar`)}) on conflict (user_id, provider) do update set config_enc = excluded.config_enc, updated_at = now()`; }
export async function getGoogle(userId: string): Promise<Tokens | null> { const [r] = await sql`select config_enc from public.user_integrations where user_id = ${userId} and provider = 'google_calendar'`; if (!r) return null; try { return decryptJson<Tokens>(r.config_enc, `${userId}:google_calendar`); } catch { return null; } }
export const removeGoogle = (userId: string) => sql`delete from public.user_integrations where user_id = ${userId} and provider = 'google_calendar'`;
