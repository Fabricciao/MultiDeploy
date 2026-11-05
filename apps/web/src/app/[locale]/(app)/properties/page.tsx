import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, ChevronRight, Clock, Plus, SlidersHorizontal, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCtx } from "@/lib/session";
import { listProperties } from "@/lib/data/properties";
import { listAgents, listCities, cityName } from "@/lib/data/geo";
import { MUST_HAVE, PAGE_SIZE, parsePropertyFilters, toQuery, type SP } from "@/lib/data/filters";
import { dateShort, initials, money, num } from "@/lib/format";
import { Badge, Avatar, PageHeader, Photo } from "@/components/ui";
import { SavedViews } from "@/components/saved-views";
import { listViews } from "@/lib/data/views";

const STATUS_TONE: Record<string, "ok" | "warn" | "acc" | ""> = { active: "ok", under_offer: "warn", sold: "acc", rented: "acc", draft: "" };

export default async function PropertiesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SP> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const f = parsePropertyFilters(sp);
  const ctx = await getCtx(locale);
  const t = await getTranslations("props");
  const tc = await getTranslations("common");
  const [{ rows, total }, cities, agents, views] = await Promise.all([listProperties(ctx, f), listCities(ctx), listAgents(ctx), listViews(ctx, "properties")]);

  const base = { q: f.q, tx: f.transaction, status: f.status, city: f.cityIds, rmin: f.roomsMin, rmax: f.roomsMax, pmin: f.priceMin, pmax: f.priceMax, has: f.has, agent: f.agent, mandate: f.mandate, sort: f.sort === "recent" ? undefined : f.sort };
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
  if (f.mandate) chips.push({ label: t(`mandate.${f.mandate}`), href: without("mandate") });

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) => toQuery({ ...base, page: p === 1 ? undefined : p });

  return (
    <>
      <PageHeader title={t("title")} sub={t("count", { count: total })}>
        <Link href="/import?target=properties" className="btn">{t("import")}</Link>
        <Link href="/properties/new" className="btn pri"><Plus size={15} aria-hidden />{t("new")}</Link>
      </PageHeader>

      <SavedViews scope="properties" views={views} currentQs={toQuery({ ...base, page: undefined }).replace(/^\?/, "")} locale={locale} canShare={ctx.caps.has("org.manage")} />
      <form method="get" className="row wrap" style={{ marginBottom: 10 }}>
        {f.sort !== "recent" && <input type="hidden" name="sort" value={f.sort} />}
        <input name="q" defaultValue={f.q} placeholder={t("filters.q")} className="input" style={{ width: 220 }} aria-label={t("filters.q")} />
        <select name="tx" defaultValue={f.transaction ?? ""} className="input" style={{ width: 130 }} aria-label={t("filters.transaction")}>
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
            <div><div className="lbl">{t("filters.mandate")}</div><select name="mandate" defaultValue={f.mandate ?? ""} className="input"><option value="">{tc("all")}</option><option value="exclusive">{t("mandate.exclusive")}</option><option value="expiring">{t("mandate.expiring")}</option></select></div>
          </div>
        </details>
        <select name="sort" defaultValue={f.sort} className="input" style={{ width: 170 }} aria-label={t("filters.sort")}>
          {(["recent", "price_asc", "price_desc", "mandate"] as const).map((s) => <option key={s} value={s}>{t(`sort.${s}`)}</option>)}
        </select>
        <button className="btn pri">{tc("apply")}</button>
        {chips.length > 0 && <Link href="/properties" className="btn ghost sm">{tc("reset")}</Link>}
      </form>

      {chips.length > 0 && (
        <div className="row wrap" style={{ marginBottom: 12 }}>
          {chips.map((c, i) => <Link key={i} href={`/properties${c.href}`} className="chip on">{c.label}<X size={12} aria-hidden /></Link>)}
        </div>
      )}

      <div className="card" style={{ overflow: "hidden" }}>
        {rows.length === 0 ? (
          <p className="muted" style={{ padding: "40px 20px", textAlign: "center" }}>{t("empty")}</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead><tr>
                <th style={{ width: 30 }}></th><th>{t("property")}</th><th>{t("city")}</th><th>{t("rooms")}</th><th>{t("area")}</th><th>{t("floor")}</th><th>{t("price")}</th><th>{t("statusLabel")}</th><th>{t("mandateLabel")}</th><th>{t("agent")}</th>
              </tr></thead>
              <tbody>
                {rows.map((p) => {
                  const days = p.mandate?.type === "exclusive" && p.mandate.end ? Math.round((new Date(p.mandate.end).getTime() - Date.now()) / 86_400_000) : null;
                  return (
                    <tr key={p.id}>
                      <td><input type="checkbox" className="ck" name="p" value={p.id} form="bulk" aria-label={p.reference} /></td>
                      <td>
                        <Link href={`/properties/${p.id}`} className="row" style={{ gap: 12 }}>
                          <div className="thumb">{p.cover_thumb ? <img src={`/api/files/${p.cover_thumb}`} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Photo seed={p.id} label="" />}</div>
                          <div><div style={{ fontWeight: 500 }}>{p.title ?? `${t(`types.${p.property_type}`)} · ${p.street ?? ""}`}</div><div className="note"><span className="ltr tab">{p.reference}</span></div></div>
                        </Link>
                      </td>
                      <td>{cityName({ name_fr: p.city_fr, name_he: p.city_he, name_en: p.city_en }, locale)}<div className="note">{p.street} {p.address_visibility === "exact" ? p.house_number : ""}</div></td>
                      <td className="tab">{num(locale, p.rooms)}</td>
                      <td className="tab">{num(locale, p.area_built, 0)} {t("sqm")}</td>
                      <td className="tab"><span className="ltr">{p.floor ?? "–"}{p.floors_total ? `/${p.floors_total}` : ""}</span></td>
                      <td className="tab" style={{ fontWeight: 500 }}>{money(locale, p.price, p.currency)}{p.transaction.includes("rent") ? <span className="note"> {t("perMonth")}</span> : null}</td>
                      <td><Badge tone={STATUS_TONE[p.status] ?? ""}><i className="dot" />{t(`status.${p.status}`)}</Badge></td>
                      <td>{days === null ? <span className="muted">{p.mandate?.type === "non_exclusive" ? t("mandate.non_exclusive") : "—"}</span> : days <= 30 && days >= 0 ? <Badge tone="warn"><Clock size={12} aria-hidden />{t("mandate.expiresIn", { days })}</Badge> : days < 0 ? <Badge tone="bad">{t("mandate.expired")}</Badge> : <Badge>{t("mandate.exclusive")} · {dateShort(locale, p.mandate!.end)}</Badge>}</td>
                      <td>{p.agent_name ? <Avatar text={initials(p.agent_name)} /> : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form id="bulk" action={`/${locale}/properties/send`} method="get" className="row" style={{ marginTop: 12, gap: 8 }}><button className="btn sm">{t("bulkSend")}</button><span className="note">{t("bulkHint")}</span></form>

      {pages > 1 && (
        <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
          {f.page > 1 ? <Link href={`/properties${pageHref(f.page - 1)}`} className="btn sm"><span className="flip"><ChevronLeft size={14} aria-hidden /></span>{tc("prev")}</Link> : null}
          <span className="note tab">{f.page} / {pages}</span>
          {f.page < pages ? <Link href={`/properties${pageHref(f.page + 1)}`} className="btn sm">{tc("next")}<span className="flip"><ChevronRight size={14} aria-hidden /></span></Link> : null}
        </div>
      )}
    </>
  );
}
