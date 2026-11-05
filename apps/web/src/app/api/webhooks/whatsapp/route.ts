import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { parseWhatsAppWebhook, verifyMetaSignature } from "@/lib/integrations/meta";
import { orgByWhatsAppNumber } from "@/lib/data/connections";
import { normalizePhone } from "@/lib/phone";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
/** Vérification d'abonnement Meta (challenge) */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams, token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === token) return new NextResponse(q.get("hub.challenge") ?? "", { status: 200 });
  return new NextResponse("Forbidden", { status: 403 });
}
/** Messages entrants : signature vérifiée sur le corps BRUT, rattachés au client par numéro, idempotents. */
export async function POST(req: NextRequest) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const raw = await req.text();
  if (raw.length > 200_000 || !verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"), secret)) return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  if (!rateLimit("wa-webhook", 600, 60_000).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  let payload: unknown; try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  let stored = 0;
  for (const batch of parseWhatsAppWebhook(payload)) {
    const orgId = await orgByWhatsAppNumber(batch.phoneNumberId); if (!orgId) continue;
    for (const m of batch.messages) {
      const phone = normalizePhone(m.from); if (!phone) continue;
      if ((await sql`select 1 from public.activities where organization_id = ${orgId} and payload->>'wa_id' = ${m.id}`).length) continue;
      let [c] = await sql`select id from public.contacts where organization_id = ${orgId} and phone_primary_e164 = ${phone} and deleted_at is null limit 1`;
      if (!c) [c] = await sql`insert into public.contacts (organization_id, kinds, phones, preferred_locale, marketing_consent) values (${orgId}, '{buyer}', ${sql.json([{ e164: phone, is_whatsapp: true }])}, 'fr', ${sql.json({ granted: false, channel: "whatsapp_inbound" })}) returning id`;
      await sql`insert into public.activities (organization_id, kind, contact_id, summary, payload) values (${orgId}, 'whatsapp', ${c!.id}, ${m.text}, ${sql.json({ wa_id: m.id, direction: "in" })})`;
      stored++;
    }
  }
  return NextResponse.json({ received: true, stored });
}
