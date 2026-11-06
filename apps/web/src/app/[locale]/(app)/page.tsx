import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, MapPin, Navigation, Phone, Sparkles, TriangleAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCtx } from "@/lib/session";
import { getOnboarding, getToday } from "@/lib/data/today";
import { contactName } from "@/lib/data/contacts";
import { cityName } from "@/lib/data/geo";
import { dateTime, money, num, timeOnly } from "@/lib/format";
import { Badge, Cover, PageHeader } from "@/components/ui";
import { toggleTaskAction } from "./clients/actions";

export default async function TodayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("today");
  const tp = await getTranslations("props");
  const d = await getToday(ctx);
  const onboarding = await getOnboarding(ctx);
  const to = await getTranslations("onboarding");
  const greeting = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : locale === "en" ? "en-IL" : "fr-FR", { timeZone: "Asia/Jerusalem", weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const place = (r: Record<string, any>) => [r.street, cityName({ name_fr: r.city_fr, name_he: r.city_he, name_en: r.city_en }, locale)].filter(Boolean).join(", ");
  const kpi = (label: string, value: React.ReactNode) => <div className="card kpi"><div className="k">{label}</div><div className="v">{value}</div></div>;
  const next = d.visits[0];
  const phone = next?.phones?.[0]?.e164 as string | undefined;
  return (
    <>
      <PageHeader title={t("hello", { name: ctx.fullName.split(" ")[0] ?? "" })} sub={greeting} />
      <div className="kpis">
        {kpi(t("kpi.activeProps"), num(locale, d.kpi.active_props, 0))}{kpi(t("kpi.contacts"), num(locale, d.kpi.contacts, 0))}{kpi(t("kpi.openDeals"), num(locale, d.kpi.open_deals, 0))}{kpi(t("kpi.weighted"), money(locale, d.kpi.weighted))}
      </div>
      <div className="today">
        <div className="col" style={{ gap: 12 }}>
          {next && (
            <section className="card hero">
              <Link href={`/properties/${next.property_id}`} className="hero-ph"><Cover path={next.cover_thumb} /></Link>
              <div className="hero-b">
                <Badge tone="acc"><Clock size={12} aria-hidden />{t("next.title")} · <span className="ltr tab">{timeOnly(locale, next.starts_at)}</span></Badge>
                <Link href={`/properties/${next.property_id}`} style={{ fontWeight: 600, fontSize: 15, display: "block", marginBlockStart: 8 }}>{place(next)}</Link>
                <div className="note">{dateTime(locale, next.starts_at)}{next.contact_id ? ` · ${contactName(next, locale)}` : ""}</div>
                <div className="row wrap" style={{ marginBlockStart: 12 }}>
                  <a className="btn pri sm" href={`https://waze.com/ul?q=${encodeURIComponent(place(next))}`} target="_blank" rel="noopener noreferrer"><Navigation size={13} aria-hidden />{t("next.route")}</a>
                  {phone && <a className="btn sm" href={`tel:${phone}`}><Phone size={13} aria-hidden />{t("next.call")}</a>}
                </div>
              </div>
            </section>
          )}
          <section className="card"><h2>{t("tasks.title")}<span className="cnt-b">{d.tasks.length}</span></h2>
            {d.tasks.length === 0 ? <p className="muted card-b">{t("tasks.empty")}</p> : d.tasks.map((k) => (
              <form key={k.id} action={toggleTaskAction.bind(null, k.id, true)} className="li">
                <input type="hidden" name="locale" value={locale} />
                <button className="cb" style={{ width: 20, height: 20, cursor: "pointer" }} aria-label={t("tasks.done")} />
                <div className="grow"><b>{k.title}</b>{k.contact_id && <Link href={`/clients/${k.contact_id}`} className="note">{contactName(k, locale)}</Link>}</div>
                {k.overdue ? <Badge tone="bad"><Clock size={11} aria-hidden />{t("tasks.overdue")}</Badge> : k.due_at ? <span className="note tab ltr">{timeOnly(locale, k.due_at)}</span> : null}
              </form>))}
          </section>
          {onboarding && (
            <section className="card"><h2>{to("title")}<span className="badge acc">{onboarding.filter((s) => s.done).length}/{onboarding.length}</span></h2>
              <div className="card-b col" style={{ gap: 8 }}>{onboarding.map((s) => <Link key={s.key} href={s.href} className="row" style={{ gap: 10, color: s.done ? "var(--text-muted)" : undefined }}><span className={`cb ${s.done ? "on" : ""}`} style={{ borderRadius: "50%", width: 18, height: 18, fontSize: 11 }}>{s.done ? "✓" : ""}</span><span style={{ textDecoration: s.done ? "line-through" : "none" }}>{to(`steps.${s.key}`)}</span></Link>)}</div></section>
          )}
        </div>

        <div className="col" style={{ gap: 12 }}>
          <section className="card"><h2><Sparkles size={15} aria-hidden />{t("matches.title")}</h2>
            {d.newMatches.length === 0 ? <p className="muted card-b">{t("matches.empty")}</p> : d.newMatches.map((p) => (
              <Link key={p.id} href={`/properties/${p.id}`} className="li">
                <div className="thumb" style={{ width: 48, height: 40 }}><Cover path={p.cover_thumb} /></div>
                <div className="grow"><b className="trunc">{num(locale, p.rooms)} {tp("rooms").toLowerCase()} · {place(p)}</b><small className="tab">{money(locale, p.price, p.currency)}</small></div>
                <Badge tone="sig">{t("matches.clients", { count: Number(p.n) })}</Badge>
              </Link>))}
          </section>
          {d.mandates.length > 0 && <section className="card"><h2><TriangleAlert size={15} aria-hidden />{t("mandates.title")}</h2>
            {d.mandates.map((m) => (
              <Link key={m.id} href={`/properties/${m.id}`} className="li">
                <div className="grow"><b className="trunc">{place(m)}</b><small><span className="ltr tab">{m.reference}</span></small></div>
                <Badge tone="warn">{tp("mandate.expiresIn", { days: Number(m.days) })}</Badge>
              </Link>))}
          </section>}
        </div>

        <section className="card" style={{ alignSelf: "start" }}><h2>{t("visits.title")}<span className="cnt-b">{d.visits.length}</span><Link href="/agenda" className="sp note" style={{ fontWeight: 400 }}>{t("visits.all")}</Link></h2>
          {d.visits.length === 0 ? <p className="muted card-b">{t("visits.empty")}</p> : d.visits.map((v) => (
            <Link key={v.id} href={`/properties/${v.property_id}`} className="li">
              <MapPin size={15} aria-hidden style={{ color: "var(--text-muted)" }} /><div className="grow"><b className="trunc">{place(v)}</b><small>{dateTime(locale, v.starts_at)}{v.contact_id ? ` · ${contactName(v, locale)}` : ""}</small></div>
            </Link>))}
        </section>
      </div>
    </>
  );
}
