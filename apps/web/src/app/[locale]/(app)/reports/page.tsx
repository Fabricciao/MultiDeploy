import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCtx } from "@/lib/session";
import { getReports } from "@/lib/data/reports";
import { pickName } from "@/lib/data/types";
import { money, num } from "@/lib/format";
import { PageHeader } from "@/components/ui";

function Bars({ rows, fmt }: { rows: { label: string; n: number; sub?: string }[]; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return <div className="col" role="list">{rows.map((r, i) => (
    <div key={i} role="listitem" className="hbar" title={`${r.label} : ${fmt ? fmt(r.n) : r.n}`}><span className="trunc">{r.label}</span><div className="grow"><i style={{ width: `${(r.n / max) * 100}%` }} /></div><b className="tab">{fmt ? fmt(r.n) : r.n}</b>{r.sub && <span className="note tab hide-m">{r.sub}</span>}</div>))}</div>;
}

export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("reports"); const tp = await getTranslations("props");
  const r = await getReports(ctx);
  const ageLabels = [t("age.0"), t("age.1"), t("age.2"), t("age.3"), t("age.4")];
  return (
    <>
      <PageHeader title={t("title")} sub={t("sub")} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,360px),1fr))", gap: 12, alignItems: "start" }}>
        <section className="card"><h2>{t("funnel")}</h2><div className="card-b"><Bars rows={r.funnel.filter((s) => s.kind !== "lost").map((s) => ({ label: pickName(s.name, locale), n: s.n, sub: s.value ? money(locale, s.value) : undefined }))} /></div></section>
        <section className="card"><h2>{t("sources")}</h2><div className="card-b">{r.sources.length ? <Bars rows={r.sources.map((s) => ({ label: pickName(s.name, locale), n: s.n }))} /> : <p className="muted">{t("empty")}</p>}</div></section>
        <section className="card"><h2>{t("propsByStatus")}</h2><div className="card-b"><Bars rows={r.status.map((s) => ({ label: tp(`status.${s.status}`), n: s.n }))} /></div></section>
        <section className="card"><h2>{t("listingAge")}</h2><div className="card-b"><Bars rows={ageLabels.map((l, i) => ({ label: l, n: r.age.find((a) => a.b === i)?.n ?? 0 }))} /></div></section>
        <section className="card" style={{ gridColumn: "1 / -1" }}><h2>{t("agents")}</h2><div style={{ overflowX: "auto" }}><table className="tbl"><thead><tr><th>{t("agent")}</th><th>{t("activeProps")}</th><th>{t("clients")}</th><th>{t("openDeals")}</th><th>{t("visits30")}</th><th>{t("wonValue")}</th></tr></thead>
          <tbody>{r.agents.map((a) => <tr key={a.id}><td style={{ fontWeight: 500 }}>{a.full_name}</td><td className="tab">{a.props}</td><td className="tab">{a.contacts}</td><td className="tab">{a.open_deals}</td><td className="tab">{a.visits_30d}</td><td className="tab">{money(locale, a.won_value)}</td></tr>)}</tbody></table></div></section>
      </div>
      <p className="note" style={{ marginTop: 12 }}>{t("scope", { n: num(locale, r.agents.length, 0) })}</p>
    </>
  );
}
