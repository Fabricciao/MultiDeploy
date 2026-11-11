import { NextResponse, type NextRequest } from "next/server";
import { getCtx } from "@/lib/session";
import { getMandate, logMandateSent, mandateLinks } from "@/lib/data/mandates";
import { siteBase } from "@/lib/data/slips";
import { publicOrigin } from "@/lib/origin";

/** Ouvre WhatsApp avec le message et le lien du mandat, et note l'envoi. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const back = NextResponse.redirect(new URL("/", publicOrigin(req)), 303);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return back;
  const ctx = await getCtx();
  const m = await getMandate(ctx, id);
  if (!m) return back;
  const lang = req.nextUrl.searchParams.get("l");
  const l = mandateLinks(ctx, m, await siteBase(), true, lang === "fr" || lang === "he" || lang === "en" ? lang : undefined);
  if (!l.wa) return back;
  await logMandateSent(ctx, m, "whatsapp");
  return NextResponse.redirect(l.wa, 303);
}
