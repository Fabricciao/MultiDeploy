import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, Handshake, Mail, MessageCircle, Pencil, Phone, Plus, Send, Sparkles, StickyNote } from "lucide-react";
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
  const actLabel = (a: Record<string, any>) => (a.kind === "note" ? a.summary : a.kind === "share" ? t("activity.share", { channel: a.summary }) : a.kind === "stage_change" ? t("activity.stage_change") : t(`activity.${a.summary}`));
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
  return (
    <div className="client">
      <div className="col" style={{ gap: 16 }}>
        <div className="card card-b">
          <div className="row gap12"><Avatar text={initials(name)} cls="lg" /><div className="grow"><h1 className="t-page" style={{ fontSize: 22, lineHeight: "27px" }}>{name}</h1></div><Link href={`/clients/${id}/edit`} className="btn sm"><Pencil size={13} aria-hidden />{tc("edit")}</Link></div>
          <div className="row wrap" style={{ gap: 6, marginBlockStart: 10 }}>
            {(c.kinds as string[]).map((k) => <Badge key={k} tone="acc">{t(`kind.${k}`)}</Badge>)}
            {c.aliyah_status && c.aliyah_status !== "none" && <Badge>{t(`aliyah.${c.aliyah_status}`)}</Badge>}
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
          {c.notes && <p style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{c.notes}</p>}
        </div></div>
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
            {data.activities.map((a) => (
              <div key={a.id} className="tl-i" style={{ gridTemplateColumns: "28px 1fr" }}>
                <span className={`tl-d ${a.kind === "share" ? "acc" : ""}`}>{icon(a.kind)}</span>
                <div><b>{actLabel(a)}</b><p>{dateTime(locale, a.occurred_at)}{a.actor_name ? ` · ${a.actor_name}` : ""}</p></div>
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
