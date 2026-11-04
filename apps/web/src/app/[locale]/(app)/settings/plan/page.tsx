import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, X } from "lucide-react";
import { getCtx } from "@/lib/session";
import { getPlanOverview } from "@/lib/data/plan";
import { stripeConfigured } from "@/lib/billing/stripe";
import { pickName } from "@/lib/data/types";
import { dateShort, num } from "@/lib/format";
import { Badge, PageHeader } from "@/components/ui";
import { SettingsNav } from "@/components/settings-nav";
import { checkoutAction, portalAction } from "./actions";

const FEATURES = ["custom_domain", "white_label", "whatsapp_api", "api", "creative_posters"] as const;
export default async function PlanPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ err?: string; ok?: string }> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("plan");
  if (!ctx.caps.has("billing.manage")) return (<><PageHeader title={t("title")} /><SettingsNav active="plan" caps={[...ctx.caps]} /><p className="muted">{t("forbidden")}</p></>);
  const { org, usage, plans } = await getPlanOverview(ctx);
  const bar = (v: number, max: number) => <div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${Math.min(100, (v / Math.max(1, max)) * 100)}%`, background: v / max > 0.9 ? "var(--warn)" : undefined }} /></div>;
  const mb = Number(usage.storage_bytes) / 1048576;
  return (
    <>
      <PageHeader title={t("title")} sub={t("current", { plan: pickName(org.name, locale) })} />
      <SettingsNav active="plan" caps={[...ctx.caps]} />
      {sp.err && <div role="alert" className="card card-b err" style={{ marginBottom: 12 }}>{t(`errors.${sp.err === "forbidden" ? "forbidden" : "billing_unavailable"}`)}</div>}
      {sp.ok && <div role="status" className="card card-b" style={{ marginBottom: 12, color: "var(--ok)" }}>{t("thanks")}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, marginBottom: 16 }}>
        <div className="card card-b"><div className="note">{t("seats")}</div><div className="tab" style={{ fontSize: 22, fontWeight: 600 }}>{usage.seats} / {org.seat_limit}</div>{bar(usage.seats, org.seat_limit)}</div>
        <div className="card card-b"><div className="note">{t("storage")}</div><div className="tab" style={{ fontSize: 22, fontWeight: 600 }}>{num(locale, mb, 1)} / {org.storage_limit} MB</div>{bar(mb, org.storage_limit)}</div>
        <div className="card card-b"><div className="note">{t("credits")}</div><div className="tab" style={{ fontSize: 22, fontWeight: 600 }}>{num(locale, usage.credits, 0)}</div><div className="note">{t("monthly", { n: org.ai_credits_monthly })}</div></div>
        <div className="card card-b"><div className="note">{t("subscription")}</div><div style={{ marginTop: 4 }}><Badge tone={org.sub_status === "active" ? "ok" : org.sub_status === "past_due" ? "bad" : "warn"}>{t(`subStatus.${org.sub_status ?? "trialing"}`)}</Badge></div>{org.current_period_end && <div className="note" style={{ marginTop: 6 }}>{t("renews", { date: dateShort(locale, org.current_period_end) })}</div>}
          {org.customer_id && stripeConfigured() && <form action={portalAction} style={{ marginTop: 8 }}><input type="hidden" name="locale" value={locale} /><button className="btn sm">{t("manageBilling")}</button></form>}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
        {plans.filter((p) => p.key !== "trial").map((p) => (
          <div key={p.key} className="card" style={{ borderColor: p.key === org.plan ? "var(--accent)" : undefined }}><div className="card-b col" style={{ gap: 10 }}>
            <div className="row"><b style={{ fontSize: 16 }}>{pickName(p.name, locale)}</b>{p.key === org.plan && <Badge tone="acc">{t("yourPlan")}</Badge>}</div>
            <div className="note">{p.price_monthly_ils ? t("price", { price: num(locale, p.price_monthly_ils, 0) }) : t("priceOnQuote")}</div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6, fontSize: 13 }}>
              <li>{t("limitSeats", { n: p.seats })}</li><li>{t("limitStorage", { n: p.storage_mb / 1000 })}</li><li>{t("limitCredits", { n: p.ai_credits_monthly })}</li>
              {FEATURES.map((f) => <li key={f} className="row" style={{ gap: 6, opacity: p.features[f] ? 1 : 0.5 }}>{p.features[f] ? <Check size={14} color="var(--ok)" aria-hidden /> : <X size={14} aria-hidden />}{t(`features.${f}`)}</li>)}
            </ul>
            {p.key !== org.plan && <form action={checkoutAction}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="plan" value={p.key} /><button className="btn pri" style={{ width: "100%" }}>{t("choose")}</button></form>}
          </div></div>))}
      </div>
      {!stripeConfigured() && <p className="note" style={{ marginTop: 12 }}>{t("notConfigured")}</p>}
    </>
  );
}
