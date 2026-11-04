import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { sql } from "../db";

export const hashKey = (k: string) => createHash("sha256").update(k).digest("hex");
export const newApiKey = () => { const raw = `mdk_${randomBytes(24).toString("hex")}`; return { raw, prefix: raw.slice(0, 10), hash: hashKey(raw) }; };

export type ApiAuth = { orgId: string; keyId: string; scopes: string[] };
/** Authentifie une clé « Bearer mdk_… » : hachée, non révoquée, agence active ET plan avec l'option API. */
export async function authenticateKey(header: string | null): Promise<ApiAuth | null> {
  const m = /^Bearer (mdk_[0-9a-f]{48})$/.exec(header ?? "");
  if (!m) return null;
  const [k] = await sql`select k.id, k.organization_id, k.scopes from public.api_keys k join public.organizations o on o.id = k.organization_id and o.status = 'active'
    where k.key_hash = ${hashKey(m[1]!)} and k.revoked_at is null and app.org_feature(k.organization_id, 'api')`;
  if (!k) return null;
  void sql`update public.api_keys set last_used_at = now() where id = ${k.id} and (last_used_at is null or last_used_at < now() - interval '1 minute')`.catch(() => {});
  return { orgId: k.organization_id, keyId: k.id, scopes: k.scopes };
}
