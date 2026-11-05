import { NextResponse, type NextRequest } from "next/server";
import { getCtx } from "@/lib/session";
import { authUrl, googleConfigured, GMAIL_SCOPES } from "@/lib/integrations/google";
import { signToken, cryptoConfigured } from "@/lib/crypto";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("locale") ?? "fr"; const locale = ["fr", "he", "en"].includes(q) ? q : "fr";
  const ctx = await getCtx(locale);
  if (!googleConfigured() || !cryptoConfigured() || ctx.impersonating) return NextResponse.redirect(new URL(`/${locale}/settings/connections?g=fail`, req.url));
  const gmail = req.nextUrl.searchParams.get("service") === "gmail";
  const state = signToken({ u: ctx.userId, l: locale, k: gmail ? "gmail" : "gcal" }, 600);
  const redirect = `${process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin}/api/integrations/google/callback`;
  return NextResponse.redirect(gmail ? authUrl(redirect, state, GMAIL_SCOPES) : authUrl(redirect, state));
}
