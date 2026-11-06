import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { acceptInvitation, previewInvitation } from "@/lib/data/team";
import { resolveUserId } from "@/lib/session";
import { LocaleSwitcher } from "@/components/locale-switcher";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function InvitePage({ params, searchParams }: { params: Promise<{ locale: string; token: string }>; searchParams: Promise<{ err?: string }> }) {
  const { locale, token } = await params; const { err } = await searchParams;
  setRequestLocale(locale);
  const inv = await previewInvitation(token);
  if (!inv) notFound();
  const userId = await resolveUserId();
  if (!userId) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/invite/${token}`)}`);
  const t = await getTranslations("team");
  const name = (locale === "he" ? inv.name_he : locale === "en" ? inv.name_en : inv.name_fr) ?? inv.name_fr;
  async function accept() {
    "use server";
    const uid = await resolveUserId();
    if (!uid) redirect(`/${locale}/login`);
    const r = await acceptInvitation(uid, token);
    redirect(r.orgId ? `/${locale}` : `/${locale}/invite/${token}?err=${r.error}`);
  }
  return (
    <main style={{ maxWidth: 460, margin: "16vh auto", padding: 16 }}>
      <div className="row" style={{ marginBottom: 20 }}><b>NadlanHub</b><span className="sp"><LocaleSwitcher /></span></div>
      <h1 style={{ fontSize: 22, fontWeight: 600 }}>{t("acceptTitle", { name })}</h1>
      <p className="muted" style={{ margin: "6px 0 16px" }}>{t("acceptSub", { email: inv.email })}</p>
      {err && <div role="alert" className="err" style={{ marginBottom: 12 }}>{t(`acceptErrors.${["wrong_account", "seat_limit"].includes(err) ? err : "invalid"}`)}</div>}
      <form action={accept}><button className="btn pri" style={{ height: 40 }}>{t("accept")}</button></form>
    </main>
  );
}
