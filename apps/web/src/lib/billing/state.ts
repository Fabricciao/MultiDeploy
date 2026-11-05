/** Facturation manuelle : état d'abonnement déduit du plan et de l'échéance fixée par l'administrateur de la plateforme. */
export type BillingState = "trial" | "paid" | "expiring" | "overdue" | "unset";
export const EXPIRING_DAYS = 14;
export function billingState(plan: string, paidUntil: string | Date | null, today = new Date()): BillingState {
  if (plan === "trial") return "trial";
  if (!paidUntil) return "unset";
  const end = new Date(typeof paidUntil === "string" ? paidUntil : paidUntil.toISOString().slice(0, 10) + "T00:00:00Z");
  const t0 = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const days = Math.floor((Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) - t0) / 86400000);
  return days < 0 ? "overdue" : days <= EXPIRING_DAYS ? "expiring" : "paid";
}
export const stripeMode = () => process.env.BILLING_MODE === "stripe";
