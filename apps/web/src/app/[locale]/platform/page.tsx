import { getTranslations, setRequestLocale } from "next-intl/server";
import { sql } from "@/lib/db";
import { listOrgs } from "@/lib/platform";
import { billingState } from "@/lib/billing/state";
import { pickName } from "@/lib/data/types";
import { dateShort, num } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { Badge, PageHeader } from "@/components/ui";
import { createAgencyAction } from "./actions";

export default async function PlatformHome({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ err?: string; ok?: string; q?: string; f?: string }> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("platform");
  const [all, plans] = await Promise.all([listOrgs(), sql`select key, name from public.plans order by position`]);
  const withBilling = all.map((o) => Object.assign({}, o, { bs: billingState(o.plan, o.paid_until) }) as Record<string, any> & { bs: ReturnType<typeof billingState> });
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 60), f = ["trial", "paid", "expiring", "overdue", "unset", "suspended"].includes(sp.f ?? "") ? sp.f! : "";
  const orgs = withBilling.filter((o) => (!q || `${o.slug} ${o.name_fr} ${o.name_he} ${o.name_en} ${o.owner_email ?? ""}`.toLowerCase().includes(q)) && (!f || (f === "suspended" ? o.status !== "active" : o.bs === f)));
  const active = all.filter((o) => o.status === "active");
  const cnt = (k: string) => withBilling.filter((o) => (k === "suspended" ? o.status !== "active" : o.bs === k)).length;
  const bsTone = (b: string) => (b === "paid" ? "ok" : b === "overdue" ? "bad" : b === "expiring" ? "warn" : b === "trial" ? "acc" : "");
  const kpi = (l: string, v: React.ReactNode) => <div className="card card-b"><div className="note">{l}</div><div className="tab" style={{ fontSize: 24, fontWeight: 600, marginTop: 2 }}>{v}</div></div>;
  return (
    <>
      <PageHeader title={t("agencies")} sub={t("count", { count: all.length })} />
      {sp.err && <div role="alert" className="card card-b err" style={{ marginBottom: 12 }}>{t(`errors.${sp.err}`)}</div>}
      {sp.ok && <div role="status" className="card card-b" style={{ marginBottom: 12, color: "var(--ok)" }}>{t(`ok.${sp.ok === "purged" ? "purged" : "created"}`)}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 16 }}>
        {kpi(t("kpi.active"), active.length)}{kpi(t("billingStates.expiring"), cnt("expiring"))}{kpi(t("billingStates.overdue"), cnt("overdue"))}{kpi(t("billingStates.trial"), cnt("trial"))}{kpi(t("kpi.users"), num(locale, orgs.reduce((a, o) => a + o.seats, 0), 0))}{kpi(t("kpi.properties"), num(locale, orgs.reduce((a, o) => a + o.properties, 0), 0))}{kpi(t("kpi.contacts"), num(locale, orgs.reduce((a, o) => a + o.contacts, 0), 0))}
      </div>
      <form className="row" style={{ gap: 8, marginBottom: 12, flexWrap: "wrap" }} role="search"><input name="q" defaultValue={sp.q ?? ""} className="input" style={{ maxWidth: 260 }} placeholder={t("search")} aria-label={t("search")} />
        <select name="f" defaultValue={f} className="input" style={{ maxWidth: 220 }} aria-label={t("filter")}><option value="">{t("allAgencies")}</option>{["trial", "paid", "expiring", "overdue", "unset", "suspended"].map((k) => <option key={k} value={k}>{k === "suspended" ? t("statuses.suspended") : t(`billingStates.${k}`)} ({cnt(k)})</option>)}</select><button className="btn">{t("apply")}</button></form>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 20, alignItems: "start" }} className="split">
        <div className="card" style={{ overflow: "hidden" }}><div style={{ overflowX: "auto" }}><table className="tbl">
          <thead><tr><th>{t("agency")}</th><th>{t("plan")}</th><th>{t("billing")}</th><th>{t("owner")}</th><th>{t("seats")}</th><th>{t("storage")}</th><th>{t("credits")}</th><th>{t("status")}</th><th>{t("lastActivity")}</th></tr></thead>
          <tbody>{orgs.map((o) => (
            <tr key={o.id}>
              <td><Link href={`/platform/${o.id}`} style={{ fontWeight: 500 }}>{pickName({ fr: o.name_fr, he: o.name_he, en: o.name_en }, locale) || o.slug}</Link><div className="note ltr">{o.slug}</div></td>
              <td><Badge tone="acc">{o.plan}</Badge></td><td><Badge tone={bsTone(o.bs) as "ok"}>{t(`billingStates.${o.bs}`)}</Badge>{o.paid_until && <div className="note tab">{dateShort(locale, o.paid_until)}</div>}</td><td className="note ltr">{o.owner_email ?? "—"}</td><td className="tab">{o.seats} / {o.seat_limit}<div className="note">{Object.entries(o.roles as Record<string, number>).map(([r, n]) => `${n} ${r}`).join(" · ")}</div></td>
              <td style={{ minWidth: 100 }}><div className="bar"><i style={{ width: `${Math.min(100, (Number(o.storage_bytes) / 1048576 / o.storage_limit_mb) * 100)}%` }} /></div><div className="note tab">{num(locale, Number(o.storage_bytes) / 1048576, 1)} / {o.storage_limit_mb} MB</div></td>
              <td className="tab">{num(locale, o.credits, 0)}</td>
              <td><Badge tone={o.status === "active" ? "ok" : "bad"}><i className="dot" />{t(`statuses.${o.status}`)}</Badge></td>
              <td className="muted">{dateShort(locale, o.last_activity ?? o.created_at)}</td>
            </tr>))}</tbody></table></div></div>
        <form action={createAgencyAction} className="card"><h2>{t("create")}</h2><div className="card-b col" style={{ gap: 10 }}>
          <input type="hidden" name="locale" value={locale} />
          <input name="name_fr" className="input" placeholder={t("nameFr")} aria-label={t("nameFr")} /><input name="name_he" className="input" dir="rtl" placeholder={t("nameHe")} aria-label={t("nameHe")} /><input name="name_en" className="input" placeholder={t("nameEn")} aria-label={t("nameEn")} />
          <input name="slug" className="input" dir="ltr" placeholder="slug" required pattern="[a-z0-9][a-z0-9\-]{1,30}[a-z0-9]" aria-label="slug" />
          <input name="owner_email" type="email" className="input" dir="ltr" placeholder={t("ownerEmail")} required aria-label={t("ownerEmail")} />
          <div className="row" style={{ gap: 8 }}><select name="default_locale" className="input" aria-label={t("defaultLocale")}><option value="fr">FR</option><option value="he">עב</option><option value="en">EN</option></select>
            <select name="plan" className="input" defaultValue="trial" aria-label={t("plan")}>{plans.map((p) => <option key={p.key} value={p.key}>{pickName(p.name, locale)}</option>)}</select></div>
          <button className="btn pri">{t("createBtn")}</button><p className="note">{t("createHint")}</p>
        </div></form>
      </div>
    </>
  );
}
