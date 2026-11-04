import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { unsubscribeByToken } from "@/lib/data/shares";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Deux temps : le GET n'affiche qu'un bouton (les scanners d'e-mails préchargent les liens), le POST désinscrit. */
export default async function UnsubscribePage({ params, searchParams }: { params: Promise<{ locale: string; token: string }>; searchParams: Promise<{ done?: string }> }) {
  const { locale, token } = await params;
  const { done } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("public");
  async function confirm() {
    "use server";
    const ok = await unsubscribeByToken(token);
    redirect(`/${locale}/unsubscribe/${token}?done=${ok ? "1" : "0"}`);
  }
  return (
    <main style={{ maxWidth: 480, margin: "20vh auto", padding: 16, textAlign: "center" }}>
      {done === undefined ? (
        <form action={confirm} className="col" style={{ gap: 14, alignItems: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>{t("unsubscribeTitle")}</h1>
          <button className="btn pri">{t("unsubscribeConfirm")}</button>
        </form>
      ) : (
        <>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{done === "1" ? t("unsubscribed") : t("unsubscribeInvalid")}</h1>
          <p className="muted">{done === "1" ? t("unsubscribedSub") : ""}</p>
        </>
      )}
    </main>
  );
}
