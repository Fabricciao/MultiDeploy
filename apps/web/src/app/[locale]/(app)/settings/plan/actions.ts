"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCtx } from "@/lib/session";
import { sql } from "@/lib/db";
import { createCheckout, createPortal, stripeConfigured } from "@/lib/billing/stripe";

const loc = (fd: FormData) => (["fr", "he", "en"].includes(String(fd.get("locale"))) ? String(fd.get("locale")) : "fr");
async function site() { const h = await headers(); return process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`; }

export async function checkoutAction(fd: FormData) {
  const locale = loc(fd); const ctx = await getCtx(locale);
  if (!ctx.caps.has("billing.manage") || ctx.impersonating) redirect(`/${locale}/settings/plan?err=forbidden`);
  const plan = String(fd.get("plan"));
  if (!stripeConfigured()) redirect(`/${locale}/settings/plan?err=billing_unavailable`);
  const [u] = await sql`select u.email, s.customer_id from auth.users u left join public.subscriptions s on s.organization_id = ${ctx.orgId} where u.id = ${ctx.userId}`;
  let url: string;
  try { url = await createCheckout({ orgId: ctx.orgId, plan, email: u!.email, customerId: u!.customer_id, successUrl: `${await site()}/${locale}/settings/plan?ok=1`, cancelUrl: `${await site()}/${locale}/settings/plan` }); }
  catch { redirect(`/${locale}/settings/plan?err=billing_unavailable`); }
  redirect(url);
}
export async function portalAction(fd: FormData) {
  const locale = loc(fd); const ctx = await getCtx(locale);
  if (!ctx.caps.has("billing.manage") || ctx.impersonating || !stripeConfigured()) redirect(`/${locale}/settings/plan?err=billing_unavailable`);
  const [s] = await sql`select customer_id from public.subscriptions where organization_id = ${ctx.orgId}`;
  if (!s?.customer_id) redirect(`/${locale}/settings/plan?err=billing_unavailable`);
  let url: string;
  try { url = await createPortal(s.customer_id, `${await site()}/${locale}/settings/plan`); } catch { redirect(`/${locale}/settings/plan?err=billing_unavailable`); }
  redirect(url);
}
