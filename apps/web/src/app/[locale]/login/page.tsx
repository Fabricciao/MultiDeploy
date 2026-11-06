import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/logo";
import { supabaseEnv } from "@/lib/supabase/env";
import { signInWithGoogle, signInWithMagicLink, verifyLoginCode } from "./actions";

/** Le quart de cercle du logo, seul écran de l'application où il compose librement. */
const Doors = () => (
  <svg viewBox="0 0 192 192" className="login-art" aria-hidden>
    <path fill="#0C3140" d="M0 0H64A64 64 0 0 1 0 64Z" /><path fill="#21748C" d="M128 0V64A64 64 0 0 1 64 0Z" /><path fill="#EE5F2A" d="M64 128V64A64 64 0 0 1 128 128Z" /><path fill="#0A2430" d="M128 64H192A64 64 0 0 1 128 128Z" /><path fill="#EFECE8" d="M0 192V128A64 64 0 0 1 64 192Z" />
  </svg>
);

export default async function LoginPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string; sent?: string; next?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("login");
  const configured = supabaseEnv() !== null;
  return (
    <main className="login">
      <div className="login-side">
        <Logo height={30} onDark />
        <Doors />
        <p className="t-display login-claim">{t("claim")}</p>
      </div>
      <div className="login-form">
        <div className="col" style={{ width: "100%", maxWidth: 360, gap: 14 }}>
          <div className="row"><span className="login-logo-m"><Logo height={24} /></span><span className="sp"><LocaleSwitcher /></span></div>
          <div><h1 className="t-page">{t("title")}</h1><p className="muted" style={{ marginBlockStart: 2 }}>{t("subtitle")}</p></div>

          {!configured && <p role="status" className="banner">{t("notConfigured")}</p>}
          {sp.error && <p role="alert" className="banner bad">{t(`errors.${["oauth", "email", "magic", "auth", "no_agency", "unknown_tenant", "rate", "code"].includes(sp.error) ? sp.error : "auth"}`)}</p>}
          {sp.sent && <p role="status" className="banner info">{t("sent")}</p>}

          <form action={signInWithMagicLink} className="col" style={{ gap: 10 }}>
            <input type="hidden" name="locale" value={locale} /><input type="hidden" name="next" value={sp.next ?? ""} />
            <div><label className="lbl" htmlFor="email">{t("email")}</label><input id="email" name="email" type="email" dir="ltr" autoComplete="email" required className="input" style={{ height: 44, textAlign: "start" }} /></div>
            <button disabled={!configured} className="btn pri lg block">{t("magic")}</button>
          </form>
          {sp.sent && (
            <form action={verifyLoginCode} className="col" style={{ gap: 10, borderBlockStart: "1px solid var(--border)", paddingBlockStart: 14 }}>
              <input type="hidden" name="locale" value={locale} /><input type="hidden" name="next" value={sp.next ?? ""} />
              <div><label className="lbl" htmlFor="code">{t("code")}</label><input id="code" name="code" type="text" inputMode="numeric" pattern="[0-9]*" minLength={4} maxLength={10} dir="ltr" autoComplete="one-time-code" required className="input tab" style={{ height: 44, textAlign: "center", letterSpacing: ".4em" }} /><p className="hint">{t("codeHint")}</p></div>
              <button className="btn lg block">{t("codeSubmit")}</button>
            </form>
          )}
          <div className="row note" style={{ gap: 12 }}><span className="grow" style={{ height: 1, background: "var(--border)" }} />{t("or")}<span className="grow" style={{ height: 1, background: "var(--border)" }} /></div>
          <form action={signInWithGoogle}>
            <input type="hidden" name="locale" value={locale} /><input type="hidden" name="next" value={sp.next ?? ""} />
            <button disabled={!configured} className="btn lg block">{t("google")}</button>
          </form>
          <p className="note">{t("inviteOnly")}</p>
        </div>
      </div>
    </main>
  );
}
