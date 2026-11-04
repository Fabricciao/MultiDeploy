import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

/** Client Supabase côté serveur, lié à la session (RLS appliquée avec le JWT de l'utilisateur). */
export async function createClient() {
  const env = supabaseEnv();
  if (!env) throw new Error("Supabase n'est pas configuré (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY).");
  const store = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* appelé depuis un Server Component : le proxy rafraîchit la session */
        }
      },
    },
  });
}
