import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, Download, TriangleAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCtx } from "@/lib/session";
import { getReports, PERIODS } from "@/lib/data/reports";
import { listAgents } from "@/lib/data/geo";
import { pickName } from "@/lib/data/types";
import { money, num } from "@/lib/format";
import { Badge, PageHeader } from "@/components/ui";
import { AutoSubmit } from "@/components/shell";

function Bars({ rows, fmt }: { rows: { label: string; n: number; sub?: string }[]; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return <div className="col" role="list">{rows.map((r, i) => (
    <div key={i} role="listitem" className="hbar" title={`${r.label} : ${fmt ? fmt(r.n) : r.n}`}><span className="trunc">{r.label}</span><div className="grow"><i style={{ width: `${(r.n / max) * 100}%` }} /></div><b className="tab">{fmt ? fmt(r.n) : r.n}</b>{r.sub && <span className="note tab hide-m">{r.sub}</span>}</div>))}</div>;
}

export default async function ReportsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ d?: string; agent?: string }> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("reports"); const tp = await getTranslations("props");
  const days = Number(sp.d) || 90;
  const agentParam = sp.agent && /^[0-9a-f-]{36}$/i.test(sp.agent) ? sp.agent : null;
  const r = await getReports(ctx, { days, agent: agentParam });
  const agents = r.all ? await listAgents(ctx) : [];
  const ageLabels = [t("age.0"), t("age.1"), t("age.2"), t("age.3"), t("age.4")];
  const q = (o: { d?: number; agent?: string | null }) => { const u = new URLSearchParams(); if (o.d && o.d !== 90) u.set("d", String(o.d)); if (o.agent) u.set("agent", o.agent); const s = u.toString(); return s ? `/reports?${s}` : "/reports"; };
  const rate = r.kpi.closed ? Math.round((r.kpi.won / r.kpi.closed) * 100) : null;
  const tile = (k: string, v: React.ReactNode, sub?: React.ReactNode) => <div className="card kpi"><div className="k">{k}</div><div className="v">{v}</div>{sub && <div className="note">{sub}</div>}</div>;
  const scopeLabel = !r.all ? t("scopeMe") : r.agent ? agents.find((a) => a.id === r.agent)?.full_name ?? "" : t("scopeAgency");
  return (
    <>
      <PageHeader title={t("title")} sub={`${scopeLabel} · ${t("period", { days: r.days })}`}>
        <div className="seg" role="group" aria-label={t("periodLabel")}>{PERIODS.map((p) => <Link key={p} href={q({ d: p, agent: agentParam })} className={r.days === p ? "on" : ""}>{t(`periods.${p}`)}</Link>)}</div>
        {ctx.caps.has("exports.run") && <a href="/api/export" className="btn hide-m"><Download size={14} aria-hidden />{t("export")}</a>}
      </PageHeader>
      {r.all && agents.length > 1 && (
        <form id="rfilters" method="get" className="row wrap" style={{ marginBottom: 12 }}>
          {r.days !== 90 && <input type="hidden" name="d" value={r.days} />}
          <select name="agent" defaultValue={agentParam ?? ""} className="input" style={{ width: 220, height: 34 }} aria-label={t("agent")}><option value="">{t("allAgents")}</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}</select>
          <button className="sr-only">OK</button>
        </form>
      )}
      <AutoSubmit formId="rfilters" />
      <div className="kpis" style={{ marginBottom: 12 }}>
        {tile(t("kpi.commissions"), money(locale, r.kpi.commissions), t("kpi.commissionsSub", { n: r.kpi.won }))}
        {tile(t("kpi.leadToVisit"), r.kpi.lead_to_visit === null ? "—" : `${num(locale, r.kpi.lead_to_visit, 1)} ${t("daysShort")}`)}
        {tile(t("kpi.closeRate"), rate === null ? "—" : `${rate} %`, r.kpi.closed ? t("kpi.closeRateSub", { won: r.kpi.won, closed: r.kpi.closed }) : undefined)}
        {tile(t("kpi.avgAge"), r.kpi.avg_age === null ? "—" : `${num(locale, r.kpi.avg_age, 0)} ${t("daysShort")}`)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,360px),1fr))", gap: 12, alignItems: "start" }}>
        <section className="card"><h2>{t("funnel")}</h2><div className="card-b"><Bars rows={r.funnel.filter((s) => s.kind !== "lost").map((s) => ({ label: pickName(s.name, locale), n: s.n, sub: s.value ? money(locale, s.value) : undefined }))} /></div></section>
        <section className="card"><h2>{t("sourcesP", { days: r.days })}</h2><div className="card-b">{r.sources.length ? <Bars rows={r.sources.map((s) => ({ label: pickName(s.name, locale), n: s.n }))} /> : <p className="muted">{t("empty")}</p>}</div></section>
        {r.all && !r.agent && <section className="card"><h2>{t("wonByAgent")}</h2><div className="card-b">{r.agents.some((a) => a.won_n) ? <Bars rows={r.agents.filter((a) => a.won_n).map((a) => ({ label: a.full_name ?? "—", n: a.won_n, sub: money(locale, a.won_value) }))} /> : <p className="muted">{t("empty")}</p>}</div></section>}
        <section className="card"><h2><TriangleAlert size={15} aria-hidden />{t("mandates")}</h2>{r.mandates.length === 0 ? <p className="muted card-b">{t("noMandates")}</p> : r.mandates.map((m) => (
          <Link key={m.id} href={`/properties/${m.id}`} className="li"><div className="grow"><b className="trunc">{m.title ?? m.street ?? m.reference}</b><small>{m.agent_name ?? ""}</small></div><Badge tone="warn"><Clock size={11} aria-hidden />{tp("mandate.expiresIn", { days: Number(m.days) })}</Badge></Link>))}</section>
        <section className="card"><h2>{t("propsByStatus")}</h2><div className="card-b"><Bars rows={r.status.map((s) => ({ label: tp(`status.${s.status}`), n: s.n }))} /></div></section>
        <section className="card"><h2>{t("listingAge")}</h2><div className="card-b"><Bars rows={ageLabels.map((l, i) => ({ label: l, n: r.age.find((a) => a.b === i)?.n ?? 0 }))} /></div></section>
        <section className="card" style={{ gridColumn: "1 / -1" }}><h2>{r.all ? t("agents") : t("myStats")}</h2><div style={{ overflowX: "auto" }}><table className="tbl"><thead><tr><th>{t("agent")}</th><th>{t("activeProps")}</th><th>{t("clients")}</th><th>{t("openDeals")}</th><th>{t("visitsP")}</th><th>{t("wonN")}</th><th>{t("wonValue")}</th></tr></thead>
          <tbody>{r.agents.map((a) => <tr key={a.id}><td style={{ fontWeight: 500 }}>{r.all ? <Link href={q({ d: r.days, agent: a.id })}>{a.full_name}</Link> : a.full_name}</td><td className="tab">{a.props}</td><td className="tab">{a.contacts}</td><td className="tab">{a.open_deals}</td><td className="tab">{a.visits}</td><td className="tab">{a.won_n}</td><td className="tab">{money(locale, a.won_value)}</td></tr>)}</tbody></table></div></section>
      </div>
      <p className="note" style={{ marginTop: 12 }}>{r.all ? t("scope", { n: num(locale, r.agents.length, 0) }) : t("scopeAgent")}</p>
    </>
  );
}
