import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlarmClock, ArrowRightLeft, CalendarCheck, Check, Clock, Eye, FileSignature, Hand, Handshake, MessageCircle, Navigation, Phone, Plus, Send, Snowflake, Sparkles, StickyNote, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCtx, seesAllStats, db } from "@/lib/session";
import { getOnboarding, getToday } from "@/lib/data/today";
import { getCockpit } from "@/lib/data/cockpit";
import { contactName } from "@/lib/data/contacts";
import { cityName } from "@/lib/data/geo";
import { pickName } from "@/lib/data/types";
import { money, num, timeOnly } from "@/lib/format";
import { Badge, Cover, PageHeader, Ring, Spark, StageBar } from "@/components/ui";
import { toggleTaskAction } from "./clients/actions";
import { TaskAdd } from "@/components/task-add";
import { SlipActions } from "@/components/slip-actions";
import { slipMap } from "@/lib/data/slips";

type Row = Record<string, any>;

export default async function TodayPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ scope?: string; add?: string }> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("today");
  const tp = await getTranslations("props");
  const manager = seesAllStats(ctx);
  const mine = !manager || sp.scope === "me";
  const [d, c] = await Promise.all([getToday(ctx, mine), getCockpit(ctx, mine)]);
  const contacts = sp.add === "task" ? (await db(ctx, (tx) => tx`select id, first_name, last_name, first_name_he, last_name_he from public.contacts where deleted_at is null order by updated_at desc limit 300`)) as unknown as Row[] : [];
  const onboarding = await getOnboarding(ctx);
  const slips = await slipMap(ctx, c.day.filter((v) => v.contact_id).map((v) => v.id as string));
  const to = await getTranslations("onboarding");
  const greeting = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : locale === "en" ? "en-IL" : "fr-FR", { timeZone: "Asia/Jerusalem", weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const city = (r: Row) => cityName({ name_fr: r.city_fr, name_he: r.city_he, name_en: r.city_en }, locale);
  const place = (r: Row) => [r.street, city(r)].filter(Boolean).join(", ");

  // Indicateurs
  const fees = c.months.map((m) => m.v);
  const feeNow = fees.at(-1) ?? 0, feePrev = fees.at(-2) ?? 0;
  const leads7 = c.leads.reduce((a, b) => a + b, 0), leadDiff = leads7 - c.leadsPrev;
  const openN = c.stages.reduce((a, s) => a + Number(s.n), 0);
  const weighted = c.stages.reduce((a, s) => a + Number(s.value) * (Number(s.probability) / 100), 0);
  const promise = c.stages.at(-1);
  const trend = (diff: number, txt: string) => <div className="d">{diff >= 0 ? <TrendingUp size={12} aria-hidden className="up" /> : <TrendingDown size={12} aria-hidden className="dn" />}<span className={diff >= 0 ? "up" : "dn"}>{txt}</span></div>;

  // Priorités, classées : retards, clients chauds, mandats, offres en attente, biens sans visite.
  type Prio = { key: string; tone: "bad" | "sig" | "warn" | ""; icon: React.ReactNode; title: string; sub: string; action: React.ReactNode };
  const prios: Prio[] = [
    ...c.overdue.map((k) => ({ key: `t${k.id}`, tone: "bad" as const, icon: <Clock size={14} aria-hidden />, title: k.title as string, sub: [t("prio.overdue"), k.contact_id ? contactName(k, locale) : null].filter(Boolean).join(" · "),
      action: <form action={toggleTaskAction.bind(null, k.id, true)}><input type="hidden" name="locale" value={locale} /><button className="btn sm"><Check size={13} aria-hidden />{t("prio.done")}</button></form> })),
    ...c.opened.map((o) => { const ph = o.phones?.[0]?.e164 as string | undefined; return { key: `o${o.contact_id}`, tone: "sig" as const, icon: <Eye size={14} aria-hidden />, title: t("prio.call", { name: contactName(o, locale) }), sub: t("prio.opened", { n: Number(o.n) }),
      action: <div className="row">{ph && <a className="btn sm" href={`tel:${ph}`}><Phone size={13} aria-hidden />{t("next.call")}</a>}{ph && <a className="btn sm" href={`https://wa.me/${ph.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={13} aria-hidden />WhatsApp</a>}<Link className="btn sm ghost" href={`/clients/${o.contact_id}`}>{t("prio.open")}</Link></div> }; }),
    ...c.mandates.map((m) => ({ key: `m${m.id}`, tone: "warn" as const, icon: <AlarmClock size={14} aria-hidden />, title: t("prio.mandate", { place: place(m) || m.reference }), sub: tp("mandate.expiresIn", { days: Number(m.days) }),
      action: <Link className="btn sm" href={`/properties/${m.id}`}>{t("prio.open")}</Link> })),
    ...c.stale.map((s) => ({ key: `d${s.id}`, tone: "warn" as const, icon: <Handshake size={14} aria-hidden />, title: t("prio.deal", { name: contactName(s, locale), stage: pickName(s.stage, locale) }), sub: t("prio.dealSub", { days: Number(s.days), value: money(locale, s.value) }),
      action: <Link className="btn sm" href={`/deals?deal=${s.id}`}>{t("prio.open")}</Link> })),
    ...c.cold.map((p) => ({ key: `p${p.id}`, tone: "" as const, icon: <Snowflake size={14} aria-hidden />, title: t("prio.cold", { place: place(p) || p.reference }), sub: t("prio.coldSub", { days: Number(p.days) }),
      action: <Link className="btn sm" href={`/properties/${p.id}`}>{t("prio.open")}</Link> })),
  ].slice(0, 5);

  const now = Date.now();
  const nextIdx = c.day.findIndex((v) => v.status === "planned" && new Date(v.starts_at).getTime() > now - 30 * 60_000);
  const feedIcon = (k: string) => ({ note: <StickyNote size={13} aria-hidden />, share: <Send size={13} aria-hidden className="flip" />, stage_change: <ArrowRightLeft size={13} aria-hidden />, visit: <CalendarCheck size={13} aria-hidden /> } as Record<string, React.ReactNode>)[k] ?? <Hand size={13} aria-hidden />;
  const feedText = (a: Row) => t(`feed.${["note", "share", "stage_change", "visit", "status_change"].includes(a.kind) ? a.kind : "other"}`, { name: a.contact_id ? contactName(a, locale) : "" });
  const ago = (dt: Date | string) => { const h = Math.floor((now - new Date(dt).getTime()) / 3_600_000); return h < 24 ? timeOnly(locale, dt) : new Intl.DateTimeFormat(locale === "he" ? "he-IL" : locale === "en" ? "en-IL" : "fr-FR", { timeZone: "Asia/Jerusalem", weekday: "short" }).format(new Date(dt)); };

  return (
    <>
      <PageHeader title={t("hello", { name: ctx.fullName.split(" ")[0] ?? "" })} sub={greeting}>
        {manager && <div className="seg" role="group" aria-label={t("scope")}><Link href="/?scope=me" className={mine ? "on" : ""}>{t("me")}</Link><Link href="/" className={mine ? "" : "on"}>{t("agency")}</Link></div>}
      </PageHeader>

      <div className="kpis">
        <div className="card kp"><div className="k">{t("kpi.fees")}</div><div className="v">{money(locale, feeNow)}</div><Spark values={fees} label={t("kpi.feesSpark")} />
          {feePrev > 0 ? trend(feeNow - feePrev, t("kpi.vsLast", { v: money(locale, feePrev) })) : <div className="d">{t("kpi.feesSub")}</div>}</div>
        <div className="card kp"><div className="k">{t("kpi.openDeals")}</div><div className="v">{num(locale, openN, 0)} <small>· {money(locale, weighted)}</small></div><span />
          <div className="d">{Number(d.kpi.stale_deals) > 0 ? <><Clock size={12} aria-hidden />{t("trend.stale", { n: Number(d.kpi.stale_deals) })}<Link href="/deals" className="sp" style={{ color: "var(--accent-text)", fontWeight: 500 }}>{t("prio.open")}</Link></> : t("kpi.weightedSub")}</div></div>
        <div className="card kp"><div className="k">{t("kpi.leads7")}</div><div className="v">{num(locale, leads7, 0)}</div><Spark values={c.leads} label={t("kpi.leadsSpark")} />
          {trend(leadDiff, t("kpi.vsWeek", { n: (leadDiff > 0 ? "+" : "") + leadDiff }))}</div>
        <div className="card kp"><div className="k">{t("kpi.activeProps")}</div><div className="v">{num(locale, d.kpi.active_props, 0)}</div><span />
          <div className="d">{Number(d.kpi.props_month) > 0 ? <><TrendingUp size={12} aria-hidden className="up" /><span className="up">{t("trend.month", { n: Number(d.kpi.props_month) })}</span></> : t("kpi.contactsN", { n: Number(d.kpi.contacts) })}</div></div>
      </div>

      <div className="cock">
        <div>
          <section className="card" aria-labelledby="h-prio">
            <h2 id="h-prio"><Sparkles size={15} aria-hidden style={{ color: "var(--signal-text)" }} />{t("prio.title")}<small>{t("prio.sub")}</small></h2>
            {prios.length === 0 ? <p className="muted card-b">{t("prio.empty")}</p> : prios.map((p) => (
              <div key={p.key} className="prio"><span className={`n ${p.tone}`}>{p.icon}</span><div style={{ minWidth: 0 }}><b>{p.title}</b><small>{p.sub}</small></div>{p.action}</div>
            ))}
          </section>

          <section className="card" aria-labelledby="h-day">
            <h2 id="h-day">{t("day.title")}<span className="cnt-b">{c.day.length}</span><Link href="/agenda" className="sp">{t("visits.all")}</Link></h2>
            {c.day.length === 0 ? <p className="muted card-b">{t("day.empty")}{d.visits[0] ? ` ${t("day.nextOn", { when: new Intl.DateTimeFormat(locale === "he" ? "he-IL" : locale === "en" ? "en-IL" : "fr-FR", { timeZone: "Asia/Jerusalem", weekday: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(d.visits[0].starts_at)) })}` : ""}</p> : (
              <div style={{ paddingBlock: 4 }}>{c.day.map((v, i) => {
                const ph = v.phones?.[0]?.e164 as string | undefined;
                return (
                  <div key={v.id} className={`slot ${i === nextIdx ? "next" : ""} ${v.status === "done" || (i < nextIdx) || (nextIdx < 0) ? "done" : ""}`}>
                    <time className="ltr">{timeOnly(locale, v.starts_at)}</time><div className="ln"><i /></div>
                    <div className="b"><Link href={`/properties/${v.property_id}`} className="thumb"><Cover path={v.cover_thumb} /></Link>
                      <div className="grow" style={{ minWidth: 0 }}><b className="trunc">{place(v)}</b><small>{v.contact_id ? contactName(v, locale) : t("day.noClient")}</small></div>
                      {i === nextIdx && <div className="row">
                        <a className="btn pri sm" href={`https://waze.com/ul?q=${encodeURIComponent(place(v))}`} target="_blank" rel="noopener noreferrer"><Navigation size={13} aria-hidden />{t("next.route")}</a>
                        {ph && <a className="btn sm icon" href={`tel:${ph}`} aria-label={t("next.call")}><Phone size={13} aria-hidden /></a>}
                      </div>}
                      {slips.has(v.id) && <div className="slipl"><FileSignature size={13} aria-hidden className="note" /><SlipActions s={slips.get(v.id)!} sm /></div>}
                    </div>
                  </div>);
              })}</div>
            )}
          </section>

          <section className="card"><h2>{t("tasks.title")}<span className="cnt-b">{d.tasks.length}</span>{ctx.caps.has("tasks.write") && <Link href={sp.add === "task" ? "/" : "/?add=task"} className="sp btn ghost sm" scroll={false}><Plus size={14} aria-hidden />{t("tasks.add")}</Link>}<Link href="/tasks" className="note" style={{ fontWeight: 400, marginInlineStart: 8 }}>{t("tasks.all")}</Link></h2>
            {sp.add === "task" && <div className="card-b" style={{ borderBlockEnd: "1px solid var(--border)" }}><TaskAdd locale={locale} autoFocus compact contacts={contacts.map((k) => ({ id: k.id, label: contactName(k, locale) }))} /></div>}
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

        <div>
          <section className="card"><h2><Sparkles size={15} aria-hidden style={{ color: "var(--signal-text)" }} />{t("matches.title")}</h2>
            {d.newMatches.length === 0 ? <p className="muted card-b">{t("matches.empty")}</p> : d.newMatches.map((p) => (
              <Link key={p.id} href={`/properties/${p.id}`} className="li">
                <div className="thumb" style={{ width: 56, height: 40 }}><Cover path={p.cover_thumb} /></div>
                <div className="grow" style={{ minWidth: 0 }}><b className="trunc">{num(locale, p.rooms)} {tp("rooms").toLowerCase()} · {place(p)}</b><small className="tab">{money(locale, p.price, p.currency)} · {t("matches.clients", { count: Number(p.n) })}</small></div>
                {p.best ? <Ring value={Number(p.best)} /> : null}
              </Link>))}
          </section>

          {openN > 0 && <section className="card"><h2>{t("pipe.title")}<Link href="/deals" className="sp">{t("prio.open")}</Link></h2>
            <div className="card-b col" style={{ gap: 10 }}>
              <StageBar label={t("pipe.aria", { n: openN })} parts={c.stages.map((s) => ({ label: pickName(s.name, locale), value: Number(s.n), tip: `${pickName(s.name, locale)} · ${s.n}` }))} />
              <div className="legend">{c.stages.map((s, i) => <span key={s.id}><i style={{ background: `var(--stage-${Math.min(6, Math.max(1, Math.round(((i + 1) / c.stages.length) * 6)))})` }} />{pickName(s.name, locale)} {s.n}</span>)}</div>
              {promise && Number(promise.n) > 0 && <div className="note">{t("pipe.promise", { n: Number(promise.n), v: money(locale, promise.fee) })}</div>}
            </div></section>}

          {d.mandates.length > 0 && <section className="card"><h2><AlarmClock size={15} aria-hidden />{t("mandates.title")}</h2>
            {d.mandates.map((m) => (
              <Link key={m.id} href={`/properties/${m.id}`} className="li">
                <div className="grow"><b className="trunc">{place(m)}</b><small><span className="ltr tab">{m.reference}</span></small></div>
                <Badge tone="warn">{tp("mandate.expiresIn", { days: Number(m.days) })}</Badge>
              </Link>))}
          </section>}

          <section className="card"><h2>{t("feed.title")}</h2>
            {c.feed.length === 0 ? <p className="muted card-b">{t("feed.empty")}</p> : <div className="card-b tl">{c.feed.map((a) => (
              <div key={a.id} className="tl-i"><span className={`tl-d ${a.kind === "share" ? "acc" : a.kind === "visit" ? "ok" : ""}`}>{feedIcon(a.kind)}</span>
                <div style={{ minWidth: 0 }}>{a.contact_id ? <Link href={`/clients/${a.contact_id}`}><b>{feedText(a)}</b></Link> : <b>{feedText(a)}</b>}<p>{a.kind === "note" && a.summary ? <span className="trunc" style={{ display: "block" }}>{a.summary}</span> : null}{a.actor_name ?? ""}</p></div>
                <time className="ltr">{ago(a.occurred_at)}</time></div>))}</div>}
          </section>
        </div>
      </div>
    </>
  );
}
