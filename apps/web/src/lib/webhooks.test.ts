import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { nextDelayMinutes, signWebhook } from "./webhooks";
import { verifyStripeSignature } from "./billing/stripe";

describe("webhooks sortants", () => {
  it("signature au format t=…,v1=… vérifiable par le destinataire", () => {
    const body = '{"id":"evt_1"}', h = signWebhook("sec", body, 1_800_000_000);
    expect(h).toBe(`t=1800000000,v1=${createHmac("sha256", "sec").update(`1800000000.${body}`).digest("hex")}`);
    expect(verifyStripeSignature(body, h, "sec", 1_800_000_000_000)).toBe(true); // même schéma que Stripe : un seul code de vérification côté client
  });
  it("reprises exponentielles puis abandon", () => { expect([1, 2, 3, 4, 5, 6].map(nextDelayMinutes)).toEqual([1, 5, 30, 120, 360, 1440]); expect(nextDelayMinutes(7)).toBeNull(); });
});
