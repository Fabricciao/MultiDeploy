import { getTranslations, setRequestLocale } from "next-intl/server";
import { Columns3, Plus, Rows3 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCtx, db, seesAllProperties } from "@/lib/session";
import { getBoard } from "@/lib/data/deals";
import { contactName } from "@/lib/data/contacts";
import { cityName, listAgents } from "@/lib/data/geo";
import { pickName } from "@/lib/data/types";
import { dateShort, initials, money } from "@/lib/format";
import { Avatar, Badge, PageHeader } from "@/components/ui";
import { DealBoard } from "@/components/deal-board";
import { AutoSubmit } from "@/components/shell";
import { createDealFormAction } from "./actions";

const uuid = /^[0-9a-f-]{36}$/i;

export default async function DealsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ agent?: string; view?: string; new?: string; err?: string }> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("deals");
  const tc = await getTranslations("common");
  const { stages, deals: all } = await getBoard(ctx);
  const canWrite = ctx.caps.has("deals.write") && !ctx.impersonating;
  const agentFilter = sp.agent && uuid.test(sp.agent) ? sp.agent : null;
  const deals = agentFilter ? all.filter((d) => d.agent_id === agentFilter) : all;
  const list = sp.view === "list";
  const [agents, options] = await Promise.all([
    listAgents(ctx),
    canWrite ? db(ctx, async (tx) => ({
      contacts: (await tx`select id, first_name, last_name, first_name_he, last_name_he from public.contacts where deleted_at is null order by updated_at desc limit 300`) as unknown as Record<string, any>[],
      properties: (await tx`select p.id, p.reference, p.street, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en from public.properties p left join public.geo_places g on g.id = p.city_id
        where p.deleted_at is null and p.status in ('active','under_offer','draft') and (${seesAllProperties(ctx)} or p.agent_id = ${ctx.userId}) order by p.created_at desc limit 300`) as unknown as Record<string, any>[],
    })) : Promise.resolve(null),
  ]);
  const open = stages.filter((s) => s.kind === "open");
  const stageOf = (id: string) => stages.find((s) => s.id === id);
  const weighted = deals.reduce((a, d) => a + Number(d.value ?? 0) * ((stageOf(d.stage_id)?.probability ?? 0) / 100), 0);
  const won = deals.filter((d) => stageOf(d.stage_id)?.kind === "won");
  const city = (d: (typeof deals)[number]) => cityName({ name_fr: d.city_fr, name_he: d.city_he, name_en: d.city_en }, locale);
  const q = (o: { agent?: string | null; view?: string; new?: string }) => { const u = new URLSearchParams(); if (o.agent) u.set("agent", o.agent); if (o.view) u.set("view", o.view); if (o.new) u.set("new", o.new); const s = u.toString(); return s ? `/deals?${s}` : "/deals"; };
  const viewParam = list ? "list" : undefined;
  return (
    <>
      <PageHeader title={t("title")} sub={t("sub", { count: deals.filter((d) => open.some((s) => s.id === d.stage_id)).length, weighted: money(locale, weighted) })}>
        <div className="seg" role="group"><Link href={q({ agent: agentFilter })} className={list ? "" : "on"}><Columns3 size={14} aria-hidden />{t("viewBoard")}</Link><Link href={q({ agent: agentFilter, view: "list" })} className={list ? "on" : ""}><Rows3 size={14} aria-hidden />{t("viewList")}</Link></div>
        {canWrite && <Link href={q({ agent: agentFilter, view: viewParam, new: sp.new ? undefined : "1" })} className="btn pri" scroll={false}><Plus size={15} aria-hidden />{t("new")}</Link>}
      </PageHeader>
      {ctx.impersonating && <div role="status" className="card card-b note" style={{ marginBottom: 12 }}>{t("readOnly")}</div>}
      {sp.err === "deal" && <div role="alert" className="card card-b err" style={{ marginBottom: 12 }}>{t("createFailed")}</div>}

      {canWrite && options && sp.new && (
        <form action={createDealFormAction} className="card" style={{ marginBottom: 14 }}>
          <h2>{t("new")}</h2>
          <div className="card-b" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, alignItems: "end" }}>
            <input type="hidden" name="locale" value={locale} />
            <label><span className="lbl">{t("client")}</span><select name="contact" className="input" required defaultValue=""><option value="" disabled>{t("pickClient")}</option>{options.contacts.map((c) => <option key={c.id} value={c.id}>{contactName(c, locale)}</option>)}</select></label>
            <label><span className="lbl">{t("property")}</span><select name="property" className="input" defaultValue=""><option value="">{t("noProperty")}</option>{options.properties.map((p) => <option key={p.id} value={p.id}>{p.reference}{p.street ? ` · ${p.street}` : ""}{p.city_fr ? ` · ${cityName({ name_fr: p.city_fr, name_he: p.city_he, name_en: p.city_en }, locale)}` : ""}</option>)}</select></label>
            <label><span className="lbl">{t("value")}</span><input name="value" type="number" min="0" step="10000" className="input" placeholder={t("valueHint")} /></label>
            <label><span className="lbl">{t("stage")}</span><select name="stage" className="input" defaultValue={open[0]?.id}>{open.map((s) => <option key={s.id} value={s.id}>{pickName(s.name, locale)}</option>)}</select></label>
            <button className="btn pri">{tc("save")}</button>
          </div>
          {options.contacts.length === 0 && <p className="note card-b">{t("noClients")} <Link href="/clients/new">{tc("newClient")}</Link></p>}
        </form>
      )}

      {agents.length > 1 && (
        <form id="dfilters" method="get" className="row wrap" style={{ marginBottom: 10 }}>
          {list && <input type="hidden" name="view" value="list" />}
          <select name="agent" defaultValue={agentFilter ?? ""} className="input" style={{ width: 200, height: 34 }} aria-label={t("agent")}><option value="">{t("allAgents")}</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}</select>
          <button className="sr-only">{tc("apply")}</button>
        </form>
      )}
      <AutoSubmit formId="dfilters" />

      {all.length === 0 ? (
        <div className="card empty"><h3>{t("empty")}</h3><p className="muted">{t("emptyHint")}</p>{canWrite && <Link href={q({ new: "1" })} className="btn pri"><Plus size={15} aria-hidden />{t("new")}</Link>}</div>
      ) : list ? (
        <div className="card" style={{ overflowX: "auto" }}><table className="tbl">
          <thead><tr><th>{t("client")}</th><th>{t("property")}</th><th>{t("stage")}</th><th className="n">{t("value")}</th><th>{t("updated")}</th><th>{t("agent")}</th></tr></thead>
          <tbody>{deals.filter((d) => stageOf(d.stage_id)?.kind !== "lost").map((d) => { const st = stageOf(d.stage_id); return (
            <tr key={d.id}><td><Link href={`/clients/${d.contact_id}`} style={{ fontWeight: 500 }}>{contactName(d, locale)}</Link></td>
              <td>{d.property_id ? <Link href={`/properties/${d.property_id}`}><span className="ltr tab">{d.reference}</span> · {city(d)}</Link> : <span className="note">{t("noProperty")}</span>}</td>
              <td><Badge tone={st?.kind === "won" ? "ok" : "acc"}>{st ? pickName(st.name, locale) : "—"}</Badge></td>
              <td className="n price tab">{d.value ? money(locale, d.value, d.currency) : "—"}</td>
              <td className="note">{dateShort(locale, d.updated_at)}</td>
              <td>{d.agent_name ? <Avatar text={initials(d.agent_name)} cls="sm" /> : "—"}</td></tr>); })}</tbody></table></div>
      ) : (
        <DealBoard canMove={canWrite}
          stages={stages.filter((s) => s.kind !== "lost").map((s) => ({ id: s.id, name: pickName(s.name, locale), kind: s.kind, probability: s.probability }))}
          deals={deals.filter((d) => stageOf(d.stage_id)?.kind !== "lost").map((d) => ({
            id: d.id, stageId: d.stage_id, contactId: d.contact_id, client: contactName(d, locale), value: d.value ? Number(d.value) : null, agent: initials(d.agent_name ?? ""),
            sub: d.reference ? `${d.reference} · ${city(d)}` : t("noProperty"),
            stale: stageOf(d.stage_id)?.kind === "open" && Date.now() - new Date(d.updated_at).getTime() > 7 * 86_400_000,
          }))} />
      )}
      {won.length > 0 && <p className="note" style={{ marginTop: 12 }}>{t("wonLine", { count: won.length, value: money(locale, won.reduce((a, d) => a + Number(d.value ?? 0), 0)) })}</p>}
    </>
  );
}
