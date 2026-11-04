import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Retour OAuth / magic link : échange le code contre une session puis redirige. */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/fr";
  // Anti open-redirect : uniquement des chemins relatifs internes
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/fr";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/fr/login?error=auth`);
}
