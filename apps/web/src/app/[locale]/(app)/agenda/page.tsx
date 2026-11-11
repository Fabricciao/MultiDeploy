import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, CalendarPlus, Check, ChevronLeft, ChevronRight, ClipboardCheck, Download, FileSignature, House, List, MapPin, MessageCircle, Navigation, Phone, Plus, UserRound, UserRoundX, Undo2, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCtx, db } from "@/lib/session";
import { listVisits, pendingDebriefs } from "@/lib/data/visits";
import { contactName } from "@/lib/data/contacts";
import { cityName } from "@/lib/data/geo";
import { addDays, dayKey, jerusalemInput, weekStart } from "@/lib/calendar/week";
import { quietReason } from "@/lib/calendar/jewish";
import { dateTime, intlLocale, timeOnly } from "@/lib/format";
import { Badge, PageHeader } from "@/components/ui";
import { VisitForm } from "@/components/visit-form";
import { VisitMove } from "@/components/visit-move";
import { Modal } from "@/components/modal";
import { SlipActions } from "@/components/slip-actions";
import { slipMap } from "@/lib/data/slips";
import { VisitDebrief } from "@/components/visit-debrief";
import { visitStatusAction } from "./actions";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 08:00 → 19:00
const hourIn = (d: Date) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", hourCycle: "h23" }).format(d));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type SP = { w?: string; view?: string; new?: string; property?: string; contact?: string; at?: string; v?: string };

