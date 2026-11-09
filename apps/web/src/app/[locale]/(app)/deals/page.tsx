import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlarmClock, ArrowRight, Award, Columns3, ListChecks, MessageCircle, Phone, Plus, Rows3, User, House, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCtx, db, seesAllProperties } from "@/lib/session";
import { getBoard } from "@/lib/data/deals";
import { contactName } from "@/lib/data/contacts";
import { cityName, listAgents } from "@/lib/data/geo";
import { pickName } from "@/lib/data/types";
import { dateShort, initials, money } from "@/lib/format";
import { Avatar, Badge, PageHeader, StageBar } from "@/components/ui";
import { PeekKeys } from "@/components/shell";
import { DealBoard } from "@/components/deal-board";
import { AutoSubmit } from "@/components/shell";
import { createDealFormAction, moveDealFormAction } from "./actions";

const uuid = /^[0-9a-f-]{36}$/i;

export default async function DealsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ agent?: string; view?: string; new?: string; err?: string; deal?: string; stale?: string }> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("deals");
  const tc = await getTranslations("common");
  const { stages, deals: all } = await getBoard(ctx);
  const canWrite = ctx.caps.has("deals.write") && !ctx.impersonating;
  const agentFilter = sp.agent && uuid.test(sp.agent) ? sp.agent : null;
  const isStale = (d: (typeof all)[number]) => Date.now() - new Date(d.updated_at).getTime() > 7 * 86_400_000;
  const staleOnly = sp.stale === "1";
  const deals = all.filter((d) => (!agentFilter || d.agent_id === agentFilter) && (!staleOnly || isStale(d)));
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
  const q = (o: { agent?: string | null; view?: string; new?: string; stale?: string; deal?: string }) => { const u = new URLSearchParams(); if (o.agent) u.set("agent", o.agent); if (o.view) u.set("view", o.view); if (o.new) u.set("new", o.new); if (o.stale) u.set("stale", o.stale); if (o.deal) u.set("deal", o.deal); const s = u.toString(); return s ? `/deals?${s}` : "/deals"; };
  const baseQs = q({ agent: agentFilter, stale: staleOnly ? "1" : undefined }).replace("/deals", "");
  const cur = sp.deal && uuid.test(sp.deal) ? all.find((d) => d.id === sp.deal) ?? null : null;
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

      {all.length > 0 && !list && (() => {
        const openDeals = deals.filter((d) => stageOf(d.stage_id)?.kind === "open");
        const fee = (d: (typeof deals)[number]) => Number(d.value ?? 0) * (Number(d.commission_pct ?? 2) / 100);
        const expected = openDeals.reduce((a, d) => a + fee(d) * ((stageOf(d.stage_id)?.probability ?? 0) / 100), 0);
        const last = open.at(-1);
        const atPromise = openDeals.filter((d) => d.stage_id === last?.id).reduce((a, d) => a + fee(d), 0);
        const staleN = all.filter((d) => stageOf(d.stage_id)?.kind === "open" && isStale(d) && (!agentFilter || d.agent_id === agentFilter)).length;
        const sums = open.map((s) => openDeals.filter((d) => d.stage_id === s.id).reduce((a, d) => a + Number(d.value ?? 0), 0));
        return (
          <section className="card fcast" aria-label={t("v2.forecast")}>
            <div><div className="note">{t("v2.forecast")}</div><div className="t-price tab" style={{ fontSize: 24, lineHeight: "30px" }}>{money(locale, expected)}</div>{atPromise > 0 && <div className="note">{t("v2.atPromise", { v: money(locale, atPromise) })}</div>}</div>
            <div className="col" style={{ gap: 8 }}><StageBar label={t("v2.byStage")} parts={open.map((s, i) => ({ label: pickName(s.name, locale), value: sums[i]!, tip: `${pickName(s.name, locale)} · ${money(locale, sums[i])}` }))} />
              <div className="legend">{open.map((s, i) => <span key={s.id}><i style={{ background: `var(--stage-${Math.min(6, Math.max(1, Math.round(((i + 1) / open.length) * 6)))})` }} />{pickName(s.name, locale)}</span>)}</div></div>
            {staleN > 0 || staleOnly ? <Link href={q({ agent: agentFilter, stale: staleOnly ? undefined : "1" })} className={`btn ${staleOnly ? "pri" : ""}`}><AlarmClock size={14} aria-hidden />{staleOnly ? t("v2.showAll") : t("v2.toFollow", { n: staleN })}</Link> : <span />}
          </section>
        );
      })()}

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
        <DealBoard canMove={canWrite} current={cur?.id ?? null} query={baseQs.replace(/^\?/, "")}
          stages={stages.map((s) => ({ id: s.id, name: pickName(s.name, locale), kind: s.kind, probability: s.probability }))}
          deals={deals.filter((d) => stageOf(d.stage_id)?.kind === "open").map((d) => ({
            id: d.id, stageId: d.stage_id, contactId: d.contact_id, client: contactName(d, locale), value: d.value ? Number(d.value) : null, fee: d.value ? Number(d.value) * Number(d.commission_pct ?? 2) / 100 : null,
            agent: initials(d.agent_name ?? ""), agentName: d.agent_name ?? "", cover: d.cover_thumb,
            sub: d.street ? `${d.street}${city(d) ? ` · ${city(d)}` : ""}` : d.reference ? `${d.reference} · ${city(d)}` : t("noProperty"),
            stale: isStale(d), next: d.next_title, nextDue: d.next_due ? dateShort(locale, d.next_due) : null,
          }))} />
      )}
      {cur && (() => {
        const st = stageOf(cur.stage_id); const idx = open.findIndex((s) => s.id === cur.stage_id);
        const nextStage = idx >= 0 && idx < open.length - 1 ? open[idx + 1] : stages.find((s) => s.kind === "won");
        const lostStage = stages.find((s) => s.kind === "lost");
        const fee = Number(cur.value ?? 0) * Number(cur.commission_pct ?? 2) / 100;
        const days = Math.floor((Date.now() - new Date(cur.updated_at).getTime()) / 86_400_000);
        const ph = cur.phones?.[0]?.e164;
        const close = q({ agent: agentFilter, stale: staleOnly ? "1" : undefined });
        const stageForm = (stage: { id: string } | undefined, label: React.ReactNode, cls: string) => stage && canWrite ? <form action={moveDealFormAction}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="deal" value={cur.id} /><input type="hidden" name="stage" value={stage.id} /><input type="hidden" name="back" value={baseQs} /><button className={cls}>{label}</button></form> : null;
        return (
          <aside className="peek drawer" aria-label={t("v2.drawer")}>
            <div className="peek-bar"><Badge tone={st?.kind === "won" ? "ok" : st?.kind === "lost" ? "bad" : "acc"}>{st ? pickName(st.name, locale) : "—"}</Badge><span className="note">{t("v2.since", { days })}</span><span className="sp" />
              <Link href={close as "/"} scroll={false} className="iconbtn" aria-label={tc("close")}><X size={17} aria-hidden /></Link><PeekKeys closeHref={close} /></div>
            <div className="peek-b">
              <div className="row gap12"><Avatar text={initials(contactName(cur, locale))} cls="lg" /><div className="grow" style={{ minWidth: 0 }}><h2 className="t-h2 trunc">{contactName(cur, locale)}</h2><div className="note trunc">{cur.street ? `${cur.street} · ${city(cur)}` : t("noProperty")}</div></div></div>
              {st?.kind === "open" && <div className="stepper">{open.map((s, i) => <div key={s.id} className={i < idx ? "dn" : i === idx ? "dn cur" : ""}>{pickName(s.name, locale)}</div>)}</div>}
              <div className="kv" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div><div className="k">{t("value")}</div><div className="v tab">{money(locale, cur.value, cur.currency)}</div></div>
                <div><div className="k">{t("v2.fee", { pct: Number(cur.commission_pct ?? 2) })}</div><div className="v tab">{money(locale, fee)}</div></div>
                <div><div className="k">{t("v2.proba")}</div><div className="v tab">{st?.probability ?? 0} %</div></div>
                <div><div className="k">{t("agent")}</div><div className="v">{cur.agent_name ?? "—"}</div></div>
              </div>
              <div className={`banner ${days > 7 && st?.kind === "open" ? "" : "info"}`}>{days > 7 && st?.kind === "open" ? <AlarmClock size={15} aria-hidden /> : <ListChecks size={15} aria-hidden />}<span className="grow">{cur.next_title ? <><b style={{ fontWeight: 600 }}>{t("v2.nextStep")}</b> {cur.next_title}{cur.next_due ? ` · ${dateShort(locale, cur.next_due)}` : ""}</> : t("v2.noNext")}</span></div>
              <div className="row wrap">
                {nextStage && stageForm(nextStage, <>{nextStage.kind === "won" ? <Award size={14} aria-hidden /> : null}{t("v2.moveTo", { stage: pickName(nextStage.name, locale) })}<span className="flip"><ArrowRight size={14} aria-hidden /></span></>, "btn pri")}
                {st?.kind === "open" && stageForm(lostStage, <><X size={14} aria-hidden />{t("v2.markLost")}</>, "btn ghost")}
              </div>
              <div className="row wrap">
                {ph && <a className="btn" href={`tel:${ph}`}><Phone size={14} aria-hidden />{t("v2.call")}</a>}
                {ph && <a className="btn" href={`https://wa.me/${ph.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} aria-hidden />WhatsApp</a>}
                <Link className="btn" href={`/clients/${cur.contact_id}`}><User size={14} aria-hidden />{t("client")}</Link>
                {cur.property_id && <Link className="btn" href={`/properties/${cur.property_id}`}><House size={14} aria-hidden />{t("property")}</Link>}
              </div>
            </div>
          </aside>
        );
      })()}
      {won.length > 0 && <p className="note" style={{ marginTop: 12 }}>{t("wonLine", { count: won.length, value: money(locale, won.reduce((a, d) => a + Number(d.value ?? 0), 0)) })}</p>}
    </>
  );
}
