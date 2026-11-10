import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FileSignature, CalendarCheck, CalendarPlus, Clock, Eye, Flame, Handshake, Mail, MessageCircle, Pencil, Phone, Plus, Send, Snowflake, Sparkles, StickyNote, Sun } from "lucide-react";
import { getContactInsights } from "@/lib/data/insights";
import { Cover } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getCtx } from "@/lib/session";
import { contactName, getContact } from "@/lib/data/contacts";
import { cityName } from "@/lib/data/geo";
import { pickName } from "@/lib/data/types";
import { dateShort, dateTime, initials, money, num } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { Avatar, Badge } from "@/components/ui";
import { SendForm, type SendItem } from "@/components/send-form";
import { hasWhatsApp } from "@/lib/data/connections";
import { SlipActions } from "@/components/slip-actions";
import { listSlips, siteBase, slipInfo } from "@/lib/data/slips";
import { addNoteAction, addTaskAction, anonymizeAction, openDealAction, toggleTaskAction } from "../actions";

export default async function ClientPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("clients");
  const tp = await getTranslations("props");
  const ts = await getTranslations("send");
  const tc = await getTranslations("common");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getContact(ctx, id);
  if (!data) notFound();
  const { c } = data;
  const name = contactName(c, locale);
  const phone = c.phones?.[0]?.e164 as string | undefined;
  const email = c.emails?.[0]?.email as string | undefined;
  const consent = (c.marketing_consent as { granted?: boolean; at?: string } | null) ?? null;
  const items: SendItem[] = data.matches.map((m) => ({
    id: m.property_id, score: m.score,
    label: m.title ?? `${tp(`types.${m.property_type}`)} · ${m.street ?? ""}`,
    sub: `${cityName({ name_fr: m.city_fr, name_he: m.city_he, name_en: m.city_en }, locale)} · ${money(locale, m.price, m.currency)} · ${num(locale, m.rooms)} ${tp("rooms").toLowerCase()}`,
    warn: (m.reasons as { code: string; pct?: number }[]).find((r) => r.code === "over_budget") ? tp("match.overBudget", { pct: (m.reasons as { code: string; pct?: number }[]).find((r) => r.code === "over_budget")!.pct ?? 0 }) : undefined,
  }));
  const actLabel = (a: Record<string, any>) => (a.kind === "note" ? a.summary : a.kind === "share" ? t("activity.share", { channel: a.summary }) : a.kind === "stage_change" ? t("activity.stage_change") : a.kind === "visit_slip_sent" ? t("activity.slipSent", { channel: a.summary === "email" ? "e-mail" : "WhatsApp" }) : a.kind === "visit_signed" ? t("activity.visitSigned") : t(`activity.${a.summary}`));
  const kv = (k: string, v: React.ReactNode) => <div><div className="k">{k}</div><div className="v">{v}</div></div>;

  const criteria = (
    <div className="card"><h2>{t("criteria")}</h2><div className="card-b col" style={{ gap: 14 }}>
      {data.profiles.length === 0 && <p className="muted">{t("noCriteria")}</p>}
      {data.profiles.map((p) => (
        <div key={p.id} className="kv" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {kv(tp("filters.transaction"), tp(`tx.${p.transaction === "rent" ? "rent" : "sale"}`))}
          {kv(t("budget"), p.price_max ? `≤ ${money(locale, p.price_max, p.currency)}` : "—")}
          {kv(tp("filters.cities"), (p.cities as { fr: string; he: string; en: string }[]).map((x) => cityName({ name_fr: x.fr, name_he: x.he, name_en: x.en }, locale)).join(", ") || "—")}
          {kv(tp("rooms"), `${num(locale, p.rooms_min)} – ${num(locale, p.rooms_max)}`)}
          <div style={{ gridColumn: "span 2" }}>{kv(t("form.mustHave"), (p.must_have as string[]).map((k) => tp(`has.${k}`)).join(", ") || "—")}</div>
        </div>
      ))}
    </div></div>
  );
  const act = (href: string, icon: React.ReactNode, label: string, ext = false) => <a className="act" href={href} {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})} style={{ fontSize: 11.5 }}><span style={{ width: 40, height: 40 }}>{icon}</span>{label}</a>;
  const icon = (k: string) => ({ note: <StickyNote size={14} aria-hidden />, share: <Send size={14} aria-hidden className="flip" />, stage_change: <Handshake size={14} aria-hidden /> } as Record<string, React.ReactNode>)[k] ?? <Clock size={14} aria-hidden />;
  const tv = await getTranslations("clientV2");
  const [ins, slipList, base] = await Promise.all([getContactInsights(ctx, id), listSlips(ctx, { contactId: id, state: "all", limit: 10 }), siteBase()]);
  const buyerFee = c.commission_pct != null ? Number(c.commission_pct) : c.co_broke ? 0 : 2;
  const lastDays = ins.last ? Math.floor((Date.now() - new Date(ins.last).getTime()) / 86_400_000) : null;
  const heat = lastDays === null ? "cold" : lastDays <= 3 ? "hot" : lastDays <= 14 ? "warm" : "cold";
  const openTask = data.tasks.find((k) => !k.done_at);
  const recentOpen = ins.opened && Date.now() - new Date(ins.opened).getTime() < 3 * 86_400_000;
  const nextAction = openTask ? { title: openTask.title as string, sub: openTask.due_at ? tv("next.due", { d: dateShort(locale, openTask.due_at) }) : tv("next.noDate") }
    : recentOpen ? { title: tv("next.callOpened"), sub: tv("next.callOpenedSub") }
    : items.length > 0 && data.shares.length === 0 ? { title: tv("next.sendFirst", { n: items.length }), sub: tv("next.sendFirstSub") }
    : lastDays !== null && lastDays > 14 ? { title: tv("next.revive"), sub: tv("next.reviveSub", { days: lastDays }) } : null;
  type Ev = { key: string; at: Date; icon: React.ReactNode; tone: string; title: string; sub: string };
  const events: Ev[] = [
    ...data.activities.filter((a) => a.kind !== "visit").map((a) => ({ key: `a${a.id}`, at: new Date(a.occurred_at), icon: icon(a.kind), tone: a.kind === "share" ? "acc" : "", title: actLabel(a), sub: a.actor_name ?? "" })),
    ...ins.visits.map((v) => ({ key: `v${v.id}`, at: new Date(v.starts_at), icon: <CalendarCheck size={14} aria-hidden />, tone: v.status === "done" ? "ok" : "acc", title: tv(`visit.${["planned", "done", "cancelled", "no_show"].includes(v.status) ? v.status : "planned"}`, { place: v.street ?? v.reference }), sub: v.actor ?? "" })),
    ...data.shares.filter((s) => s.opened_at).map((s) => ({ key: `o${s.id}`, at: new Date(s.opened_at), icon: <Eye size={14} aria-hidden />, tone: "sig", title: tv("opened", { n: Number(s.n) }), sub: "" })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 30);
  return (
    <div className="client">
      <div className="col" style={{ gap: 16 }}>
        <div className="card card-b">
          <div className="row gap12"><Avatar text={initials(name)} cls="lg" /><div className="grow"><h1 className="t-page" style={{ fontSize: 22, lineHeight: "27px" }}>{name}</h1></div><Link href={`/clients/${id}/edit`} className="btn sm"><Pencil size={13} aria-hidden />{tc("edit")}</Link></div>
          <div className="row wrap" style={{ gap: 6, marginBlockStart: 10 }}>
            {(c.kinds as string[]).map((k) => <Badge key={k} tone="acc">{t(`kind.${k}`)}</Badge>)}
            {c.aliyah_status && c.aliyah_status !== "none" && <Badge>{t(`aliyah.${c.aliyah_status}`)}</Badge>}
            <span className={`temp ${heat}`} title={lastDays === null ? tv("heat.none") : tv("heat.last", { days: lastDays })}>{heat === "hot" ? <Flame size={12} aria-hidden /> : heat === "warm" ? <Sun size={12} aria-hidden /> : <Snowflake size={12} aria-hidden />}{tv(`heat.${heat}`)}</span>
            <Badge>{String(c.preferred_locale).toUpperCase()}</Badge>
            {consent?.granted ? <Badge tone="ok">{t("optIn")}</Badge> : <Badge tone="warn">{t("noConsent")}</Badge>}
          </div>
          {(phone || email) && <div className="row" style={{ justifyContent: "space-around", marginBlockStart: 14 }}>
            {phone && act(`tel:${phone}`, <Phone size={16} aria-hidden />, t("call"))}
            {phone && act(`https://wa.me/${phone.replace(/\D/g, "")}`, <MessageCircle size={16} aria-hidden />, "WhatsApp", true)}
            {email && act(`mailto:${email}`, <Mail size={16} aria-hidden />, "E-mail")}
          </div>}
        </div>
        {criteria}
        <div className="card"><h2>{t("details")}</h2><div className="card-b col" style={{ gap: 10 }}>
          {phone && <div className="row"><Phone size={14} aria-hidden /><span className="ltr tab">{formatPhone(phone)}</span></div>}
          {email && <div className="row"><Mail size={14} aria-hidden /><span className="ltr trunc">{email}</span></div>}
          <div className="row"><span className="muted">{t("agent")}</span><span className="sp">{c.owner_name ?? "—"}</span></div>
          {c.source_name && <div className="row"><span className="muted">{t("form.source")}</span><span className="sp">{pickName(c.source_name, locale)}</span></div>}
          <div className="row"><span className="muted">{t("form.commission")}</span><span className="sp tab">{num(locale, buyerFee, 1)} %{c.commission_pct == null && <span className="note"> · {t("form.commissionAutoShort")}</span>}</span></div>
          {c.co_broke && <div className="row"><Badge tone="sig">{t("form.coBrokeShort")}</Badge></div>}
          {c.notes && <p style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{c.notes}</p>}
        </div></div>
        <div className="card" id="slips"><h2><FileSignature size={15} aria-hidden />{tv("slips.title")}<span className="badge">{slipList.counts.signed} / {slipList.counts.signed + slipList.counts.pending}</span></h2>
          {slipList.rows.length === 0 ? <p className="muted card-b">{tv("slips.empty")}</p> : slipList.rows.map((r) => (
            <div key={r.id} className="li wrap" style={{ gap: 8 }}><div className="grow" style={{ minWidth: 0 }}><Link href={`/properties/${r.property_id}`} style={{ fontWeight: 500 }} className="trunc">{r.title ?? r.street ?? r.reference}</Link><small>{dateTime(locale, r.starts_at)}</small></div><SlipActions s={slipInfo(ctx, r, base)} sm /></div>))}
        </div>
        {ctx.caps.has("contacts.write") && (
          <div className="card"><h2>{t("privacy.title")}</h2><div className="card-b col" style={{ gap: 10 }}>
            <a className="btn sm" href={`/api/export/contact/${id}`}>{t("privacy.export")}</a>
            {ctx.caps.has("contacts.delete") && <form action={anonymizeAction.bind(null, id)} className="col" style={{ gap: 6 }}><input type="hidden" name="locale" value={locale} />
              <label className="row" style={{ gap: 8, fontSize: 12 }}><input type="checkbox" className="ck" name="confirm" required />{t("privacy.confirm")}</label><button className="btn sm danger">{t("privacy.erase")}</button></form>}
            <p className="note">{t("privacy.hint")}</p></div></div>
        )}
      </div>

      <div className="col" style={{ gap: 16 }}>
        <div className="card"><h2>{t("activityTitle")}</h2><div className="card-b col" style={{ gap: 14 }}>
          <form action={addNoteAction.bind(null, id)} className="col" style={{ gap: 6 }}>
            <input type="hidden" name="locale" value={locale} />
            <textarea name="text" className="input" placeholder={t("addNote")} required maxLength={2000} style={{ minHeight: 56 }} />
            <button className="btn sm" style={{ alignSelf: "flex-end" }}>{t("addNoteBtn")}</button>
          </form>
          <div className="tl">
            {events.length === 0 && <p className="muted">{tv("noEvents")}</p>}
            {events.map((e) => (
              <div key={e.key} className="tl-i" style={{ gridTemplateColumns: "28px 1fr auto" }}>
                <span className={`tl-d ${e.tone}`}>{e.icon}</span>
                <div style={{ minWidth: 0 }}><b>{e.title}</b>{e.sub && <p>{e.sub}</p>}</div><time>{dateShort(locale, e.at)}</time>
              </div>
            ))}
          </div>
        </div></div>
        <div className="card"><h2>{t("shares")}</h2><div className="card-b col" style={{ gap: 8 }}>
          {data.shares.length === 0 ? <p className="muted">{t("noShares")}</p> : data.shares.map((s) => (
            <div key={s.id} className="row" style={{ gap: 10 }}><Badge tone={s.status === "sent" ? "ok" : s.status === "dry_run" ? "warn" : s.status === "failed" ? "bad" : ""}>{ts(`result.${s.status === "sent" ? "sent" : s.status}`)}</Badge><span className="grow">{t("sharesLine", { n: s.n, channel: s.channel })}</span>{s.opened_at && <Badge tone="sig">{t("opened")}</Badge>}<span className="note">{dateShort(locale, s.created_at)}</span></div>
          ))}</div></div>
      </div>

      <div className="col" style={{ gap: 16 }}>
        {nextAction && <div className="card"><h2><Sparkles size={15} aria-hidden style={{ color: "var(--signal-text)" }} />{tv("next.title")}</h2><div className="card-b col" style={{ gap: 10 }}>
          <div><b style={{ fontWeight: 500 }}>{nextAction.title}</b><p className="note">{nextAction.sub}</p></div>
          <div className="row wrap">{phone && <a className="btn sm pri" href={`tel:${phone}`}><Phone size={13} aria-hidden />{t("call")}</a>}{phone && <a className="btn sm" href={`https://wa.me/${phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={13} aria-hidden />WhatsApp</a>}<Link className="btn sm" href="/agenda"><CalendarPlus size={13} aria-hidden />{tv("next.visit")}</Link></div>
        </div></div>}
        {ins.selection.length > 0 && <div className="card"><h2>{tv("sel.title")}<span className="cnt-b">{ins.selection.length}</span></h2>
          {ins.selection.map((p) => (
            <Link key={p.id} href={`/properties/${p.id}`} className="sel-i"><span className="thumb"><Cover path={p.cover_thumb} /></span>
              <div style={{ minWidth: 0 }}><b className="trunc">{p.street ?? p.reference}{p.city_fr ? ` · ${cityName({ name_fr: p.city_fr, name_he: p.city_he, name_en: p.city_en }, locale)}` : ""}</b><small className="tab">{money(locale, p.price, p.currency)} · {p.visit_at ? tv("sel.visited", { d: dateShort(locale, p.visit_at) }) : tv("sel.sent", { d: dateShort(locale, p.sent_at) })}</small></div>
              {p.opened_at ? <Badge tone="sig"><Eye size={11} aria-hidden />{tv("sel.opened")}</Badge> : <Badge>{tv("sel.notOpened")}</Badge>}
            </Link>))}
        </div>}
        {ins.deal && <div className="card"><h2><Handshake size={15} aria-hidden />{tv("deal.title")}<Link href={`/deals?deal=${ins.deal.id}`} className="sp">{tv("deal.open")}</Link></h2><div className="card-b col" style={{ gap: 8 }}>
          <div className="row"><b style={{ fontWeight: 500 }} className="grow">{pickName(ins.deal.stage, locale)}</b><span className="tab strong">{money(locale, ins.deal.value, ins.deal.currency)}</span></div>
          <div className="progress" role="img" aria-label={tv("deal.step", { i: ins.deal.idx, n: ins.deal.total })}>{Array.from({ length: Number(ins.deal.total) }, (_, i) => <i key={i} className={i < Number(ins.deal!.idx) ? "on" : ""} />)}</div>
          <div className="note">{tv("deal.since", { days: Number(ins.deal.days), fee: money(locale, Number(ins.deal.value ?? 0) * Number(ins.deal.fee_pct ?? 0) / 100) })}</div>
        </div></div>}
        <div className="card"><h2><Sparkles size={15} aria-hidden />{ts("matchingProperties")}<span className="badge sig">{items.length}</span></h2>
          <SendForm mode="contact" fixedId={id} items={items} waApi={await hasWhatsApp(ctx)} /></div>
        <div className="card"><h2>{t("tasks")}</h2><div className="card-b col" style={{ gap: 8 }}>
          {data.tasks.map((k) => (
            <form key={k.id} action={toggleTaskAction.bind(null, k.id, !k.done_at)} className="row" style={{ gap: 8 }}>
              <input type="hidden" name="locale" value={locale} />
              <button className={`cb ${k.done_at ? "on" : ""}`} style={{ width: 20, height: 20, cursor: "pointer" }} aria-label={t("toggleTask")}>{k.done_at ? "✓" : ""}</button>
              <span className="grow" style={k.done_at ? { textDecoration: "line-through", color: "var(--text-muted)" } : undefined}>{k.title}</span>
              {k.due_at && <span className="note">{dateShort(locale, k.due_at)}</span>}
            </form>
          ))}
          {ctx.caps.has("tasks.write") && (
            <form action={addTaskAction.bind(null, id)} className="col" style={{ gap: 6 }}>
              <input type="hidden" name="locale" value={locale} />
              <input name="title" className="input" placeholder={t("newTask")} required maxLength={200} />
              <div className="row" style={{ gap: 6 }}><input name="due" type="date" className="input grow" aria-label={t("due")} /><button className="btn icon" aria-label={tc("add")}><Plus size={15} aria-hidden /></button></div>
            </form>
          )}
        </div></div>
        {ctx.caps.has("deals.write") && (
          <div className="card"><h2><Handshake size={15} aria-hidden />{t("deals")}</h2><div className="card-b col" style={{ gap: 10 }}>
            {data.deals.map((d) => <div key={d.id} className="row"><Badge tone={d.kind === "won" ? "ok" : d.kind === "lost" ? "bad" : "acc"}>{pickName(d.stage_name, locale)}</Badge><span className="sp tab">{money(locale, d.value, d.currency)}</span></div>)}
            <form action={openDealAction.bind(null, id)} className="row" style={{ gap: 6 }}>
              <input type="hidden" name="locale" value={locale} />
              <input name="value" type="number" min="0" step="10000" className="input grow" placeholder={t("dealValue")} />
              <button className="btn sm" style={{ height: 36 }}>{t("openDeal")}</button>
            </form>
          </div></div>
        )}
      </div>
    </div>
  );
}
