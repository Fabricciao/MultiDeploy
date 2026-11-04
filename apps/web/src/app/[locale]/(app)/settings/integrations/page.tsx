import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCtx } from "@/lib/session";
import { listIntegrations } from "@/lib/data/integrations";
import { dateShort } from "@/lib/format";
import { Badge, PageHeader } from "@/components/ui";
import { SettingsNav } from "@/components/settings-nav";
import { createHookAction, deleteHookAction, revokeKeyAction } from "./actions";
import { CreateKeyForm } from "@/components/create-key-form";

export default async function IntegrationsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ err?: string; ok?: string }> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("integrations");
  if (!ctx.caps.has("api.manage")) return (<><PageHeader title={t("title")} /><SettingsNav active="integrations" caps={[...ctx.caps]} /><p className="muted">{t("forbidden")}</p></>);
  const h = await headers(); const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const { keys, hooks } = ctx.features.has("api") ? await listIntegrations(ctx) : { keys: [], hooks: [] };
  return (
    <>
      <PageHeader title={t("title")} sub={t("sub")} />
      <SettingsNav active="integrations" caps={[...ctx.caps]} />
      {!ctx.features.has("api") && <div role="alert" className="card card-b" style={{ marginBottom: 12, borderColor: "var(--warn)" }}>{t("errors.plan")}</div>}
      {sp.err && sp.err !== "plan" && <div role="alert" className="card card-b err" style={{ marginBottom: 12 }}>{t(`errors.${["forbidden", "scopes", "invalid_url", "blocked"].includes(sp.err) ? sp.err : "forbidden"}`)}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 20, alignItems: "start" }} className="split">
        <div className="col" style={{ gap: 16 }}>
          <section className="card"><h2>{t("keys")}</h2><div className="card-b col" style={{ gap: 10 }}>
            {keys.map((k) => <form key={k.id} action={revokeKeyAction.bind(null, k.id)} className="row" style={{ gap: 8, opacity: k.revoked_at ? 0.5 : 1 }}><input type="hidden" name="locale" value={locale} /><div className="grow"><b style={{ fontWeight: 500 }}>{k.name}</b> <span className="ltr note">{k.key_prefix}…</span><div className="note">{(k.scopes as string[]).join(", ")} · {k.last_used_at ? t("lastUsed", { date: dateShort(locale, k.last_used_at) }) : t("neverUsed")}</div></div>{k.revoked_at ? <Badge tone="bad">{t("revoked")}</Badge> : <button className="btn sm">{t("revoke")}</button>}</form>)}
            <CreateKeyForm locale={locale} enabled={ctx.features.has("api")} border={keys.length > 0} />
          </div></section>
          <section className="card"><h2>{t("embedTitle")}</h2><div className="card-b col" style={{ gap: 8 }}><p className="note">{t("embedHint")}</p>
            <pre dir="ltr" style={{ margin: 0, padding: 10, background: "var(--sunken)", borderRadius: 6, fontSize: 12, overflow: "auto" }}>{`<iframe src="${origin}/${locale}/embed/${ctx.orgSlug}" width="100%" height="900" style="border:0" loading="lazy"></iframe>`}</pre></div></section>
        </div>
        <section className="card"><h2>{t("webhooks")}</h2><div className="card-b col" style={{ gap: 10 }}>
          {hooks.map((w) => <form key={w.id} action={deleteHookAction.bind(null, w.id)} className="col" style={{ gap: 4 }}><input type="hidden" name="locale" value={locale} /><div className="row" style={{ gap: 8 }}><span className="ltr grow" style={{ wordBreak: "break-all" }}>{w.url}</span><button className="btn sm ghost">{t("delete")}</button></div><div className="note">{(w.events as string[]).join(", ")} · {t("deliveries", { ok: w.delivered, ko: w.failed })}</div><div className="note ltr">secret: {String(w.secret).slice(0, 6)}…</div></form>)}
          <form action={createHookAction} className="col" style={{ gap: 8, borderTop: hooks.length ? "1px solid var(--line)" : 0, paddingTop: hooks.length ? 10 : 0 }}>
            <input type="hidden" name="locale" value={locale} /><input name="url" className="input" dir="ltr" placeholder="https://example.com/hooks/multideploy" aria-label="URL" />
            {["property.created", "contact.created", "deal.stage_changed"].map((e) => <label key={e} className="row" style={{ gap: 8 }}><input type="checkbox" className="ck" name={`e_${e}`} defaultChecked /><span className="ltr">{e}</span></label>)}
            <button className="btn pri" disabled={!ctx.features.has("api")}>{t("addHook")}</button><p className="note">{t("hookHint")}</p></form>
        </div></section>
      </div>
    </>
  );
}
