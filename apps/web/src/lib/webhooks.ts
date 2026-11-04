import "server-only";
import { createHmac } from "node:crypto";
import { sql } from "./db";
import { assertPublicUrl } from "./brand/ssrf";

export const signWebhook = (secret: string, body: string, ts = Math.floor(Date.now() / 1000)) => `t=${ts},v1=${createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex")}`;
const BACKOFF_MIN = [1, 5, 30, 120, 360, 1440];
export const nextDelayMinutes = (attempts: number): number | null => BACKOFF_MIN[attempts - 1] ?? null; // null = abandon

/** Livre les webhooks dus. SSRF : l'URL est revalidée à chaque envoi ; pas de suivi de redirection ; 8 s max. */
export async function deliverDue(limit = 25): Promise<{ delivered: number; failed: number; retried: number }> {
  const rows = await sql`
    select d.id, d.attempts, e.url, e.secret, v.type, v.payload, v.created_at, v.id as event_id
    from public.webhook_deliveries d join public.webhook_endpoints e on e.id = d.endpoint_id and e.active join public.outbox_events v on v.id = d.event_id
    where d.status = 'pending' and d.next_attempt_at <= now() order by d.next_attempt_at limit ${limit} for update of d skip locked`;
  let delivered = 0, failed = 0, retried = 0;
  for (const r of rows) {
    const body = JSON.stringify({ id: `evt_${r.event_id}`, type: r.type, created_at: r.created_at, data: r.payload });
    let code = 0, err = "";
    try {
      await assertPublicUrl(r.url);
      const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 8000);
      const res = await fetch(r.url, { method: "POST", redirect: "manual", signal: ctl.signal, headers: { "Content-Type": "application/json", "User-Agent": "MultiDeploy-Webhooks/1.0", "X-MultiDeploy-Signature": signWebhook(r.secret, body), "X-MultiDeploy-Event": r.type }, body });
      clearTimeout(timer); code = res.status; if (!res.ok) err = `HTTP ${res.status}`;
    } catch (e) { err = (e as Error).message?.slice(0, 200) ?? "error"; }
    const attempts = r.attempts + 1;
    if (!err) { await sql`update public.webhook_deliveries set status = 'delivered', attempts = ${attempts}, response_code = ${code}, delivered_at = now(), last_error = null where id = ${r.id}`; delivered++; continue; }
    const delay = nextDelayMinutes(attempts);
    if (delay === null) { await sql`update public.webhook_deliveries set status = 'failed', attempts = ${attempts}, response_code = ${code || null}, last_error = ${err} where id = ${r.id}`; failed++; }
    else { await sql`update public.webhook_deliveries set attempts = ${attempts}, response_code = ${code || null}, last_error = ${err}, next_attempt_at = now() + make_interval(mins => ${delay}) where id = ${r.id}`; retried++; }
  }
  return { delivered, failed, retried };
}
