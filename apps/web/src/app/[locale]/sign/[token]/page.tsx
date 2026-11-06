import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { loadSignInfo, submitSignature } from "@/lib/data/signature";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { SignaturePad } from "@/components/signature-pad";
import { TEXT } from "@/lib/visit-sheet/html";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function SignPage({ params, searchParams }: { params: Promise<{ locale: "fr" | "he" | "en"; token: string }>; searchParams: Promise<{ done?: string; err?: string }> }) {
  const { locale, token } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("sign");
  const info = await loadSignInfo(decodeURIComponent(token), locale);
  async function submit(fd: FormData) {
    "use server";
    const ip = clientIp(await headers());
    if (!rateLimit(`sign:${ip}`, 20, 600_000).ok) redirect(`/${locale}/sign/${token}?err=rate`);
    const r = await submitSignature(decodeURIComponent(token), locale, { name: String(fd.get("name") ?? ""), dataUrl: String(fd.get("signature") ?? ""), consent: fd.get("consent") === "on", ip });
    redirect(`/${locale}/sign/${token}?${r.ok ? "done=1" : `err=${r.error}`}`);
  }
  if (!info) return <main style={{ maxWidth: 480, margin: "20vh auto", padding: 16, textAlign: "center" }}><h1 style={{ fontSize: 20 }}>{t("invalid")}</h1></main>;
  if (info.signed || sp.done) return <main style={{ maxWidth: 480, margin: "20vh auto", padding: 16, textAlign: "center" }}><h1 style={{ fontSize: 20, fontWeight: 600 }}>{t("thanks")}</h1><p className="muted">{t("thanksSub", { org: info.orgName })}</p></main>;
  const fmt = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Jerusalem" });
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px 48px" }}>
      <h1 className="t-page" style={{ marginBottom: 2 }}>{TEXT[locale].title}</h1>
      <p className="muted" style={{ marginBottom: 16 }}>{info.orgName}</p>
      <dl className="card card-b" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 14px", margin: "0 0 16px" }}>
        <dt className="note">{TEXT[locale].property}</dt><dd style={{ margin: 0 }}>{info.reference} — {info.address}</dd>
        <dt className="note">{TEXT[locale].date}</dt><dd style={{ margin: 0 }}>{fmt.format(info.startsAt)}</dd>
        <dt className="note">{TEXT[locale].agent}</dt><dd style={{ margin: 0 }}>{info.agent}</dd>
      </dl>
      <ul style={{ paddingInlineStart: 18, margin: "0 0 18px" }}>{TEXT[locale].declare.map((x) => <li key={x} style={{ marginBottom: 6 }}>{x}</li>)}</ul>
      {sp.err && <div role="alert" className="card card-b err" style={{ marginBottom: 12 }}>{t(`errors.${["rate", "invalid_name", "invalid_signature", "no_consent", "already_signed", "invalid_token"].includes(sp.err) ? sp.err : "invalid_signature"}`)}</div>}
      <form action={submit} className="col" style={{ gap: 14 }}>
        <label className="col" style={{ gap: 4 }}><span className="lbl">{t("fullName")}</span><input name="name" className="input" autoComplete="name" required minLength={2} maxLength={80} defaultValue={info.contactName} /></label>
        <div><div className="lbl">{TEXT[locale].signature}</div><SignaturePad name="signature" /></div>
        <label className="row" style={{ gap: 8, alignItems: "flex-start" }}><input type="checkbox" className="ck" name="consent" required /><span className="note">{t("consent")}</span></label>
        <button className="btn pri" style={{ height: 42 }}>{t("submit")}</button>
      </form>
    </main>
  );
}
