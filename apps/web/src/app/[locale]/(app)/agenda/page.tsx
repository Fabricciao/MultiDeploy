import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, FileSignature, ChevronLeft, ChevronRight, Download, List, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCtx, db } from "@/lib/session";
import { listVisits } from "@/lib/data/visits";
import { contactName } from "@/lib/data/contacts";
import { cityName } from "@/lib/data/geo";
import { addDays, dayKey, weekStart } from "@/lib/calendar/week";
import { quietReason } from "@/lib/calendar/jewish";
import { dateTime, intlLocale, timeOnly } from "@/lib/format";
import { Badge, PageHeader } from "@/components/ui";
import { VisitForm } from "@/components/visit-form";
import { SlipActions } from "@/components/slip-actions";
import { slipMap } from "@/lib/data/slips";
import { visitStatusAction } from "./actions";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 08:00 → 19:00
const hourIn = (d: Date) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", hourCycle: "h23" }).format(d));

export default async function AgendaPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ w?: string; view?: string }> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("agenda");
  const off = Math.max(-26, Math.min(52, Math.floor(Number(sp.w) || 0)));
  const list = sp.view === "list";
  const start = weekStart(new Date(), off), end = addDays(start, 7);
  const [visits, props, contacts] = await Promise.all([
    listVisits(ctx, start, end),
    db(ctx, (tx) => tx`select p.id, p.reference, p.street, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en from public.properties p left join public.geo_places g on g.id = p.city_id where p.status in ('active','under_offer') and p.deleted_at is null order by p.created_at desc limit 200`),
    db(ctx, (tx) => tx`select id, first_name, last_name, first_name_he, last_name_he from public.contacts where deleted_at is null order by created_at desc limit 150`),
  ]);
  const slips = await slipMap(ctx, visits.filter((v) => v.contact_id && v.status !== "cancelled").map((v) => v.id));
  const toSend = visits.filter((v) => slips.get(v.id)?.url);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const fmtDay = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "Asia/Jerusalem", weekday: "long", day: "numeric", month: "long" });
  const fmtHead = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "Asia/Jerusalem", weekday: "short" });
  const fmtNum = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "Asia/Jerusalem", day: "numeric" });
  const hebrew = new Intl.DateTimeFormat("he-u-ca-hebrew", { timeZone: "Asia/Jerusalem", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const byDay = new Map<string, typeof visits>(); for (const v of visits) { const k = dayKey(v.starts_at); byDay.set(k, [...(byDay.get(k) ?? []), v]); }
  const q = (o: { w?: number; view?: string }) => { const u = new URLSearchParams(); if (o.w) u.set("w", String(o.w)); if (o.view) u.set("view", o.view); const s = u.toString(); return s ? `/agenda?${s}` : "/agenda"; };
  const viewParam = list ? "list" : undefined;
  const todayKey = dayKey(new Date());
  return (
    <>
      <PageHeader title={new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "Asia/Jerusalem", month: "long", year: "numeric" }).format(addDays(start, 3))} sub={<>{t("subline", { n: visits.length })} · <bdi dir="rtl" lang="he">{hebrew}</bdi></>}>
        <Link href={q({ w: off - 1, view: viewParam })} className="btn icon" aria-label={t("prev")}><span className="flip"><ChevronLeft size={16} aria-hidden /></span></Link>
        <Link href={q({ view: viewParam })} className="btn">{t("today")}</Link>
        <Link href={q({ w: off + 1, view: viewParam })} className="btn icon" aria-label={t("next")}><span className="flip"><ChevronRight size={16} aria-hidden /></span></Link>
        <div className="seg"><Link href={q({ w: off })} className={list ? "" : "on"}><CalendarDays size={14} aria-hidden />{t("viewWeek")}</Link><Link href={q({ w: off, view: "list" })} className={list ? "on" : ""}><List size={14} aria-hidden />{t("viewList")}</Link></div>
        <a href="/api/ics/agenda" className="btn hide-m"><Download size={14} aria-hidden />{t("ics")}</a>
      </PageHeader>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 16, alignItems: "start" }} className="split">
        {!list ? (
          <div style={{ overflowX: "auto" }}>
            <div className="cal" role="table" aria-label={t("title")}>
              <div className="cal-h" style={{ borderInlineStart: 0 }} />
              {days.map((d) => { const noon = new Date(d.getTime() + 12 * 3600_000), k = dayKey(noon), quiet = quietReason(noon); return <div key={k} className={`cal-h ${k === todayKey ? "now" : ""} ${quiet?.kind === "shabbat" || quiet?.kind === "holiday" ? "shab" : ""}`}>{fmtHead.format(noon)}<b className="tab">{fmtNum.format(noon)}</b></div>; })}
              {HOURS.map((h) => (
                <div key={h} style={{ display: "contents" }}>
                  <div className="cal-hr ltr">{String(h).padStart(2, "0")}:00</div>
                  {days.map((d) => {
                    const noon = new Date(d.getTime() + 12 * 3600_000), k = dayKey(noon), at = new Date(d.getTime() + h * 3600_000 + 1800_000), quiet = quietReason(at, 16);
                    const evs = (byDay.get(k) ?? []).filter((v) => hourIn(new Date(v.starts_at)) === h || (h === 8 && hourIn(new Date(v.starts_at)) < 8) || (h === 19 && hourIn(new Date(v.starts_at)) > 19));
                    return (
                      <div key={k} className={`cal-c ${quiet ? "shab" : ""}`}>
                        {evs.slice(0, 1).map((v) => <Link key={v.id} href={`/properties/${v.property_id}`} className={`ev ${v.status === "done" ? "ok" : ""}`} style={{ opacity: v.status === "cancelled" ? 0.5 : 1 }}><b className="trunc">{v.title ?? v.street ?? v.reference}</b><span className="trunc" style={{ display: "block" }}>{v.contact_id ? contactName(v, locale) : timeOnly(locale, v.starts_at)}</span></Link>)}
                        {evs.length > 1 && <span className="note" style={{ position: "absolute", insetBlockEnd: 1, insetInlineEnd: 5, fontSize: 10, zIndex: 2 }}>+{evs.length - 1}</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="col" style={{ gap: 12 }}>
            {days.map((d) => {
              const k = dayKey(d), rows = byDay.get(k) ?? [], noon = new Date(d.getTime() + 12 * 3600_000), quiet = quietReason(noon), isToday = k === todayKey;
              return (
                <section key={k} className="card" style={{ borderColor: isToday ? "var(--accent)" : undefined }}>
                  <h2 style={{ background: quiet?.kind === "shabbat" || quiet?.kind === "holiday" ? "var(--surface-sunken)" : undefined }}><CalendarDays size={14} aria-hidden />{fmtDay.format(noon)}{quiet && (quiet.kind === "shabbat" || quiet.kind === "holiday") && <Badge tone="warn">{quiet.kind === "shabbat" ? t("quiet.shabbat") : t(`holidays.${quiet.key}`)}</Badge>}<span className="cnt-b sp">{rows.length}</span></h2>
                  {rows.length === 0 ? <p className="note card-b">{t("noVisits")}</p> : rows.map((v) => (
                    <div key={v.id} className="li wrap" style={{ opacity: v.status === "cancelled" ? 0.5 : 1 }}>
                      <b className="tab" style={{ width: 52 }}>{timeOnly(locale, v.starts_at)}</b>
                      <div className="grow"><Link href={`/properties/${v.property_id}`} style={{ fontWeight: 500 }}>{v.title ?? v.street ?? v.reference}</Link><div className="note"><MapPin size={11} aria-hidden style={{ display: "inline" }} /> {cityName({ name_fr: v.city_fr, name_he: v.city_he, name_en: v.city_en }, locale)}{v.contact_id ? <> · <Link href={`/clients/${v.contact_id}`}>{contactName(v, locale)}</Link></> : null} · {v.agent_name}</div></div>
                      <Badge tone={v.status === "done" ? "ok" : v.status === "planned" ? "acc" : "bad"}>{t(`status.${v.status}`)}</Badge>
                      {slips.has(v.id) && <SlipActions s={slips.get(v.id)!} sm />}
                      <a href={`/api/ics/visit/${v.id}`} className="btn sm ghost" aria-label={t("ics")}><Download size={13} aria-hidden /></a>
                      {v.status === "planned" && v.agent_id === ctx.userId && (<>
                        <form action={visitStatusAction.bind(null, v.id, "done")}><input type="hidden" name="locale" value={locale} /><button className="btn sm">{t("markDone")}</button></form>
                        <form action={visitStatusAction.bind(null, v.id, "cancelled")}><input type="hidden" name="locale" value={locale} /><button className="btn sm ghost">{t("cancel")}</button></form></>)}
                    </div>))}
                </section>);
            })}
          </div>
        )}
        <div className="col" style={{ gap: 16 }}>
        <section className="card"><h2><FileSignature size={15} aria-hidden />{t("slipsTitle")}<span className="cnt-b sp">{toSend.length}</span></h2>
          {toSend.length === 0 ? <p className="note card-b">{t("slipsNone")}</p> : toSend.map((v) => (
            <div key={v.id} className="li wrap" style={{ gap: 8 }}><div className="grow" style={{ minWidth: 0 }}><b className="trunc">{contactName(v, locale)}</b><small className="trunc">{dateTime(locale, v.starts_at)} · {v.title ?? v.street ?? v.reference}</small></div><SlipActions s={slips.get(v.id)!} sm /></div>))}
          <div className="card-b"><Link href="/visit-slips" className="note" style={{ textDecoration: "underline" }}>{t("slipsAll")}</Link></div>
        </section>
        <VisitForm properties={props.map((p) => ({ id: p.id, label: `${p.reference} · ${p.street ?? ""} ${cityName({ name_fr: p.city_fr, name_he: p.city_he, name_en: p.city_en }, locale)}` }))} contacts={contacts.map((c) => ({ id: c.id, label: contactName(c, locale) }))} />
        </div>
      </div>
    </>
  );
}
