import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, ChevronLeft, ChevronRight, Download, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCtx, db } from "@/lib/session";
import { listVisits } from "@/lib/data/visits";
import { contactName } from "@/lib/data/contacts";
import { cityName } from "@/lib/data/geo";
import { addDays, dayKey, weekStart } from "@/lib/calendar/week";
import { quietReason } from "@/lib/calendar/jewish";
import { intlLocale, timeOnly } from "@/lib/format";
import { Badge, PageHeader } from "@/components/ui";
import { VisitForm } from "@/components/visit-form";
import { signLinkAction, visitStatusAction } from "./actions";

export default async function AgendaPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ w?: string; sign?: string }> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("agenda");
  const off = Math.max(-26, Math.min(52, Math.floor(Number(sp.w) || 0)));
  const start = weekStart(new Date(), off), end = addDays(start, 7);
  const [visits, props, contacts] = await Promise.all([
    listVisits(ctx, start, end),
    db(ctx, (tx) => tx`select p.id, p.reference, p.street, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en from public.properties p left join public.geo_places g on g.id = p.city_id where p.status in ('active','under_offer') and p.deleted_at is null order by p.created_at desc limit 200`),
    db(ctx, (tx) => tx`select id, first_name, last_name, first_name_he, last_name_he from public.contacts where deleted_at is null order by created_at desc limit 150`),
  ]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const fmtDay = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "Asia/Jerusalem", weekday: "long", day: "numeric", month: "long" });
  const byDay = new Map<string, typeof visits>(); for (const v of visits) { const k = dayKey(v.starts_at); byDay.set(k, [...(byDay.get(k) ?? []), v]); }
  return (
    <>
      <PageHeader title={t("title")} sub={new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "Asia/Jerusalem", day: "numeric", month: "long", year: "numeric" }).format(start)}>
        <Link href={`/agenda?w=${off - 1}`} className="btn icon" aria-label={t("prev")}><span className="flip"><ChevronLeft size={16} aria-hidden /></span></Link>
        <Link href="/agenda" className="btn">{t("today")}</Link>
        <Link href={`/agenda?w=${off + 1}`} className="btn icon" aria-label={t("next")}><span className="flip"><ChevronRight size={16} aria-hidden /></span></Link>
        <a href="/api/ics/agenda" className="btn"><Download size={14} aria-hidden />{t("ics")}</a>
      </PageHeader>
      {sp.sign && /^https?:\/\/[^\s]+\/(fr|he|en)\/sign\/[\w%.-]+$/.test(sp.sign) && <div role="status" className="card card-b col" style={{ gap: 6, marginBottom: 12 }}><b style={{ fontWeight: 500 }}>{t("signReady")}</b><input readOnly className="input ltr" dir="ltr" value={sp.sign} aria-label={t("signLink")} /><span className="note">{t("signHint")}</span></div>}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 20, alignItems: "start" }} className="split">
        <div className="col" style={{ gap: 12 }}>
          {days.map((d) => {
            const k = dayKey(d), list = byDay.get(k) ?? [], noon = new Date(d.getTime() + 12 * 3600_000), quiet = quietReason(noon), isToday = k === dayKey(new Date());
            return (
              <section key={k} className="card" style={{ borderColor: isToday ? "var(--accent)" : undefined }}>
                <h2 style={{ background: quiet?.kind === "shabbat" || quiet?.kind === "holiday" ? "var(--warn-soft)" : undefined }}><CalendarDays size={14} aria-hidden />{fmtDay.format(noon)}{quiet && (quiet.kind === "shabbat" || quiet.kind === "holiday") && <Badge tone="warn">{quiet.kind === "shabbat" ? t("quiet.shabbat") : t(`holidays.${quiet.key}`)}</Badge>}<span className="badge sp">{list.length}</span></h2>
                {list.length === 0 ? <p className="note card-b">{t("noVisits")}</p> : list.map((v, i) => (
                  <div key={v.id} className="row" style={{ padding: "10px 14px", borderTop: i ? "1px solid var(--line)" : 0, gap: 12, opacity: v.status === "cancelled" ? 0.5 : 1 }}>
                    <b className="tab" style={{ width: 52 }}>{timeOnly(locale, v.starts_at)}</b>
                    <div className="grow"><Link href={`/properties/${v.property_id}`} style={{ fontWeight: 500 }}>{v.title ?? v.street ?? v.reference}</Link><div className="note"><MapPin size={11} aria-hidden /> {cityName({ name_fr: v.city_fr, name_he: v.city_he, name_en: v.city_en }, locale)}{v.contact_id ? <> · <Link href={`/clients/${v.contact_id}`}>{contactName(v, locale)}</Link></> : null} · {v.agent_name}</div></div>
                    <Badge tone={v.status === "done" ? "ok" : v.status === "planned" ? "acc" : "bad"}>{t(`status.${v.status}`)}</Badge>
                    {v.document_path ? <a href={`/api/files/${v.document_path}`} className="btn sm" target="_blank" rel="noreferrer">{t("signedDoc")}</a> : v.status !== "cancelled" && v.agent_id === ctx.userId ? <form action={signLinkAction.bind(null, v.id)}><input type="hidden" name="locale" value={locale} /><button className="btn sm ghost">{t("signLink")}</button></form> : null}
                    <a href={`/api/ics/visit/${v.id}`} className="btn sm ghost" aria-label={t("ics")}><Download size={13} aria-hidden /></a>
                    {v.status === "planned" && v.agent_id === ctx.userId && (<>
                      <form action={visitStatusAction.bind(null, v.id, "done")}><input type="hidden" name="locale" value={locale} /><button className="btn sm">{t("markDone")}</button></form>
                      <form action={visitStatusAction.bind(null, v.id, "cancelled")}><input type="hidden" name="locale" value={locale} /><button className="btn sm ghost">{t("cancel")}</button></form></>)}
                  </div>))}
              </section>);
          })}
        </div>
        <VisitForm properties={props.map((p) => ({ id: p.id, label: `${p.reference} · ${p.street ?? ""} ${cityName({ name_fr: p.city_fr, name_he: p.city_he, name_en: p.city_en }, locale)}` }))} contacts={contacts.map((c) => ({ id: c.id, label: contactName(c, locale) }))} />
      </div>
    </>
  );
}
