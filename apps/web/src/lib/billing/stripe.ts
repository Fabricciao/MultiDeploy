import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "../db";

/** Vérification de signature Stripe (schéma `t=<ts>,v1=<hmac-sha256>`), tolérance anti-rejeu, comparaison à temps constant. */
export function verifyStripeSignature(payload: string, header: string | null, secret: string, nowMs = Date.now(), toleranceSec = 300): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => { const i = kv.indexOf("="); return [kv.slice(0, i).trim(), kv.slice(i + 1)]; })) as Record<string, string>;
  const ts = Number(parts.t); if (!Number.isFinite(ts) || Math.abs(nowMs / 1000 - ts) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${ts}.${payload}`).digest();
  return header.split(",").filter((kv) => kv.trim().startsWith("v1=")).some((kv) => { const got = Buffer.from(kv.trim().slice(3), "hex"); return got.length === expected.length && timingSafeEqual(got, expected); });
}

export const priceToPlan = (env = process.env): Record<string, string> => Object.fromEntries([["starter", env.STRIPE_PRICE_STARTER], ["pro", env.STRIPE_PRICE_PRO], ["agency_plus", env.STRIPE_PRICE_AGENCY_PLUS]].filter(([, v]) => v).map(([k, v]) => [v!, k!]));

export type SubUpdate = { orgId: string; customerId: string | null; subscriptionId: string | null; plan: string | null; status: "trialing" | "active" | "past_due" | "canceled" | "paused" | null; periodEnd: Date | null; cancelAtPeriodEnd: boolean };
const STATUS: Record<string, SubUpdate["status"]> = { trialing: "trialing", active: "active", past_due: "past_due", unpaid: "past_due", canceled: "canceled", incomplete_expired: "canceled", paused: "paused" };

/** Traduit un événement Stripe en mise à jour d'abonnement (pur, testé). null = événement ignoré. */
export function mapStripeEvent(evt: { type: string; data: { object: Record<string, any> } }, prices = priceToPlan()): SubUpdate | null {
  const o = evt.data.object;
  if (evt.type === "checkout.session.completed") {
    const orgId = o.client_reference_id ?? o.metadata?.org_id; if (!orgId) return null;
    return { orgId, customerId: o.customer ?? null, subscriptionId: o.subscription ?? null, plan: o.metadata?.plan ?? null, status: "active", periodEnd: null, cancelAtPeriodEnd: false };
  }
  if (evt.type === "customer.subscription.updated" || evt.type === "customer.subscription.deleted") {
    const orgId = o.metadata?.org_id; if (!orgId) return null;
    const priceId = o.items?.data?.[0]?.price?.id as string | undefined;
    return { orgId, customerId: o.customer ?? null, subscriptionId: o.id ?? null, plan: priceId ? (prices[priceId] ?? null) : null, status: evt.type.endsWith("deleted") ? "canceled" : (STATUS[o.status] ?? null), periodEnd: o.current_period_end ? new Date(o.current_period_end * 1000) : null, cancelAtPeriodEnd: !!o.cancel_at_period_end };
  }
  if (evt.type === "invoice.payment_failed") {
    const orgId = o.subscription_details?.metadata?.org_id ?? o.metadata?.org_id; if (!orgId) return null;
    return { orgId, customerId: o.customer ?? null, subscriptionId: o.subscription ?? null, plan: null, status: "past_due", periodEnd: null, cancelAtPeriodEnd: false };
  }
  return null;
}

/** Applique un événement de façon idempotente (id d'événement unique). */
export async function applyStripeEvent(evt: { id: string; type: string; data: { object: Record<string, any> } }): Promise<"applied" | "duplicate" | "ignored"> {
  const inserted = await sql`insert into public.billing_events (id, type, payload) values (${evt.id}, ${evt.type}, ${sql.json(evt as never)}) on conflict do nothing returning id`;
  if (!inserted.length) return "duplicate";
  const u = mapStripeEvent(evt);
  if (!u) return "ignored";
  await sql`update public.subscriptions set provider = 'stripe', customer_id = coalesce(${u.customerId}, customer_id), subscription_id = coalesce(${u.subscriptionId}, subscription_id), plan = coalesce(${u.plan}, plan),
    status = coalesce(${u.status}, status), current_period_end = coalesce(${u.periodEnd}, current_period_end), cancel_at_period_end = ${u.cancelAtPeriodEnd}, updated_at = now() where organization_id = ${u.orgId}`;
  if (u.plan) await sql`update public.organizations set plan = ${u.plan} where id = ${u.orgId} and exists (select 1 from public.plans where key = ${u.plan})`;
  return "applied";
}

const form = (o: Record<string, string>) => new URLSearchParams(o).toString();
export const stripeConfigured = () => !!process.env.STRIPE_SECRET_KEY;

export async function createCheckout(i: { orgId: string; plan: string; email: string; successUrl: string; cancelUrl: string; customerId?: string | null }): Promise<string> {
  const price = Object.entries(priceToPlan()).find(([, plan]) => plan === i.plan)?.[0];
  if (!process.env.STRIPE_SECRET_KEY || !price) throw new Error("stripe_not_configured");
  const body: Record<string, string> = { mode: "subscription", "line_items[0][price]": price, "line_items[0][quantity]": "1", client_reference_id: i.orgId, success_url: i.successUrl, cancel_url: i.cancelUrl, "metadata[org_id]": i.orgId, "metadata[plan]": i.plan, "subscription_data[metadata][org_id]": i.orgId, allow_promotion_codes: "true" };
  if (i.customerId) body.customer = i.customerId; else body.customer_email = i.email;
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form(body) });
  const j = (await r.json()) as { url?: string; error?: { message?: string } };
  if (!r.ok || !j.url) throw new Error(j.error?.message ?? `stripe_${r.status}`);
  return j.url;
}
export async function createPortal(customerId: string, returnUrl: string): Promise<string> {
  const r = await fetch("https://api.stripe.com/v1/billing_portal/sessions", { method: "POST", headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form({ customer: customerId, return_url: returnUrl }) });
  const j = (await r.json()) as { url?: string }; if (!r.ok || !j.url) throw new Error(`stripe_${r.status}`); return j.url;
}
