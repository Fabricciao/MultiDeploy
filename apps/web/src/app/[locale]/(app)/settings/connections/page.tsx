import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCtx } from "@/lib/session";
import { listConnections, getGoogle } from "@/lib/data/connections";
import { cryptoConfigured } from "@/lib/crypto";
import { googleConfigured } from "@/lib/integrations/google";
import { Badge, PageHeader } from "@/components/ui";
import { SettingsNav } from "@/components/settings-nav";
import { removeConnectionAction, removeGoogleAction, saveConnectionAction } from "./actions";

export default async function ConnectionsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ err?: string; ok?: string; g?: string }> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("connections");
  const caps = [...ctx.caps];
  if (!ctx.caps.has("org.manage")) return (<><PageHeader title={t("title")} /><SettingsNav active="connections" caps={caps} /><p className="muted">{t("forbidden")}</p></>);
  const conns = await listConnections(ctx); const by = new Map(conns.map((c) => [c.provider, c]));
  const google = await getGoogle(ctx.userId);
  const key = cryptoConfigured();
  const err = sp.err ? (["forbidden", "invalid", "no_key"].includes(sp.err) ? sp.err : "forbidden") : null;
  const Field = ({ name, label, secret = false, ph }: { name: string; label: string; secret?: boolean; ph?: string }) => <label className="col" style={{ gap: 4 }}><span className="note">{label}</span><input name={name} className="input" dir="ltr" autoComplete="off" type={secret ? "password" : "text"} placeholder={ph} required={name !== "template" && name !== "lang" && name !== "display"} /></label>;
  const Card = ({ p, title, hint, children }: { p: "whatsapp" | "facebook" | "instagram"; title: string; hint: string; children: React.ReactNode }) => {
    const c = by.get(p);
    return (
      <section className="card"><h2 className="row" style={{ gap: 8 }}>{title} {c && <Badge tone={c.status === "connected" ? "ok" : "bad"}>{t(c.status === "connected" ? "connected" : "error")}</Badge>}</h2>
        <div className="card-b col" style={{ gap: 10 }}><p className="note">{hint}</p>
          {c && <form action={removeConnectionAction.bind(null, p)} className="row" style={{ gap: 8 }}><input type="hidden" name="locale" value={locale} /><span className="note grow ltr">{Object.values(c.public_meta).filter(Boolean).join(" · ")}</span><button className="btn sm ghost">{t("disconnect")}</button></form>}
          <form action={saveConnectionAction.bind(null, p)} className="col" style={{ gap: 8, borderTop: c ? "1px solid var(--line)" : 0, paddingTop: c ? 10 : 0 }}>
            <input type="hidden" name="locale" value={locale} />{children}
            <button className="btn pri" disabled={!key}>{t(c ? "replace" : "connect")}</button></form>
        </div></section>
    );
  };
  return (
    <>
      <PageHeader title={t("title")} sub={t("sub")} />
      <SettingsNav active="connections" caps={caps} />
      {!key && <div role="alert" className="card card-b" style={{ marginBottom: 12, borderColor: "var(--warn)" }}>{t("errors.no_key")}</div>}
      {err && err !== "no_key" && <div role="alert" className="card card-b err" style={{ marginBottom: 12 }}>{t(`errors.${err}`)}</div>}
      {sp.ok && <div role="status" className="card card-b" style={{ marginBottom: 12 }}>{t("saved")}</div>}
      {sp.g && <div role="status" className="card card-b" style={{ marginBottom: 12 }}>{t(sp.g === "ok" ? "googleOk" : "googleFail")}</div>}
      <div className="col" style={{ gap: 16, maxWidth: 720 }}>
        <Card p="whatsapp" title="WhatsApp Business" hint={t("waHint", { feature: ctx.features.has("whatsapp_api") ? t("planOk") : t("planNo") })}>
          <Field name="phoneNumberId" label="Phone number ID" ph="1234567890" /><Field name="accessToken" label="Access token" secret /><Field name="template" label={t("waTemplate")} /><Field name="lang" label={t("waLang")} ph="fr" /><Field name="display" label={t("waDisplay")} ph="+972…" />
        </Card>
        <Card p="facebook" title="Facebook" hint={t("fbHint")}><Field name="pageId" label="Page ID" /><Field name="accessToken" label="Page access token" secret /></Card>
        <Card p="instagram" title="Instagram" hint={t("igHint")}><Field name="igUserId" label="Instagram user ID" /><Field name="accessToken" label="Access token" secret /></Card>
        <section className="card"><h2 className="row" style={{ gap: 8 }}>Google Calendar {google && <Badge tone="ok">{t("connected")}</Badge>}</h2>
          <div className="card-b col" style={{ gap: 10 }}><p className="note">{t("gHint")}</p>
            {!googleConfigured() ? <p className="note">{t("gNotConfigured")}</p> : google
              ? <form action={removeGoogleAction}><input type="hidden" name="locale" value={locale} /><button className="btn sm ghost">{t("disconnect")}</button></form>
              : <a className="btn pri" href={`/api/integrations/google/start?locale=${locale}`}>{t("connect")}</a>}
          </div></section>
      </div>
    </>
  );
}
