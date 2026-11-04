import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, MapPin, Target, TriangleAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCtx } from "@/lib/session";
import { getOnboarding, getToday } from "@/lib/data/today";
import { contactName } from "@/lib/data/contacts";
import { cityName } from "@/lib/data/geo";
import { dateTime, money, num, timeOnly } from "@/lib/format";
import { Badge, PageHeader } from "@/components/ui";
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
  const greeting = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : locale === "en" ? "en-IL" : "fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const place = (r: Record<string, any>) => [r.street, cityName({ name_fr: r.city_fr, name_he: r.city_he, name_en: r.city_en }, locale)].filter(Boolean).join(", ");
  const kpi = (label: string, value: React.ReactNode) => <div className="card card-b"><div className="note">{label}</div><div className="tab" style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.02em", marginTop: 2 }}>{value}</div></div>;
  return (
    <>
      <PageHeader title={t("hello", { name: ctx.fullName.split(" ")[0] ?? "" })} sub={greeting} />
      {onboarding && (
        <section className="card" style={{ marginBottom: 16, borderColor: "var(--accent)" }}><h2>{to("title")}<span className="badge acc">{onboarding.filter((s) => s.done).length}/{onboarding.length}</span></h2>
          <div className="card-b col" style={{ gap: 8 }}>{onboarding.map((s) => <Link key={s.key} href={s.href} className="row" style={{ gap: 10, opacity: s.done ? 0.55 : 1 }}><span className={`cb ${s.done ? "on" : ""}`} style={{ borderRadius: "50%", width: 18, height: 18 }}>{s.done ? "✓" : ""}</span><span style={{ textDecoration: s.done ? "line-through" : "none" }}>{to(`steps.${s.key}`)}</span></Link>)}</div></section>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 16 }}>
        {kpi(t("kpi.activeProps"), num(locale, d.kpi.active_props, 0))}{kpi(t("kpi.contacts"), num(locale, d.kpi.contacts, 0))}{kpi(t("kpi.openDeals"), num(locale, d.kpi.open_deals, 0))}{kpi(t("kpi.weighted"), money(locale, d.kpi.weighted))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(380px,1fr))", gap: 16, alignItems: "start" }}>
        <section className="card"><h2>{t("tasks.title")}<span className="badge">{d.tasks.length}</span></h2>
          {d.tasks.length === 0 ? <p className="muted card-b">{t("tasks.empty")}</p> : d.tasks.map((k, i) => (
            <form key={k.id} action={toggleTaskAction.bind(null, k.id, true)} className="row" style={{ padding: "10px 14px", borderTop: i ? "1px solid var(--line)" : 0, gap: 10 }}>
              <input type="hidden" name="locale" value={locale} />
              <button className="cb" style={{ width: 20, height: 20, cursor: "pointer" }} aria-label={t("tasks.done")} />
              <div className="grow"><div>{k.title}</div>{k.contact_id && <Link href={`/clients/${k.contact_id}`} className="note" style={{ textDecoration: "underline" }}>{contactName(k, locale)}</Link>}</div>
              {k.overdue ? <Badge tone="bad"><Clock size={11} aria-hidden />{t("tasks.overdue")}</Badge> : k.due_at ? <span className="note">{timeOnly(locale, k.due_at)}</span> : null}
            </form>))}
        </section>

        <section className="card"><h2>{t("visits.title")}<span className="badge">{d.visits.length}</span></h2>
          {d.visits.length === 0 ? <p className="muted card-b">{t("visits.empty")}</p> : d.visits.map((v, i) => (
            <Link key={v.id} href={`/properties/${v.property_id}`} className="row" style={{ padding: "10px 14px", borderTop: i ? "1px solid var(--line)" : 0, gap: 10 }}>
              <MapPin size={16} aria-hidden /><div className="grow"><div style={{ fontWeight: 500 }}>{place(v)}</div><div className="note">{dateTime(locale, v.starts_at)}{v.contact_id ? ` · ${contactName(v, locale)}` : ""}</div></div>
            </Link>))}
        </section>

        <section className="card"><h2><Target size={15} aria-hidden />{t("matches.title")}</h2>
          {d.newMatches.length === 0 ? <p className="muted card-b">{t("matches.empty")}</p> : d.newMatches.map((p, i) => (
            <Link key={p.id} href={`/properties/${p.id}`} className="row" style={{ padding: "10px 14px", borderTop: i ? "1px solid var(--line)" : 0, gap: 10 }}>
              <div className="grow"><div style={{ fontWeight: 500 }}>{num(locale, p.rooms)} {tp("rooms").toLowerCase()} · {place(p)}</div><div className="note tab">{money(locale, p.price, p.currency)}</div></div>
              <Badge tone="acc">{t("matches.clients", { count: Number(p.n) })}</Badge>
            </Link>))}
        </section>

        <section className="card"><h2><TriangleAlert size={15} aria-hidden />{t("mandates.title")}</h2>
          {d.mandates.length === 0 ? <p className="muted card-b">{t("mandates.empty")}</p> : d.mandates.map((m, i) => (
            <Link key={m.id} href={`/properties/${m.id}`} className="row" style={{ padding: "10px 14px", borderTop: i ? "1px solid var(--line)" : 0, gap: 10 }}>
              <div className="grow"><div style={{ fontWeight: 500 }}>{place(m)}</div><div className="note"><span className="ltr tab">{m.reference}</span></div></div>
              <Badge tone="warn">{tp("mandate.expiresIn", { days: Number(m.days) })}</Badge>
            </Link>))}
        </section>
      </div>
    </>
  );
}
