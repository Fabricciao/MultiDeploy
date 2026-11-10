import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { loadMandateInfo, submitMandate } from "@/lib/data/mandates";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { SignaturePad } from "@/components/signature-pad";
import { MTEXT } from "@/lib/mandate/html";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
const ERR = ["rate", "invalid_name", "invalid_id", "invalid_address", "invalid_signature", "no_consent", "already_signed", "invalid_token"];

export default async function MandateSignPage({ params, searchParams }: { params: Promise<{ locale: "fr" | "he" | "en"; token: string }>; searchParams: Promise<{ done?: string; err?: string }> }) {
  const { locale, token } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("mandateSign");
  const ts = await getTranslations("sign");
  const info = await loadMandateInfo(decodeURIComponent(token), locale);
  async function submit(fd: FormData) {
    "use server";
    const ip = clientIp(await headers());
    if (!rateLimit(`mandate:${ip}`, 20, 600_000).ok) redirect(`/${locale}/mandate/${token}?err=rate`);
    const r = await submitMandate(decodeURIComponent(token), locale, { name: String(fd.get("name") ?? ""), idNumber: String(fd.get("id_number") ?? ""), address: String(fd.get("address") ?? ""),
      dataUrl: String(fd.get("signature") ?? ""), consent: fd.get("consent") === "on", ip });
    redirect(`/${locale}/mandate/${token}?${r.ok ? "done=1" : `err=${r.error}`}`);
  }
  const center = { maxWidth: 480, margin: "20vh auto", padding: 16, textAlign: "center" as const };
  if (!info) return <main style={center}><h1 style={{ fontSize: 20 }}>{ts("invalid")}</h1></main>;
  if (info.signed || sp.done) return <main style={center}><h1 style={{ fontSize: 20, fontWeight: 600 }}>{ts("thanks")}</h1><p className="muted">{t("thanksSub", { org: info.orgName })}</p></main>;
  const T = MTEXT[locale];
  const row = (k: string, v: string) => v ? <><dt className="note">{k}</dt><dd style={{ margin: 0 }}>{v}</dd></> : null;
  return (
    <main style={{ maxWidth: 620, margin: "0 auto", padding: "24px 16px 48px" }}>
      <h1 className="t-page" style={{ marginBottom: 2 }}>{T.title}</h1>
      <p className="muted" style={{ marginBottom: 16 }}>{info.orgName}</p>
      <dl className="card card-b" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 14px", margin: "0 0 16px" }}>
        {row(T.broker, info.broker)}{row(T.license, info.license)}{row(T.property, `${info.reference} — ${info.address}`)}{row(T.price, info.price)}
        {row(T.period, `${T.from} ${info.from} ${T.to} ${info.to}`)}{row(T.fee, T.feeVal(info.pct))}
      </dl>
      <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>{T.actionsTitle}</h2>
      <ul style={{ paddingInlineStart: 18, margin: "0 0 14px", listStyle: "disc" }}>{info.actions.map((a) => <li key={a} style={{ marginBottom: 4 }}>{T.actions[a]}</li>)}</ul>
      <ol style={{ paddingInlineStart: 18, margin: "0 0 18px", listStyle: "decimal" }}>{T.clauses.map((x) => <li key={x} style={{ marginBottom: 6 }}>{x}</li>)}</ol>
      {sp.err && <div role="alert" className="card card-b err" style={{ marginBottom: 12 }}>{t(`errors.${ERR.includes(sp.err) ? sp.err : "invalid_signature"}`)}</div>}
      <form action={submit} className="col" style={{ gap: 14 }}>
        <label className="col" style={{ gap: 4 }}><span className="lbl">{ts("fullName")}</span><input name="name" className="input" autoComplete="name" required minLength={2} maxLength={120} defaultValue={info.owner} /></label>
        <label className="col" style={{ gap: 4 }}><span className="lbl">{T.idNumber}</span><input name="id_number" className="input ltr" dir="ltr" inputMode="numeric" required minLength={5} maxLength={14} autoComplete="off" /></label>
        <label className="col" style={{ gap: 4 }}><span className="lbl">{T.address}</span><input name="address" className="input" autoComplete="street-address" required minLength={4} maxLength={200} /></label>
        <div><div className="lbl">{T.signature}</div><SignaturePad name="signature" /></div>
        <label className="row" style={{ gap: 8, alignItems: "flex-start" }}><input type="checkbox" className="ck" name="consent" required /><span className="note">{t("consent")}</span></label>
        <button className="btn pri" style={{ height: 42 }}>{t("submit")}</button>
        <p className="note">{t("privacy")}</p>
      </form>
    </main>
  );
}
