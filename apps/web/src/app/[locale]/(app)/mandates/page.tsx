import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlarmClock, CircleCheck, FileCheck2, Plus, ScrollText } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCtx, seesAllProperties } from "@/lib/session";
import { listAllMandates, mandateLinks, mandateOverview, type PropRef } from "@/lib/data/mandates";
import { siteBase } from "@/lib/data/slips";
import { cityName } from "@/lib/data/geo";
import { dateShort, num } from "@/lib/format";
import { Badge, PageHeader } from "@/components/ui";
import { MandateSend } from "@/components/mandate-panel";

const PAGE = 50;
/** Tous les mandats d'exclusivité de l'agence : à faire signer, signés, et ce qu'il reste à faire (biens sans mandat, exclusivités qui expirent). */
export default async function MandatesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ state?: string; page?: string; new?: string }> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("mandates");
  const all = seesAllProperties(ctx);
  const state = sp.state === "signed" || sp.state === "all" ? sp.state : "pending";
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ rows, total, counts }, over, base] = await Promise.all([listAllMandates(ctx, state, all, page, PAGE), mandateOverview(ctx, all), siteBase()]);
  const canWrite = ctx.caps.has("properties.write") && !ctx.impersonating;
  const place = (r: PropRef | (typeof rows)[number]) => [r.street, cityName({ name_fr: r.city_fr, name_he: r.city_he, name_en: r.city_en }, locale)].filter(Boolean).join(", ") || r.reference;
  const qs = (o: Record<string, string | undefined>) => { const u = new URLSearchParams(Object.entries({ state: state === "pending" ? undefined : state, ...o }).filter(([, v]) => v) as [string, string][]); return `/mandates${u.size ? `?${u}` : ""}`; };
  const tab = (k: "pending" | "signed" | "all", n?: number) => <Link href={qs({ state: k === "pending" ? undefined : k, page: undefined }) as "/"} className={`chip ${state === k ? "on" : ""}`} aria-current={state === k ? "page" : undefined}>{t(`tabs.${k}`)}{n !== undefined && <span className="cnt-b">{n}</span>}</Link>;
  const mandateHref = (id: string) => `/properties/${id}?tab=owner#mandate`;
  return (
    <>
      <PageHeader title={t("title")} sub={t("sub", { signed: counts.signed, pending: counts.pending })}>
        {canWrite && (
          <details className="pop" open={sp.new === "1"}>
            <summary className="btn pri"><Plus size={15} aria-hidden />{t("new")}</summary>
            <div className="pop-body" style={{ insetInlineStart: "auto", insetInlineEnd: 0, width: 320, padding: 6, maxHeight: 360, overflow: "auto" }}>
              <div className="over" style={{ padding: "8px 10px 6px" }}>{t("pick")}</div>
              {over.todo.length === 0 ? <p className="note" style={{ padding: "4px 10px 10px" }}>{t("pickNone")}</p> : over.todo.map((p) => (
                <Link key={p.id} href={mandateHref(p.id) as "/"} className="mi" style={{ height: "auto", paddingBlock: 7 }}><div style={{ minWidth: 0 }}><div className="trunc" style={{ fontWeight: 500 }}>{place(p)}</div><div className="note ltr tab">{p.reference}</div></div></Link>))}
            </div>
          </details>
        )}
      </PageHeader>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 16, alignItems: "start" }} className="split">
        <div className="col" style={{ gap: 12, minWidth: 0 }}>
          <div className="row wrap" style={{ gap: 8 }}>{tab("pending", counts.pending)}{tab("signed", counts.signed)}{tab("all")}</div>
          <section className="card">
            {rows.length === 0 ? <div className="card-b col" style={{ gap: 6, alignItems: "center", padding: 32, textAlign: "center" }}><ScrollText size={22} aria-hidden /><p className="muted">{t(state === "signed" ? "emptySigned" : "emptyPending")}</p><p className="note" style={{ maxWidth: 460 }}>{t("how")}</p></div> : (
              <div style={{ overflowX: "auto" }}><table className="tbl">
                <thead><tr><th>{t("col.property")}</th><th>{t("col.owner")}</th><th>{t("col.period")}</th><th className="n">{t("col.fee")}</th><th>{t("col.agent")}</th><th>{t("col.state")}</th></tr></thead>
                <tbody>{rows.map((m) => (
                  <tr key={m.id}>
                    <td><Link href={mandateHref(m.property_id) as "/"} style={{ fontWeight: 500 }}>{place(m)}</Link><div className="note ltr tab">{m.reference}</div></td>
                    <td>{m.contact_id ? <Link href={`/clients/${m.contact_id}`}>{m.owner_name}</Link> : m.owner_name}</td>
                    <td className="nowrap tab">{dateShort(locale, m.starts_on)} → {dateShort(locale, m.ends_on)}</td>
                    <td className="n">{num(locale, m.commission_pct, 2)} %</td>
                    <td className="note">{m.agent_name ?? "—"}</td>
                    <td>{m.status === "signed"
                      ? <div className="row wrap" style={{ gap: 6 }}><Badge tone="ok"><CircleCheck size={12} aria-hidden />{t("signedOn", { date: dateShort(locale, m.signed_at) })}</Badge>{m.document_path && <a className="btn sm" href={`/api/files/${m.document_path}`} target="_blank" rel="noreferrer"><FileCheck2 size={14} aria-hidden />{t("pdf")}</a>}</div>
                      : <div className="row wrap" style={{ gap: 6 }}><Badge tone="warn">{t("pending")}</Badge><MandateSend id={m.id} links={mandateLinks(ctx, m, base)} lang={m.preferred_locale} /></div>}</td>
                  </tr>))}</tbody>
              </table></div>)}
          </section>
          {total > PAGE && <div className="row" style={{ gap: 8, justifyContent: "center" }}>
            {page > 1 && <Link href={qs({ page: String(page - 1) }) as "/"} className="btn sm">‹</Link>}
            <span className="note tab">{page} / {Math.ceil(total / PAGE)}</span>
            {page * PAGE < total && <Link href={qs({ page: String(page + 1) }) as "/"} className="btn sm">›</Link>}</div>}
        </div>
        <div className="col" style={{ gap: 16 }}>
          <section className="card"><h2><AlarmClock size={15} aria-hidden />{t("expiring.title")}{over.expiring.length > 0 && <span className="cnt-b sp">{over.expiring.length}</span>}</h2>
            {over.expiring.length === 0 ? <p className="note card-b">{t("expiring.none")}</p> : over.expiring.map((p) => (
              <Link key={p.id} href={mandateHref(p.id) as "/"} className="li"><div className="grow" style={{ minWidth: 0 }}><b className="trunc">{place(p)}</b><small className="ltr tab">{p.reference}</small></div>
                {Number(p.days) < 0 ? <Badge tone="bad">{t("expired")}</Badge> : <Badge tone="warn">{t("expires", { days: Number(p.days) })}</Badge>}</Link>))}
          </section>
          <section className="card"><h2><ScrollText size={15} aria-hidden />{t("todo.title")}{over.todo.length > 0 && <span className="cnt-b sp">{over.todo.length}</span>}</h2>
            {over.todo.length === 0 ? <p className="note card-b">{t("pickNone")}</p> : <>
              {over.todo.slice(0, 8).map((p) => (
                <div key={p.id} className="li"><div className="grow" style={{ minWidth: 0 }}><Link href={`/properties/${p.id}`} style={{ fontWeight: 500 }} className="trunc">{place(p)}</Link><small className="ltr tab">{p.reference}</small></div>
                  {canWrite && <Link href={mandateHref(p.id) as "/"} className="btn sm">{t("todo.cta")}</Link>}</div>))}
              <p className="note card-b" style={{ paddingBlock: 10 }}>{t("todo.sub")}</p></>}
          </section>
        </div>
      </div>
    </>
  );
}
