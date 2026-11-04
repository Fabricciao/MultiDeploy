import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { mapStripeEvent, verifyStripeSignature } from "./stripe";

const SECRET = "whsec_test_secret", BODY = JSON.stringify({ id: "evt_1", type: "x" });
const sign = (ts: number, body = BODY, secret = SECRET) => `t=${ts},v1=${createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex")}`;
const NOW = 1_800_000_000_000;

describe("verifyStripeSignature", () => {
  it("accepte une signature valide", () => expect(verifyStripeSignature(BODY, sign(NOW / 1000), SECRET, NOW)).toBe(true));
  it("refuse un corps modifié", () => expect(verifyStripeSignature(BODY + " ", sign(NOW / 1000), SECRET, NOW)).toBe(false));
  it("refuse un mauvais secret", () => expect(verifyStripeSignature(BODY, sign(NOW / 1000, BODY, "other"), SECRET, NOW)).toBe(false));
  it("refuse le rejeu (hors tolérance de 5 min)", () => expect(verifyStripeSignature(BODY, sign(NOW / 1000 - 400), SECRET, NOW)).toBe(false));
  it("refuse en-tête absent, vide ou malformé", () => { expect(verifyStripeSignature(BODY, null, SECRET, NOW)).toBe(false); expect(verifyStripeSignature(BODY, "", SECRET, NOW)).toBe(false); expect(verifyStripeSignature(BODY, "t=abc,v1=zz", SECRET, NOW)).toBe(false); });
  it("accepte si l'une des signatures v1 est valide (rotation de secret)", () => expect(verifyStripeSignature(BODY, `${sign(NOW / 1000)},v1=deadbeef`, SECRET, NOW)).toBe(true));
  it("refuse sans secret configuré", () => expect(verifyStripeSignature(BODY, sign(NOW / 1000), "", NOW)).toBe(false));
});

describe("mapStripeEvent", () => {
  const prices = { price_pro: "pro", price_starter: "starter" };
  it("checkout terminé → abonnement actif de l'agence", () => expect(mapStripeEvent({ type: "checkout.session.completed", data: { object: { client_reference_id: "org-1", customer: "cus_1", subscription: "sub_1", metadata: { plan: "pro" } } } }, prices)).toMatchObject({ orgId: "org-1", plan: "pro", status: "active", customerId: "cus_1" }));
  it("mise à jour d'abonnement : plan déduit du prix, fin de période", () => expect(mapStripeEvent({ type: "customer.subscription.updated", data: { object: { id: "sub_1", customer: "cus_1", status: "active", metadata: { org_id: "org-1" }, items: { data: [{ price: { id: "price_pro" } }] }, current_period_end: 1_900_000_000, cancel_at_period_end: true } } }, prices)).toMatchObject({ plan: "pro", status: "active", cancelAtPeriodEnd: true, periodEnd: new Date(1_900_000_000_000) }));
  it("abonnement supprimé → annulé", () => expect(mapStripeEvent({ type: "customer.subscription.deleted", data: { object: { id: "sub_1", status: "canceled", metadata: { org_id: "org-1" } } } }, prices)?.status).toBe("canceled"));
  it("paiement échoué → impayé", () => expect(mapStripeEvent({ type: "invoice.payment_failed", data: { object: { subscription: "sub_1", subscription_details: { metadata: { org_id: "org-1" } } } } }, prices)?.status).toBe("past_due"));
  it("événements sans org_id ou inconnus : ignorés (aucun effet)", () => { expect(mapStripeEvent({ type: "customer.subscription.updated", data: { object: { id: "s", status: "active", metadata: {} } } }, prices)).toBeNull(); expect(mapStripeEvent({ type: "charge.refunded", data: { object: {} } }, prices)).toBeNull(); });
  it("prix inconnu : le plan n'est pas modifié", () => expect(mapStripeEvent({ type: "customer.subscription.updated", data: { object: { id: "s", status: "active", metadata: { org_id: "o" }, items: { data: [{ price: { id: "price_x" } }] } } } }, prices)?.plan).toBeNull());
});
