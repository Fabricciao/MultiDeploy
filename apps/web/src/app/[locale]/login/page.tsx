import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { supabaseEnv } from "@/lib/supabase/env";
import { signInWithGoogle, signInWithMagicLink } from "./actions";

export default async function LoginPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string; sent?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("login");
  const configured = supabaseEnv() !== null;
  const field = "h-9 w-full rounded-ui border border-line-strong bg-surface px-3 text-[14px]";
  const btn = "h-9 w-full rounded-ui text-[13px] font-medium";
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-tight">{t("brand")}</span>
          <LocaleSwitcher />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mb-6 mt-1 text-muted">{t("subtitle")}</p>

        {!configured && <p role="status" className="mb-4 rounded-ui border border-line bg-sunken p-3 text-[13px]">{t("notConfigured")}</p>}
        {sp.error && <p role="alert" className="mb-4 text-[13px] text-danger">{t(`errors.${["oauth", "email", "magic", "auth"].includes(sp.error) ? sp.error : "auth"}`)}</p>}
        {sp.sent && <p role="status" className="mb-4 text-[13px] text-success">{t("sent")}</p>}

        <form action={signInWithGoogle}>
          <input type="hidden" name="locale" value={locale} />
          <button disabled={!configured} className={`${btn} border border-line-strong bg-surface hover:bg-sunken disabled:opacity-50`}>{t("google")}</button>
        </form>
        <div className="my-5 flex items-center gap-3 text-[12px] text-muted"><span className="h-px flex-1 bg-line" />{t("or")}<span className="h-px flex-1 bg-line" /></div>
        <form action={signInWithMagicLink} className="space-y-3">
          <input type="hidden" name="locale" value={locale} />
          <label className="block text-[13px] font-medium" htmlFor="email">{t("email")}</label>
          <input id="email" name="email" type="email" dir="ltr" autoComplete="email" required className={`${field} text-start`} />
          <button disabled={!configured} className={`${btn} bg-accent text-white hover:bg-accent-hover disabled:opacity-50`}>{t("magic")}</button>
        </form>
        <p className="mt-6 text-[12px] text-muted">{t("inviteOnly")}</p>
      </div>
    </main>
  );
}
