import "server-only";
import { randomBytes } from "node:crypto";
import { db, type Ctx } from "../session";
import { newApiKey } from "../api/keys";
import { assertPublicUrl } from "../brand/ssrf";

export async function listIntegrations(ctx: Ctx) {
  const keys = await db(ctx, (tx) => tx`select id, name, key_prefix, scopes, last_used_at, revoked_at, created_at from public.api_keys order by created_at desc`);
  const hooks = await db(ctx, (tx) => tx`select e.id, e.url, e.events, e.active, e.secret, (select count(*) from public.webhook_deliveries d where d.endpoint_id = e.id and d.status = 'failed')::int as failed,
    (select count(*) from public.webhook_deliveries d where d.endpoint_id = e.id and d.status = 'delivered')::int as delivered from public.webhook_endpoints e order by e.created_at desc`);
  return { keys: keys as unknown as Record<string, any>[], hooks: hooks as unknown as Record<string, any>[] };
}
export async function createKey(ctx: Ctx, name: string, scopes: string[]) {
  const k = newApiKey();
  await db(ctx, (tx) => tx`insert into public.api_keys (organization_id, name, key_prefix, key_hash, scopes) values (${ctx.orgId}, ${name.slice(0, 60)}, ${k.prefix}, ${k.hash}, ${scopes})`);
  return k.raw; // affichée UNE seule fois : seul le hachage est conservé
}
export const revokeKey = (ctx: Ctx, id: string) => db(ctx, async (tx) => (await tx`update public.api_keys set revoked_at = now() where id = ${id} and revoked_at is null returning id`).length > 0);
export async function createHook(ctx: Ctx, url: string, events: string[]): Promise<"ok" | "invalid_url" | "blocked"> {
  if (!/^https:\/\//i.test(url)) return "invalid_url";
  try { await assertPublicUrl(url); } catch { return "blocked"; }
  await db(ctx, (tx) => tx`insert into public.webhook_endpoints (organization_id, url, events, secret) values (${ctx.orgId}, ${url.slice(0, 300)}, ${events}, ${randomBytes(24).toString("hex")})`);
  return "ok";
}
export const deleteHook = (ctx: Ctx, id: string) => db(ctx, async (tx) => (await tx`delete from public.webhook_endpoints where id = ${id} returning id`).length > 0);