export default async function AgendaPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SP> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("agenda");
  const off = Math.max(-26, Math.min(52, Math.floor(Number(sp.w) || 0)));
  const list = sp.view === "list";
  const start = weekStart(new Date(), off), end = addDays(start, 7);
  // Fenêtre « Planifier une visite » : ouverte par ?new=1, préremplie par le bien, le client ou le créneau d'où l'on vient.
  const planning = sp.new === "1" && ctx.caps.has("properties.write") && !ctx.impersonating;
  const preProperty = sp.property && UUID.test(sp.property) ? sp.property : undefined;
  const preContact = sp.contact && UUID.test(sp.contact) ? sp.contact : undefined;
  const preAt = sp.at && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(sp.at) ? sp.at : undefined;
  const [visits, props, contacts] = await Promise.all([
    listVisits(ctx, start, end),
    planning ? db(ctx, (tx) => tx`select p.id, p.reference, p.street, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en from public.properties p left join public.geo_places g on g.id = p.city_id
      where p.deleted_at is null and (p.status in ('active','under_offer') or p.id = ${preProperty ?? null}) order by (p.id = ${preProperty ?? null}) desc nulls last, p.created_at desc limit 200`) : [],
    planning ? db(ctx, (tx) => tx`select id, first_name, last_name, first_name_he, last_name_he from public.contacts where deleted_at is null order by (id = ${preContact ?? null}) desc nulls last, created_at desc limit 200`) : [],
  ]);
  const slips = await slipMap(ctx, visits.filter((v) => v.contact_id && v.status !== "cancelled").map((v) => v.id));
  const toSend = visits.filter((v) => slips.get(v.id)?.url);
  const debriefs = await pendingDebriefs(ctx);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const fmtDay = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "Asia/Jerusalem", weekday: "long", day: "numeric", month: "long" });
  const fmtHead = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "Asia/Jerusalem", weekday: "short" });
  const fmtNum = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "Asia/Jerusalem", day: "numeric" });
  const fmtSlot = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "Asia/Jerusalem", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const hebrew = new Intl.DateTimeFormat("he-u-ca-hebrew", { timeZone: "Asia/Jerusalem", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const byDay = new Map<string, typeof visits>(); for (const v of visits) { const k = dayKey(v.starts_at); byDay.set(k, [...(byDay.get(k) ?? []), v]); }
  const viewParam = list ? "list" : undefined;
  const q = (o: Record<string, string | number | undefined> = {}) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ w: off || undefined, view: viewParam, ...o })) if (v !== undefined && v !== "" && v !== 0) u.set(k, String(v));
    const s = u.toString(); return s ? `/agenda?${s}` : "/agenda";
  };
  const newHref = (at?: string) => q({ new: 1, property: preProperty, contact: preContact, at });
  const todayKey = dayKey(new Date());
  const canPlan = ctx.caps.has("properties.write") && !ctx.impersonating;
  const sel = sp.v && UUID.test(sp.v) ? visits.find((v) => v.id === sp.v) : undefined;
  const place = (v: (typeof visits)[number]) => [v.street, cityName({ name_fr: v.city_fr, name_he: v.city_he, name_en: v.city_en }, locale)].filter(Boolean).join(", ");
  const tone = (s: string) => (s === "done" ? "ok" : s === "planned" ? "acc" : "bad");

  return (
    <>
      <PageHeader title={new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "Asia/Jerusalem", month: "long", year: "numeric" }).format(addDays(start, 3))} sub={<>{t("subline", { n: visits.length })} · <bdi dir="rtl" lang="he">{hebrew}</bdi></>}>
        <Link href={q({ w: off - 1 || undefined })} className="btn icon" aria-label={t("prev")} title={t("prev")}><span className="flip"><ChevronLeft size={16} aria-hidden /></span></Link>
        <Link href={q({ w: undefined })} className="btn">{t("today")}</Link>
        <Link href={q({ w: off + 1 || undefined })} className="btn icon" aria-label={t("next")} title={t("next")}><span className="flip"><ChevronRight size={16} aria-hidden /></span></Link>
        <div className="seg"><Link href={q({ view: undefined })} className={list ? "" : "on"}><CalendarDays size={14} aria-hidden />{t("viewWeek")}</Link><Link href={q({ view: "list" })} className={list ? "on" : ""}><List size={14} aria-hidden />{t("viewList")}</Link></div>
        <a href="/api/ics/agenda" className="btn hide-m"><Download size={14} aria-hidden />{t("ics")}</a>
        {canPlan && <Link href={newHref()} scroll={false} className="btn pri"><CalendarPlus size={15} aria-hidden />{t("newVisit")}</Link>}
      </PageHeader>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 16, alignItems: "start" }} className="split">
        {!list ? (
          <div className="col" style={{ gap: 8, minWidth: 0 }}>
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
                      const slot = `${k}T${String(h).padStart(2, "0")}:00`;
                      return (
                        <div key={k} className={`cal-c ${quiet ? "shab" : ""}`}>
                          {canPlan && <Link href={newHref(slot)} scroll={false} prefetch={false} className="cal-add" aria-label={t("addAt", { when: fmtSlot.format(new Date(d.getTime() + h * 3600_000)) })} title={t("newVisit")}><Plus size={14} aria-hidden /></Link>}
                          {evs.slice(0, 1).map((v) => <Link key={v.id} href={q({ v: v.id })} scroll={false} prefetch={false} className={`ev ${v.status === "done" ? "ok" : ""}`} style={{ opacity: v.status === "cancelled" ? 0.5 : 1 }}><b className="trunc">{v.title ?? v.street ?? v.reference}</b><span className="trunc" style={{ display: "block" }}>{v.contact_id ? contactName(v, locale) : timeOnly(locale, v.starts_at)}</span></Link>)}
                          {evs.length > 1 && <Link href={q({ view: "list" })} className="note" style={{ position: "absolute", insetBlockEnd: 1, insetInlineEnd: 3, fontSize: 10, zIndex: 2 }}>+{evs.length - 1}</Link>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            {canPlan && <p className="note hide-m">{t("planHint")}</p>}
          </div>
        ) : (
          <div className="col" style={{ gap: 12 }}>
            {days.map((d) => {
              const k = dayKey(d), rows = byDay.get(k) ?? [], noon = new Date(d.getTime() + 12 * 3600_000), quiet = quietReason(noon), isToday = k === todayKey;
              return (
                <section key={k} className="card" style={{ borderColor: isToday ? "var(--accent)" : undefined }}>
                  <h2 style={{ background: quiet?.kind === "shabbat" || quiet?.kind === "holiday" ? "var(--surface-sunken)" : undefined }}><CalendarDays size={14} aria-hidden />{fmtDay.format(noon)}{quiet && (quiet.kind === "shabbat" || quiet.kind === "holiday") && <Badge tone="warn">{quiet.kind === "shabbat" ? t("quiet.shabbat") : t(`holidays.${quiet.key}`)}</Badge>}<span className="cnt-b sp">{rows.length}</span>
                    {canPlan && <Link href={newHref(`${k}T10:00`)} scroll={false} className="btn sm ghost icon" aria-label={t("newVisit")} title={t("newVisit")}><Plus size={14} aria-hidden /></Link>}</h2>
                  {rows.length === 0 ? <p className="note card-b">{t("noVisits")}</p> : rows.map((v) => (
                    <div key={v.id} className="li wrap" style={{ opacity: v.status === "cancelled" ? 0.5 : 1 }}>
                      <b className="tab" style={{ width: 52 }}>{timeOnly(locale, v.starts_at)}</b>
                      <div className="grow"><Link href={q({ v: v.id })} scroll={false} style={{ fontWeight: 500 }}>{v.title ?? v.street ?? v.reference}</Link><div className="note"><MapPin size={11} aria-hidden style={{ display: "inline" }} /> {cityName({ name_fr: v.city_fr, name_he: v.city_he, name_en: v.city_en }, locale)}{v.contact_id ? <> · <Link href={`/clients/${v.contact_id}`}>{contactName(v, locale)}</Link></> : null} · {v.agent_name}</div></div>
                      <Badge tone={tone(v.status)}>{t(`status.${v.status}`)}</Badge>
                      {slips.has(v.id) && <SlipActions s={slips.get(v.id)!} sm />}
                      <a href={`/api/ics/visit/${v.id}`} className="btn sm ghost" aria-label={t("ics")} title={t("ics")}><Download size={13} aria-hidden /></a>
                      {v.status === "planned" && (v.agent_id === ctx.userId || ctx.caps.has("properties.write_all")) && (<>
                        <form action={visitStatusAction.bind(null, v.id, "done")}><input type="hidden" name="locale" value={locale} /><button className="btn sm">{t("markDone")}</button></form>
                        <form action={visitStatusAction.bind(null, v.id, "cancelled")}><input type="hidden" name="locale" value={locale} /><button className="btn sm ghost">{t("cancel")}</button></form></>)}
                    </div>))}
                </section>);
            })}
          </div>
        )}
        <div className="col" style={{ gap: 16 }}>
          {debriefs.length > 0 && <section className="card"><h2><ClipboardCheck size={15} aria-hidden />{t("debriefTitle")}<span className="cnt-b sp">{debriefs.length}</span></h2>
            {debriefs.map((v) => <div key={v.id} className="li wrap" style={{ gap: 8 }}><div className="grow" style={{ minWidth: 0 }}><b className="trunc">{contactName(v, locale)}</b><small className="trunc">{dateTime(locale, v.starts_at)} · {v.street ?? v.reference}</small></div><VisitDebrief visitId={v.id} name={contactName(v, locale)} /></div>)}
          </section>}
          <section className="card"><h2><FileSignature size={15} aria-hidden />{t("slipsTitle")}<span className="cnt-b sp">{toSend.length}</span></h2>
            {toSend.length === 0 ? <p className="note card-b">{t("slipsNone")}</p> : toSend.map((v) => (
              <div key={v.id} className="li wrap" style={{ gap: 8 }}><div className="grow" style={{ minWidth: 0 }}><b className="trunc">{contactName(v, locale)}</b><small className="trunc">{dateTime(locale, v.starts_at)} · {v.title ?? v.street ?? v.reference}</small></div><SlipActions s={slips.get(v.id)!} sm /></div>))}
            <div className="card-b"><Link href="/visit-slips" className="note" style={{ textDecoration: "underline" }}>{t("slipsAll")}</Link></div>
          </section>
        </div>
      </div>

      {planning && (
        <Modal title={t("newVisit")} closeHref={q()} closeLabel={t("close")}>
          <VisitForm bare key={`${preProperty}-${preContact}-${preAt}`} defaults={{ property: preProperty, contact: preContact, at: preAt }} doneHref={q()} againHref={q({ new: 1 })}
            properties={props.map((p) => ({ id: p.id, label: [p.street, cityName({ name_fr: p.city_fr, name_he: p.city_he, name_en: p.city_en }, locale)].filter(Boolean).join(", ") + ` · ${p.reference}` }))}
            contacts={contacts.map((c) => ({ id: c.id, label: contactName(c, locale) }))} />
        </Modal>
      )}

      {sel && !planning && (() => {
        const mine = sel.agent_id === ctx.userId || ctx.caps.has("properties.write_all");
        const canAct = mine && ctx.caps.has("properties.write") && !ctx.impersonating;
        const digits = (sel.phone ?? "").replace(/\D/g, "");
        const past = new Date(sel.starts_at).getTime() <= Date.now() + 3600_000;
        const slip = slips.get(sel.id);
        const st = (status: "done" | "cancelled" | "no_show" | "planned", label: string, icon: React.ReactNode, cls = "") => <form action={visitStatusAction.bind(null, sel.id, status)}><input type="hidden" name="locale" value={locale} /><button className={`btn sm ${cls}`}>{icon}{label}</button></form>;
        return (
          <Modal title={sel.title ?? sel.street ?? sel.reference} closeHref={q()} closeLabel={t("close")} wide>
            <div className="bd col" style={{ gap: 16 }}>
              <div className="col" style={{ gap: 10 }}>
                <div className="vrow"><CalendarDays size={15} aria-hidden /><div><b style={{ fontWeight: 600 }}>{fmtSlot.format(new Date(sel.starts_at))}</b> <Badge tone={tone(sel.status)}>{t(`status.${sel.status}`)}</Badge></div></div>
                <div className="vrow"><House size={15} aria-hidden /><div><Link href={`/properties/${sel.property_id}`} style={{ fontWeight: 500 }}>{place(sel) || sel.reference}</Link><small><span className="ltr tab">{sel.reference}</span></small></div></div>
                <div className="vrow"><UserRound size={15} aria-hidden /><div>{sel.contact_id ? <Link href={`/clients/${sel.contact_id}`} style={{ fontWeight: 500 }}>{contactName(sel, locale)}</Link> : <span className="muted">{t("visit.noClient")}</span>}{sel.agent_name && <small>{t("visit.agent", { name: sel.agent_name })}</small>}</div></div>
              </div>
              <div className="actbar">
                <a className="btn pri" href={`https://waze.com/ul?q=${encodeURIComponent(place(sel))}`} target="_blank" rel="noopener noreferrer"><Navigation size={14} aria-hidden />{t("visit.route")}</a>
                {sel.phone && <a className="btn" href={`tel:${sel.phone}`}><Phone size={14} aria-hidden />{t("visit.call")}</a>}
                {digits && <a className="btn" href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} aria-hidden />WhatsApp</a>}
                <Link className="btn ghost" href={`/properties/${sel.property_id}`}>{t("visit.openProperty")}</Link>
                {sel.contact_id && <Link className="btn ghost" href={`/clients/${sel.contact_id}`}>{t("visit.openClient")}</Link>}
              </div>
              {slip && <div className="col" style={{ gap: 6 }}><div className="lbl"><FileSignature size={14} aria-hidden />{t("visit.slip")}</div><SlipActions s={slip} sm /></div>}
              {sel.contact_id && sel.status !== "cancelled" && past && <div className="col" style={{ gap: 6 }}><div className="lbl"><ClipboardCheck size={14} aria-hidden />{t("visit.debrief")}</div>
                {sel.has_feedback ? <span className="badge ok" style={{ alignSelf: "flex-start" }}><Check size={12} aria-hidden />{t("visit.debriefDone")}</span> : canAct ? <VisitDebrief visitId={sel.id} name={contactName(sel, locale)} open /> : null}</div>}
              {canAct && <div className="col" style={{ gap: 6 }}><div className="lbl">{t("visit.status")}</div>
                <div className="actbar">
                  {sel.status === "planned" ? <>{st("done", t("markDone"), <Check size={13} aria-hidden />)}{st("no_show", t("visit.noShow"), <UserRoundX size={13} aria-hidden />)}{st("cancelled", t("cancel"), <X size={13} aria-hidden />, "danger")}</> : st("planned", t("visit.replan"), <Undo2 size={13} aria-hidden />)}
                </div></div>}
              {canAct && sel.status === "planned" && (sel.signed_at ? <p className="note">{t("visit.signedLocked")}</p> : <VisitMove visitId={sel.id} at={jerusalemInput(new Date(sel.starts_at))} />)}
            </div>
          </Modal>
        );
      })()}
    </>
  );
}
