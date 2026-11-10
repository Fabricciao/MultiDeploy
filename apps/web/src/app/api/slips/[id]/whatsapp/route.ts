import { NextResponse, type NextRequest } from "next/server";
import { getCtx } from "@/lib/session";
import { getSlip, logSlipSent, siteBase, slipInfo } from "@/lib/data/slips";
import { publicOrigin } from "@/lib/origin";

/** Ouvre WhatsApp avec le message préenregistré et le lien du bon de visite, et note l'envoi dans l'historique du client. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const back = NextResponse.redirect(new URL("/", publicOrigin(req)), 303);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return back;
  const ctx = await getCtx();
  const r = await getSlip(ctx, id);
  if (!r) return back;
  const info = slipInfo(ctx, r, await siteBase(), true);
  if (!info.wa) return back;
  await logSlipSent(ctx, r.id, r.contact_id!, r.property_id, "whatsapp");
  return NextResponse.redirect(info.wa, 303);
}
