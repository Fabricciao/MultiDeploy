"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const localeSchema = z.enum(routing.locales);
const LOGIN_EMAIL_COOKIE = "md_login_email";

async function origin() {
  const h = await headers();
  return process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

const safeNext = (v: unknown, fallback: string) => (typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : fallback);

export async function signInWithGoogle(formData: FormData) {
  const locale = localeSchema.catch("fr").parse(formData.get("locale"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(safeNext(formData.get("next"), `/${locale}`))}` },
  });
  if (error || !data.url) redirect(`/${locale}/login?error=oauth`);
  redirect(data.url);
}

export async function signInWithMagicLink(formData: FormData) {
  const locale = localeSchema.catch("fr").parse(formData.get("locale"));
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) redirect(`/${locale}/login?error=email`);
  // Anti-abus : plafonds par IP et par adresse (le courrier coûte de l'argent et peut servir à harceler un tiers).
  const ip = clientIp(await headers());
  if (!rateLimit(`login-ip:${ip}`, 10, 600_000).ok || !rateLimit(`login-mail:${email.data.toLowerCase()}`, 3, 600_000).ok) redirect(`/${locale}/login?error=rate`);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    // shouldCreateUser: false → l'accès se fait uniquement par invitation d'agence
    options: { shouldCreateUser: false, emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(safeNext(formData.get("next"), `/${locale}`))}` },
  });
  // Réponse identique que l'adresse soit connue ou non (pas d'énumération de comptes) ; seule une panne serveur est signalée.
  if (error && (error.status ?? 0) >= 500) redirect(`/${locale}/login?error=magic`);
  // L'adresse reste dans un cookie court (jamais dans l'URL) pour le formulaire de saisie du code reçu par e-mail.
  (await cookies()).set(LOGIN_EMAIL_COOKIE, email.data, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
  redirect(`/${locale}/login?sent=1`);
}

/** Connexion par code à usage unique (alternative au lien : utile quand le lien est ouvert dans un autre navigateur ou appareil). */
export async function verifyLoginCode(formData: FormData) {
  const locale = localeSchema.catch("fr").parse(formData.get("locale"));
  const store = await cookies();
  const email = z.string().email().safeParse(store.get(LOGIN_EMAIL_COOKIE)?.value);
  const code = z.string().trim().regex(/^\d{4,10}$/).safeParse(formData.get("code"));
  if (!email.success) redirect(`/${locale}/login`); // cookie expiré : on repart du début
  if (!code.success) redirect(`/${locale}/login?sent=1&error=code`);
  // Anti-bruteforce du code : plafonds par IP et par adresse, en plus des limites de GoTrue.
  const ip = clientIp(await headers());
  if (!rateLimit(`code-ip:${ip}`, 15, 600_000).ok || !rateLimit(`code-mail:${email.data.toLowerCase()}`, 6, 600_000).ok) redirect(`/${locale}/login?sent=1&error=rate`);
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.data, token: code.data, type: "email" });
  if (error) redirect(`/${locale}/login?sent=1&error=code`);
  store.delete(LOGIN_EMAIL_COOKIE);
  redirect(safeNext(formData.get("next"), `/${locale}`));
}
