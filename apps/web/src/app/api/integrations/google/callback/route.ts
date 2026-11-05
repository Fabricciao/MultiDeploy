import { NextResponse, type NextRequest } from "next/server";
import { getCtx } from "@/lib/session";
import { exchangeCode } from "@/lib/integrations/google";
import { verifyToken } from "@/lib/crypto";
import { saveGoogle } from "@/lib/data/connections";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const st = verifyToken<{ u: string; l: string; k: string }>(req.nextUrl.searchParams.get("state") ?? "");
  const locale = st && ["fr", "he", "en"].includes(st.l) ? st.l : "fr";
  const to = (g: string) => NextResponse.redirect(new URL(`/${locale}/settings/connections?g=${g}`, req.url));
  const code = req.nextUrl.searchParams.get("code");
  if (!st || st.k !== "gcal" || !code) return to("fail");
  const ctx = await getCtx(locale);
  if (ctx.userId !== st.u) return to("fail"); // l'état signé doit appartenir à la session courante
  try {
    const redirect = `${process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin}/api/integrations/google/callback`;
    await saveGoogle(ctx.userId, await exchangeCode(code, redirect));
    return to("ok");
  } catch { return to("fail"); }
}
