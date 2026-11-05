import { publicOrigin } from "@/lib/origin";
import { NextResponse, type NextRequest } from "next/server";
import { getCtx } from "@/lib/session";
import { exchangeCode } from "@/lib/integrations/google";
import { verifyToken } from "@/lib/crypto";
import { saveUserTokens } from "@/lib/data/connections";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const st = verifyToken<{ u: string; l: string; k: string }>(req.nextUrl.searchParams.get("state") ?? "");
  const locale = st && ["fr", "he", "en"].includes(st.l) ? st.l : "fr";
  const to = (g: string) => NextResponse.redirect(new URL(`/${locale}/settings/connections?g=${g}`, publicOrigin(req)));
  const code = req.nextUrl.searchParams.get("code");
  if (!st || (st.k !== "gcal" && st.k !== "gmail") || !code) return to("fail");
  const ctx = await getCtx(locale);
  if (ctx.userId !== st.u) return to("fail"); // l'état signé doit appartenir à la session courante
  try {
    const redirect = `${process.env.NEXT_PUBLIC_SITE_URL ?? publicOrigin(req)}/api/integrations/google/callback`;
    const tokens = await exchangeCode(code, redirect);
    if (st.k === "gmail" && (!tokens.email || !tokens.refresh_token)) return to("fail"); // l'adresse et le jeton de renouvellement sont indispensables à l'envoi
    await saveUserTokens(ctx.userId, st.k === "gmail" ? "gmail" : "google_calendar", tokens);
    return to(st.k === "gmail" ? "gmail_ok" : "ok");
  } catch { return to("fail"); }
}
