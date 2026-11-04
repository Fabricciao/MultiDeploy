import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { supabaseEnv } from "./env";

/** Rafraîchit la session et renvoie l'utilisateur (null si non connecté ou Supabase non configuré). */
export async function refreshSession(req: NextRequest, res: NextResponse) {
  const env = supabaseEnv();
  if (!env) return { configured: false as const, user: null };
  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
    },
  });
  // getUser() valide le JWT auprès d'Auth (getSession() ne le fait pas : jamais pour de l'autorisation)
  const { data } = await supabase.auth.getUser();
  return { configured: true as const, user: data.user };
}
