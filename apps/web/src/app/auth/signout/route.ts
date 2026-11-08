import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { publicOrigin } from "@/lib/origin";
import { DEV_USER_COOKIE, IMPERSONATE_COOKIE } from "@/lib/session";

/** Déconnexion : ferme la session Supabase, efface les cookies d'accès, renvoie à la page de connexion. POST uniquement (pas de déconnexion par simple lien). */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const raw = String(fd?.get("locale") ?? "fr");
  const locale = ["fr", "he", "en"].includes(raw) ? raw : "fr";
  if (supabaseEnv()) {
    try { await (await createClient()).auth.signOut(); } catch { /* session déjà expirée */ }
  }
  const store = await cookies();
  for (const c of store.getAll()) if (c.name.startsWith("sb-") || c.name === IMPERSONATE_COOKIE || c.name === DEV_USER_COOKIE) store.delete(c.name);
  return NextResponse.redirect(`${publicOrigin(req)}/${locale}/login?signedout=1`, { status: 303 });
}
