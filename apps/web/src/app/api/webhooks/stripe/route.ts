import { NextResponse, type NextRequest } from "next/server";
import { applyStripeEvent, verifyStripeSignature } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";
/** Webhook Stripe : corps BRUT vérifié par signature avant tout traitement ; idempotent. */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const raw = await req.text();
  if (!verifyStripeSignature(raw, req.headers.get("stripe-signature"), secret)) return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  let evt: { id: string; type: string; data: { object: Record<string, any> } };
  try { evt = JSON.parse(raw); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  if (!evt?.id || !evt?.type) return NextResponse.json({ error: "bad_event" }, { status: 400 });
  const r = await applyStripeEvent(evt);
  return NextResponse.json({ received: true, result: r });
}
