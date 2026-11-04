import "server-only";
import { db, type Ctx } from "../session";
import { sql } from "../db";

export async function getPlanOverview(ctx: Ctx) {
  const [org] = await sql`select o.plan, p.name, p.seats, p.storage_mb, p.ai_credits_monthly, p.features, s.status as sub_status, s.provider, s.customer_id, s.current_period_end, s.cancel_at_period_end,
      app.org_limit(o.id, 'seats') as seat_limit, app.org_limit(o.id, 'storage_mb') as storage_limit
    from public.organizations o join public.plans p on p.key = o.plan left join public.subscriptions s on s.organization_id = o.id where o.id = ${ctx.orgId}`;
  const [u] = await sql`select (select count(*) from public.memberships where organization_id = ${ctx.orgId} and status = 'active')::int as seats,
      coalesce((select sum(bytes) from public.property_media where organization_id = ${ctx.orgId}), 0)::bigint as storage_bytes,
      coalesce((select sum(delta) from public.ai_credit_ledger where organization_id = ${ctx.orgId}), 0)::float as credits`;
  const plans = await sql`select key, name, seats, storage_mb, ai_credits_monthly, features, price_monthly_ils from public.plans order by position`;
  return { org: org as Record<string, any>, usage: u as Record<string, any>, plans: plans as unknown as Record<string, any>[] };
}

/** Quota de stockage : octets déjà utilisés + à ajouter ≤ limite du plan. */
export async function storageAllows(ctx: Ctx, addBytes: number): Promise<boolean> {
  const [r] = await sql`select coalesce((select sum(bytes) from public.property_media where organization_id = ${ctx.orgId}), 0)::bigint as used, app.org_limit(${ctx.orgId}::uuid, 'storage_mb')::bigint * 1048576 as lim`;
  return Number(r!.used) + addBytes <= Number(r!.lim);
}
export { db };
