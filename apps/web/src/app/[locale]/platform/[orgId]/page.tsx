import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Eye } from "lucide-react";
import { sql } from "@/lib/db";
import { getOrg } from "@/lib/platform";
import { pickName } from "@/lib/data/types";
import { dateTime, num } from "@/lib/format";
import { Badge, PageHeader } from "@/components/ui";
import { orgAction, startImpersonation } from "../actions";

export default async function PlatformOrg({ params, searchParams }: { params: Promise<{ locale: string; orgId: string }>; searchParams: Promise<{ err?: string; ok?: string }> }) {
  const { locale, orgId } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) notFound();
  const d = await getOrg(orgId);
  if (!d) notFound();
  const t = await getTranslations("platform");
  const plans = await sql`select key, name from public.plans order by position`;
  const { org, members, log, usage } = d;
  const feats = (org.settings?.features ?? {}) as Record<string, boolean>;
  const f = (name: string, orgId2: string) => <form key={name} action={orgAction.bind(null, orgId2)} className="row" style={{ gap: 8 }} />;
  void f;
  return (
    <>
      <PageHeader title={pickName({ fr: org.name_fr, he: org.name_he, en: org.name_en }, locale) || org.slug} sub={`${org.slug} · ${org.plan}`}>
        <Badge tone={org.status === "active" ? "ok" : "bad"}>{t(`statuses.${org.status}`)}</Badge>
        <form action={startImpersonation.bind(null, orgId)}><input type="hidden" name="locale" value={locale} /><button className="btn"><Eye size={15} aria-hidden />{t("impersonate")}</button></form>
      </PageHeader>
      {sp.err && <div role="alert" className="card card-b err" style={{ marginBottom: 12 }}>{t(`errors.${sp.err}`)}</div>}
      {sp.ok && <div role="status" className="card card-b" style={{ marginBottom: 12, color: "var(--ok)" }}>{t("ok.saved")}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 380px", gap: 20, alignItems: "start" }} className="split">
        <div className="col" style={{ gap: 16 }}>
          <div className="card"><h2>{t("usage")}</h2><div className="card-b"><div className="kv">
            <div><div className="k">{t("seats")}</div><div className="v tab">{members.filter((m) => m.status === "active").length} / {usage.seat_limit}</div></div>
            <div><div className="k">{t("kpi.properties")}</div><div className="v tab">{usage.properties}</div></div><div><div className="k">{t("kpi.contacts")}</div><div className="v tab">{usage.contacts}</div></div>
            <div><div className="k">{t("storage")}</div><div className="v tab">{num(locale, Number(usage.storage_bytes) / 1048576, 1)} / {usage.storage_limit_mb} MB</div></div>
            <div><div className="k">{t("credits")}</div><div className="v tab">{num(locale, usage.credits, 0)}</div></div></div></div></div>
          <div className="card"><h2>{t("team")}</h2><div className="card-b col" style={{ gap: 8 }}>{members.map((m) => <div key={m.user_id} className="row"><span style={{ fontWeight: 500 }}>{m.full_name}</span><span className="note ltr">{m.email}</span><Badge>{m.role}</Badge><span className="sp"><Badge tone={m.status === "active" ? "ok" : "bad"}>{m.status}</Badge></span></div>)}</div></div>
          <div className="card"><h2>{t("journal")}</h2><div className="card-b col" style={{ gap: 6 }}>{log.length === 0 ? <span className="muted">—</span> : log.map((l, i) => <div key={i} className="row note"><b style={{ fontWeight: 500 }}>{l.action}</b><span className="sp">{dateTime(locale, l.at)}</span></div>)}</div></div>
        </div>
        <div className="col" style={{ gap: 16 }}>
          <form action={orgAction.bind(null, orgId)} className="card"><div className="card-b col" style={{ gap: 10 }}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="op" value="plan" />
            <div className="lbl">{t("plan")}</div><div className="row" style={{ gap: 8 }}><select name="plan" defaultValue={org.plan} className="input">{plans.map((p) => <option key={p.key} value={p.key}>{pickName(p.name, locale)}</option>)}</select><button className="btn">OK</button></div></div></form>
          <form action={orgAction.bind(null, orgId)} className="card"><div className="card-b col" style={{ gap: 10 }}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="op" value="credits" />
            <div className="lbl">{t("grantCredits")}</div><div className="row" style={{ gap: 8 }}><input name="amount" type="number" className="input" style={{ width: 90 }} defaultValue={20} /><input name="reason" className="input grow" placeholder={t("reason")} /><button className="btn">OK</button></div></div></form>
          <form action={orgAction.bind(null, orgId)} className="card"><h2>{t("overrides")}</h2><div className="card-b col" style={{ gap: 10 }}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="op" value="overrides" />
            <div className="row" style={{ gap: 8 }}><input name="seats" type="number" className="input" placeholder={t("seats")} defaultValue={org.settings?.seats_override ?? ""} /><input name="storage" type="number" className="input" placeholder="MB" defaultValue={org.settings?.storage_override ?? ""} /></div>
            {["custom_domain", "white_label", "whatsapp_api", "api", "creative_posters"].map((k) => <label key={k} className="row" style={{ gap: 8 }}><input type="checkbox" className="ck" name={`f_${k}`} defaultChecked={!!feats[k]} />{t(`features.${k}`)}</label>)}
            <button className="btn">{t("save")}</button></div></form>
          <form action={orgAction.bind(null, orgId)} className="card"><div className="card-b"><input type="hidden" name="locale" value={locale} /><input type="hidden" name="op" value={org.status === "active" ? "suspend" : "activate"} />
            <button className={`btn ${org.status === "active" ? "danger" : ""}`} style={{ width: "100%" }}>{org.status === "active" ? t("suspend") : t("reactivate")}</button></div></form>
          <form action={orgAction.bind(null, orgId)} className="card" style={{ borderColor: "var(--bad)" }}><h2 style={{ color: "var(--bad)" }}>{t("danger")}</h2><div className="card-b col" style={{ gap: 8 }}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="op" value="purge" />
            <p className="note">{t("purgeHint", { slug: org.slug })}</p><input name="confirm" className="input" dir="ltr" placeholder={org.slug} autoComplete="off" /><button className="btn danger">{t("purge")}</button></div></form>
        </div>
      </div>
    </>
  );
}
