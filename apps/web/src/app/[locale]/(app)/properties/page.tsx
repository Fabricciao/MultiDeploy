import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, ChevronRight, Clock, LayoutGrid, Map as MapIcon, Plus, Rows3, SlidersHorizontal, X } from "lucide-react";
import { PropertyMap } from "@/components/property-map";
import { AskBar } from "@/components/ask-bar";
import { Link } from "@/i18n/navigation";
import { getCtx } from "@/lib/session";
import { listProperties } from "@/lib/data/properties";
import { listAgents, listCities, cityName } from "@/lib/data/geo";
import { MUST_HAVE, PAGE_SIZE, parsePropertyFilters, toQuery, type SP } from "@/lib/data/filters";
import { dateShort, initials, money, moneyCompact, num } from "@/lib/format";
import { Badge, Avatar, Cover, PageHeader, statusTone } from "@/components/ui";
import { AutoSubmit } from "@/components/shell";
import { StatusSelect } from "@/components/status-select";
import { PropertyPeek } from "@/components/peek";
import { SavedViews } from "@/components/saved-views";
import { BulkBar } from "@/components/bulk-bar";
import { listViews } from "@/lib/data/views";

export default async function PropertiesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SP> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const f = parsePropertyFilters(sp);
  const ctx = await getCtx(locale);
  const t = await getTranslations("props");
  const tc = await getTranslations("common");
  const [{ rows, total }, cities, agents, views] = await Promise.all([listProperties(ctx, f), listCities(ctx), listAgents(ctx), listViews(ctx, "properties")]);

  const view = sp.view === "grid" ? "grid" : sp.view === "map" ? "map" : undefined;
  const peekId = typeof sp.peek === "string" && /^[0-9a-f-]{36}$/i.test(sp.peek) ? sp.peek : null;
  const base = { view, page: f.page > 1 ? f.page : undefined, q: f.q, tx: f.transaction, status: f.status, city: f.cityIds, rmin: f.roomsMin, rmax: f.roomsMax, pmin: f.priceMin, pmax: f.priceMax, has: f.has, agent: f.agent, mandate: f.mandate, sort: f.sort === "recent" ? undefined : f.sort };
  const without = (...keys: (keyof typeof base)[]) => toQuery({ ...base, ...Object.fromEntries(keys.map((k) => [k, undefined])) });
  const chips: { label: string; href: string }[] = [];
  if (f.q) chips.push({ label: `“${f.q}”`, href: without("q") });
  if (f.transaction) chips.push({ label: t(`tx.${f.transaction}`), href: without("tx") });
  for (const s of f.status) chips.push({ label: t(`status.${s}`), href: toQuery({ ...base, status: f.status.filter((x) => x !== s) }) });
  for (const id of f.cityIds) chips.push({ label: cityName(cities.find((c) => c.id === id) ?? null, locale), href: toQuery({ ...base, city: f.cityIds.filter((x) => x !== id) }) });
  if (f.roomsMin !== undefined || f.roomsMax !== undefined) chips.push({ label: `${f.roomsMin ?? "…"}–${f.roomsMax ?? "…"} ${t("rooms")}`, href: without("rmin", "rmax") });
  if (f.priceMin !== undefined || f.priceMax !== undefined) chips.push({ label: `${f.priceMin !== undefined ? money(locale, f.priceMin) : "…"} – ${f.priceMax !== undefined ? money(locale, f.priceMax) : "…"}`, href: without("pmin", "pmax") });
  for (const k of f.has) chips.push({ label: t(`has.${k}`), href: toQuery({ ...base, has: f.has.filter((x) => x !== k) }) });
  if (f.agent) chips.push({ label: agents.find((a) => a.id === f.agent)?.full_name ?? "", href: without("agent") });
  if (f.mandate) chips.push({ label: ["own", "partner"].includes(f.mandate) ? t(`origin.${f.mandate}`) : f.mandate === "co_broke" ? t("origin.coBrokeTag") : t(`mandate.${f.mandate}`), href: without("mandate") });

  const canWrite = ctx.caps.has("properties.write") && !ctx.impersonating;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) => toQuery({ ...base, page: p === 1 ? undefined : p });
  const peekHref = (id: string) => `/properties${toQuery({ ...base, peek: id })}`;
  const peekIdx = peekId ? rows.findIndex((r) => r.id === peekId) : -1;
  const tag = (p: (typeof rows)[number]) => <Badge tone={statusTone(p.status)}><i className="dot" />{t(`status.${p.status}`)}</Badge>;
  const name = (p: (typeof rows)[number]) => p.title ?? `${t(`types.${p.property_type}`)} · ${p.street ?? ""}`;
  const city = (p: (typeof rows)[number]) => cityName({ name_fr: p.city_fr, name_he: p.city_he, name_en: p.city_en }, locale);

  return (
    <>
      <PageHeader title={t("title")} sub={t("count", { count: total })}>
        <Link href="/import?target=properties" className="btn">{t("import")}</Link>
        <Link href="/properties/new" className="btn pri"><Plus size={15} aria-hidden />{t("new")}</Link>
      </PageHeader>

      <SavedViews scope="properties" views={views} currentQs={toQuery({ ...base, page: undefined }).replace(/^\?/, "")} locale={locale} canShare={ctx.caps.has("org.manage")} />
      <AskBar view={view} />
      <form id="filters" method="get" className="row wrap" style={{ marginBottom: 10 }}>
        {view && <input type="hidden" name="view" value={view} />}
        <input name="q" type="search" defaultValue={f.q} placeholder={t("filters.q")} className="input" style={{ width: 220, height: 34 }} aria-label={t("filters.q")} />
        <select name="tx" defaultValue={f.transaction ?? ""} className="input" style={{ width: 130, height: 34 }} aria-label={t("filters.transaction")}>
          <option value="">{t("filters.allTx")}</option><option value="sale">{t("tx.sale")}</option><option value="rent">{t("tx.rent")}</option>
        </select>
        <details className="pop" open={f.cityIds.length > 0 ? undefined : undefined}>
          <summary className={`chip ${f.cityIds.length ? "on" : ""}`}>{t("filters.cities")}{f.cityIds.length ? ` · ${f.cityIds.length}` : ""}</summary>
          <div className="pop-body col" style={{ gap: 6, maxHeight: 280, overflow: "auto" }}>
            {cities.map((c) => (
              <label key={c.id} className="row" style={{ gap: 8 }}><input type="checkbox" className="ck" name="city" value={c.id} defaultChecked={f.cityIds.includes(c.id)} />{cityName(c, locale)}</label>
            ))}
          </div>
        </details>
        <details className="pop">
          <summary className={`chip ${f.roomsMin !== undefined || f.roomsMax !== undefined ? "on" : ""}`}>{t("rooms")}</summary>
          <div className="pop-body row" style={{ gap: 8 }}>
            <input name="rmin" type="number" step="0.5" min="1" defaultValue={f.roomsMin} placeholder={t("filters.min")} className="input" style={{ width: 90 }} />
            <input name="rmax" type="number" step="0.5" min="1" defaultValue={f.roomsMax} placeholder={t("filters.max")} className="input" style={{ width: 90 }} />
          </div>
        </details>
        <details className="pop">
          <summary className={`chip ${f.priceMin !== undefined || f.priceMax !== undefined ? "on" : ""}`}>{t("price")}</summary>
          <div className="pop-body row" style={{ gap: 8 }}>
            <input name="pmin" type="number" step="10000" min="0" defaultValue={f.priceMin} placeholder={t("filters.min")} className="input" style={{ width: 120 }} />
            <input name="pmax" type="number" step="10000" min="0" defaultValue={f.priceMax} placeholder={t("filters.max")} className="input" style={{ width: 120 }} />
          </div>
        </details>
        <details className="pop">
          <summary className={`chip ${f.has.length ? "on" : ""}`}>{t("filters.features")}{f.has.length ? ` · ${f.has.length}` : ""}</summary>
          <div className="pop-body col" style={{ gap: 6 }}>
            {MUST_HAVE.map((k) => <label key={k} className="row" style={{ gap: 8 }}><input type="checkbox" className="ck" name="has" value={k} defaultChecked={f.has.includes(k)} />{t(`has.${k}`)}</label>)}
          </div>
        </details>
        <details className="pop">
          <summary className={`chip ${f.status.length || f.agent || f.mandate ? "on" : ""}`}><SlidersHorizontal size={13} aria-hidden />{t("filters.more")}</summary>
          <div className="pop-body col" style={{ gap: 10, minWidth: 240 }}>
            <div><div className="lbl">{t("filters.statusLabel")}</div>{(["active", "under_offer", "draft", "sold"] as const).map((s) => <label key={s} className="row" style={{ gap: 8 }}><input type="checkbox" className="ck" name="status" value={s} defaultChecked={f.status.includes(s)} />{t(`status.${s}`)}</label>)}</div>
            <div><div className="lbl">{t("filters.agent")}</div><select name="agent" defaultValue={f.agent ?? ""} className="input"><option value="">{tc("all")}</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}</select></div>
            <div><div className="lbl">{t("filters.mandate")}</div><select name="mandate" defaultValue={f.mandate ?? ""} className="input"><option value="">{tc("all")}</option><option value="exclusive">{t("mandate.exclusive")}</option><option value="expiring">{t("mandate.expiring")}</option><option value="own">{t("origin.own")}</option><option value="partner">{t("origin.partner")}</option><option value="co_broke">{t("origin.coBrokeTag")}</option></select></div>
          </div>
        </details>
        <select name="sort" defaultValue={f.sort} className="input" style={{ width: 170, height: 34 }} aria-label={t("filters.sort")}>
          {(["recent", "price_asc", "price_desc", "mandate"] as const).map((s) => <option key={s} value={s}>{t(`sort.${s}`)}</option>)}
        </select>
        <button className="sr-only">{tc("apply")}</button>
        {chips.length > 0 && <Link href="/properties" className="btn ghost sm">{tc("reset")}</Link>}
        <div className="seg sp" role="group" aria-label={t("viewLabel")}>
          <Link href={`/properties${toQuery({ ...base, view: undefined })}`} className={view ? "" : "on"} title={t("viewTable")}><Rows3 size={14} aria-hidden /><span className="hide-m">{t("viewShort.table")}</span></Link>
          <Link href={`/properties${toQuery({ ...base, view: "grid" })}`} className={view === "grid" ? "on" : ""} title={t("viewGrid")}><LayoutGrid size={14} aria-hidden /><span className="hide-m">{t("viewShort.grid")}</span></Link>
          <Link href={`/properties${toQuery({ ...base, view: "map" })}`} className={view === "map" ? "on" : ""} title={t("map.view")}><MapIcon size={14} aria-hidden /><span className="hide-m">{t("viewShort.map")}</span></Link>
        </div>
      </form>
      <AutoSubmit formId="filters" />

      {chips.length > 0 && (
        <div className="row wrap" style={{ marginBottom: 12 }}>
          {chips.map((c, i) => <Link key={i} href={`/properties${c.href}`} className="chip on">{c.label}<X size={12} aria-hidden /></Link>)}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card empty"><h3>{t("empty")}</h3>{chips.length > 0 && <Link href="/properties" className="btn">{tc("reset")}</Link>}</div>
      ) : view === "map" ? (
        <div className="split2">
          <div className="card plist">{rows.map((p) => (
            <Link key={p.id} href={peekHref(p.id)} scroll={false} data-pid={p.id} className={`prow ${p.id === peekId ? "hot" : ""}`}>
              <span className="thumb"><Cover path={p.cover_thumb} /></span>
              <div style={{ minWidth: 0 }}><b className="trunc">{name(p)}</b><span className="note trunc" style={{ display: "block" }}>{city(p)} · {num(locale, p.rooms)} {t("rooms").toLowerCase()} · {num(locale, p.area_built, 0)} {t("sqm")}</span><div className="row" style={{ marginBlockStart: 6 }}>{tag(p)}</div></div>
              <div className="pr"><b>{money(locale, p.price, p.currency)}</b>{p.price && p.area_built ? <small className="note tab" style={{ display: "block" }}>{money(locale, Number(p.price) / Number(p.area_built))} / {t("sqm")}</small> : null}</div>
            </Link>))}</div>
          <PropertyMap points={rows.filter((p) => p.lat !== null && p.lng !== null).map((p) => ({ id: p.id, lat: Number(p.lat), lng: Number(p.lng), approx: !!p.approx, href: peekHref(p.id), title: `${name(p)} · ${money(locale, p.price, p.currency)}`,
            label: p.price ? moneyCompact(locale, p.price, p.currency) : "—" }))} />
        </div>
      ) : view === "grid" ? (
        <div className="pgrid">
          {rows.map((p) => (
            <Link key={p.id} href={peekHref(p.id)} scroll={false} className="pcard">
              <div className="photo"><Cover path={p.cover_thumb} /><span className="tag">{tag(p)}</span></div>
              <div className="b"><div className="price" style={{ fontSize: 16 }}>{money(locale, p.price, p.currency)}{p.transaction.includes("rent") ? <span className="note"> {t("perMonth")}</span> : null}</div><div className="trunc" style={{ fontWeight: 500, marginBlockStart: 2 }}>{name(p)}</div><div className="note">{city(p)}</div>
                <div className="spec" style={{ marginBlockStart: 8 }}><span>{num(locale, p.rooms)} {t("rooms").toLowerCase()}</span><span>{num(locale, p.area_built, 0)} {t("sqm")}</span></div></div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="tbl props">
              <thead><tr>
                <th style={{ width: 36 }}></th><th>{t("property")}</th><th>{t("city")}</th><th className="n">{t("rooms")}</th><th className="n">{t("area")}</th><th className="n">{t("floor")}</th><th className="n">{t("price")}</th><th>{t("statusLabel")}</th><th>{t("mandateLabel")}</th><th>{t("agent")}</th>
              </tr></thead>
              <tbody>
                {rows.map((p) => {
                  const days = p.mandate?.type === "exclusive" && p.mandate.end ? Math.round((new Date(p.mandate.end).getTime() - Date.now()) / 86_400_000) : null;
                  return (
                    <tr key={p.id} data-row className={p.id === peekId ? "peek" : ""}>
                      <td><input type="checkbox" className="ck" name="p" value={p.id} form="bulk" aria-label={p.reference} /></td>
                      <td>
                        <div className="row gap12">
                          <Link href={peekHref(p.id)} scroll={false} data-peek className="thumb" aria-label={name(p)}><Cover path={p.cover_thumb} /></Link>
                          <div className="cell-t"><Link href={peekHref(p.id)} scroll={false} style={{ fontWeight: 500, display: "block", lineHeight: "18px" }}>{name(p)}</Link><Link href={`/properties/${p.id}`} data-open className="note"><span className="ltr tab">{p.reference}</span></Link></div>
                        </div>
                      </td>
                      <td>{city(p)}<div className="note">{p.street} {p.address_visibility === "exact" ? p.house_number : ""}</div></td>
                      <td className="n">{num(locale, p.rooms)}</td>
                      <td className="n">{num(locale, p.area_built, 0)} {t("sqm")}</td>
                      <td className="n"><span className="ltr">{p.floor === 0 ? t("ground") : p.floor ?? "–"}{p.floors_total ? `/${p.floors_total}` : ""}</span></td>
                      <td className="n price">{money(locale, p.price, p.currency)}{p.transaction.includes("rent") ? <span className="note" style={{ fontWeight: 400 }}> {t("perMonth")}</span> : null}</td>
                      <td><StatusSelect id={p.id} status={p.status} canEdit={canWrite && (p.agent_id === ctx.userId || ctx.caps.has("properties.write_all"))} /></td>
                      <td><div className="mtags">{days === null ? <span className="note">{p.mandate?.type === "exclusive" ? t("mandate.exclusive") : p.mandate?.type === "non_exclusive" ? t("mandate.non_exclusive") : "—"}</span> : days <= 30 && days >= 0 ? <Badge tone="warn"><Clock size={12} aria-hidden />{t("mandate.expiresIn", { days })}</Badge> : days < 0 ? <Badge tone="bad">{t("mandate.expired")}</Badge> : <Badge tone="acc">{t("mandate.exclusive")} · {dateShort(locale, p.mandate!.end)}</Badge>}
                        {p.mandate?.origin === "partner" && <Badge tone="info" >{t("origin.partner")}</Badge>}{p.mandate?.co_broke && <Badge tone="sig">{t("origin.coBrokeTag")}</Badge>}</div></td>
                      <td>{p.agent_name ? <Avatar text={initials(p.agent_name)} /> : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <form id="bulk" action={`/${locale}/properties/send`} method="get" />
      {!view && rows.length > 0 && <p className="note hide-m" style={{ marginBlockStart: 10 }}>{t("bulk.tip")}</p>}
      <BulkBar formId="bulk" />

      {pages > 1 && (
        <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
          {f.page > 1 ? <Link href={`/properties${pageHref(f.page - 1)}`} className="btn sm"><span className="flip"><ChevronLeft size={14} aria-hidden /></span>{tc("prev")}</Link> : null}
          <span className="note tab">{f.page} / {pages}</span>
          {f.page < pages ? <Link href={`/properties${pageHref(f.page + 1)}`} className="btn sm">{tc("next")}<span className="flip"><ChevronRight size={14} aria-hidden /></span></Link> : null}
        </div>
      )}
      {peekId && <PropertyPeek ctx={ctx} id={peekId} locale={locale} nav={{ closeHref: `/properties${toQuery(base)}`, prevHref: peekIdx > 0 ? peekHref(rows[peekIdx - 1]!.id) : null, nextHref: peekIdx >= 0 && peekIdx < rows.length - 1 ? peekHref(rows[peekIdx + 1]!.id) : null }} />}
    </>
  );
}
