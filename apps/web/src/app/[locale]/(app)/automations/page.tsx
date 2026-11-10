import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlarmClock, Check, Clock, Handshake, Play, ShieldCheck, Snowflake, UserRoundSearch } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCtx } from "@/lib/session";
import { getAutomations, RULES, type Rule } from "@/lib/data/automations";
import { dateShort } from "@/lib/format";
import { Badge, PageHeader } from "@/components/ui";
import { runAutomationsAction, toggleAutomationAction } from "./actions";

const ICON: Record<Rule, React.ReactNode> = { mandate: <AlarmClock size={16} aria-hidden />, silent: <UserRoundSearch size={16} aria-hidden />, cold: <Snowflake size={16} aria-hidden />, deal: <Handshake size={16} aria-hidden /> };

export default async function AutomationsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ ran?: string }> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("automations");
  const a = await getAutomations(ctx);
  const canEdit = ctx.caps.has("org.manage") && !ctx.impersonating;
  const active = RULES.filter((r) => a.on[r]).length;
  const total = Object.values(a.counts).reduce((x, y) => x + y, 0);
  const href = (r: Record<string, any>) => r.deal_id ? `/deals?deal=${r.deal_id}` : r.contact_id ? `/clients/${r.contact_id}` : r.property_id ? `/properties/${r.property_id}` : "/tasks";
  return (
    <>
      <PageHeader title={t("title")} sub={t("sub", { active, total })}>
        {canEdit && active > 0 && <form action={runAutomationsAction}><input type="hidden" name="locale" value={locale} /><button className="btn"><Play size={14} aria-hidden />{t("runNow")}</button></form>}
      </PageHeader>
      {sp.ran !== undefined && <div className="banner info" role="status" style={{ marginBlockEnd: 12 }}><Check size={15} aria-hidden />{t("ran", { n: Number(sp.ran) || 0 })}</div>}
      <div className="banner info" style={{ marginBlockEnd: 12 }}><ShieldCheck size={15} aria-hidden /><span>{t("safe")}</span></div>
      {!canEdit && <p className="note" style={{ marginBlockEnd: 12 }}>{t("readOnly")}</p>}
      <div className="cock">
        <section className="card"><h2>{t("rules")}</h2>
          {RULES.map((r) => (
            <div key={r} className={`rec ${a.on[r] ? "" : "off"}`}>
              <span className="ico">{ICON[r]}</span>
              <div style={{ minWidth: 0 }}><b>{t(`r.${r}.title`)}</b><small>{t(`r.${r}.when`)}</small><small>{t(`r.${r}.then`)}</small></div>
              <span className="note tab nowrap">{a.on[r] ? t("count", { n: a.counts[r] ?? 0 }) : t("paused")}</span>
              <form action={toggleAutomationAction}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="rule" value={r} /><input type="hidden" name="on" value={a.on[r] ? "0" : "1"} />
                <button className={`swi ${a.on[r] ? "on" : ""}`} role="switch" aria-checked={a.on[r]} aria-label={t(`r.${r}.title`)} disabled={!canEdit} /></form>
            </div>
          ))}
        </section>
        <section className="card"><h2>{t("log")}<small>{t("logSub")}</small></h2>
          {a.log.length === 0 ? <p className="muted card-b">{t("logEmpty")}</p> : a.log.map((l) => (
            <Link key={l.id} href={href(l) as "/"} className="li"><span className={`tl-d ${l.done_at ? "ok" : ""}`}>{l.done_at ? <Check size={13} aria-hidden /> : <Clock size={13} aria-hidden />}</span>
              <div className="grow" style={{ minWidth: 0 }}><b className="trunc">{l.title}</b><small>{l.assignee ?? "—"} · {RULES.includes(l.rule) ? t(`r.${l.rule as Rule}.title`) : ""}</small></div>
              {l.done_at ? <Badge tone="ok">{t("done")}</Badge> : <span className="note">{dateShort(locale, l.created_at)}</span>}</Link>))}
        </section>
      </div>
    </>
  );
}
