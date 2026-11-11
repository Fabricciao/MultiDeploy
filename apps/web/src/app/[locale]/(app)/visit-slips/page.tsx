import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarPlus, FileSignature, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCtx } from "@/lib/session";
import { listSlips, siteBase, slipInfo } from "@/lib/data/slips";
import { contactName } from "@/lib/data/contacts";
import { cityName } from "@/lib/data/geo";
import { PageHeader } from "@/components/ui";
import { SlipActions } from "@/components/slip-actions";

const PAGE = 50;
export default async function VisitSlipsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ state?: string; q?: string; page?: string }> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("slips");
  const state = sp.state === "signed" || sp.state === "all" ? sp.state : "pending"; // ce qui reste à faire d'abord
  const q = sp.q?.trim().slice(0, 80) || undefined, page = Math.max(1, Number(sp.page) || 1);
  const { rows, total, counts } = await listSlips(ctx, { state, q, limit: PAGE, page });
  const base = await siteBase();
  const fmt = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jerusalem" });
  const qs = (o: Record<string, string | undefined>) => { const u = new URLSearchParams(Object.entries({ state, q, ...o }).filter(([, v]) => v) as [string, string][]); return `/visit-slips${u.size ? `?${u}` : ""}`; };
  const tab = (k: "signed" | "pending" | "all", n?: number) => <Link href={qs({ state: k, page: undefined }) as "/"} className={`chip ${state === k ? "on" : ""}`} aria-current={state === k ? "page" : undefined}>{t(`tabs.${k}`)}{n !== undefined && <span className="cnt-b">{n}</span>}</Link>;
  return (
    <>
      <PageHeader title={t("title")} sub={t("sub", { signed: counts.signed, pending: counts.pending })}>
        {ctx.caps.has("properties.write") && !ctx.impersonating && <Link href="/agenda?new=1" className="btn pri"><CalendarPlus size={15} aria-hidden />{t("plan")}</Link>}
      </PageHeader>
      <div className="row wrap" style={{ gap: 8, marginBlockEnd: 12 }}>
        {tab("pending", counts.pending)}{tab("signed", counts.signed)}{tab("all")}
        <span className="sp" />
        <form className="row" style={{ gap: 6 }} action={`/${locale}/visit-slips`}><input type="hidden" name="state" value={state} />
          <input name="q" defaultValue={q} className="input" placeholder={t("search")} aria-label={t("search")} style={{ width: 220 }} /><button className="btn icon" aria-label={t("search")}><Search size={15} aria-hidden /></button></form>
      </div>
      <section className="card">
        {rows.length === 0 ? <div className="card-b col" style={{ gap: 6, alignItems: "center", padding: 32 }}><FileSignature size={22} aria-hidden /><p className="muted">{t(state === "pending" ? "emptyPending" : "empty")}</p><ol className="note col" style={{ gap: 2, textAlign: "start" }}><li>{t("steps.plan")}</li><li>{t("steps.send")}</li><li>{t("steps.sign")}</li></ol></div> : (
          <div style={{ overflowX: "auto" }}><table className="tbl">
            <thead><tr><th>{t("col.visit")}</th><th>{t("col.property")}</th><th>{t("col.client")}</th><th>{t("col.agent")}</th><th>{t("col.slip")}</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td className="nowrap tab">{fmt.format(new Date(r.starts_at))}</td>
                <td><Link href={`/properties/${r.property_id}`} style={{ fontWeight: 500 }}>{r.title ?? r.street ?? r.reference}</Link><div className="note">{[r.street, cityName({ name_fr: r.city_fr, name_he: r.city_he, name_en: r.city_en }, locale)].filter(Boolean).join(", ")}</div></td>
                <td>{r.contact_id ? <Link href={`/clients/${r.contact_id}`}>{contactName(r, locale)}</Link> : "—"}{r.signer_name && <div className="note">{t("signer", { name: r.signer_name })}</div>}</td>
                <td className="note">{r.agent_name ?? "—"}</td>
                <td><SlipActions s={slipInfo(ctx, r, base)} sm /></td>
              </tr>))}</tbody>
          </table></div>)}
      </section>
      <p className="note" style={{ marginBlockStart: 10 }}>{t("langHint")}</p>
      {total > PAGE && <div className="row" style={{ gap: 8, marginBlockStart: 12, justifyContent: "center" }}>
        {page > 1 && <Link href={qs({ page: String(page - 1) }) as "/"} className="btn sm">{t("prev")}</Link>}
        <span className="note">{page} / {Math.ceil(total / PAGE)}</span>
        {page * PAGE < total && <Link href={qs({ page: String(page + 1) }) as "/"} className="btn sm">{t("next")}</Link>}</div>}
    </>
  );
}
