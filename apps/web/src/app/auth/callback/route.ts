import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicOrigin } from "@/lib/origin";

/** Retour OAuth / magic link : échange le code contre une session puis redirige. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const origin = publicOrigin(req);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/fr";
  // Anti open-redirect : uniquement des chemins relatifs internes
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/fr";
  // Lien à usage unique (token_hash) : connexion de secours générée par l'administrateur, sans e-mail ni PKCE.
  const tokenHash = searchParams.get("token_hash"), type = searchParams.get("type");
  if (tokenHash && (type === "magiclink" || type === "email" || type === "invite" || type === "recovery")) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/fr/login?error=auth`);
}
