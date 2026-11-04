"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

const localeSchema = z.enum(routing.locales);

async function origin() {
  const h = await headers();
  return process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

export async function signInWithGoogle(formData: FormData) {
  const locale = localeSchema.catch("fr").parse(formData.get("locale"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback?next=/${locale}` },
  });
  if (error || !data.url) redirect(`/${locale}/login?error=oauth`);
  redirect(data.url);
}

export async function signInWithMagicLink(formData: FormData) {
  const locale = localeSchema.catch("fr").parse(formData.get("locale"));
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) redirect(`/${locale}/login?error=email`);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    // shouldCreateUser: false → l'accès se fait uniquement par invitation d'agence
    options: { shouldCreateUser: false, emailRedirectTo: `${await origin()}/auth/callback?next=/${locale}` },
  });
  redirect(`/${locale}/login?${error ? "error=magic" : "sent=1"}`);
}
