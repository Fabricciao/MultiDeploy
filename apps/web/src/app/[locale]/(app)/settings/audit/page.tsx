import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCtx, db } from "@/lib/session";
import { dateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { SettingsNav } from "@/components/settings-nav";

export default async function AuditPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ entity?: string }> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("audit");
  if (!ctx.caps.has("audit.read")) return (<><PageHeader title={t("title")} /><SettingsNav active="audit" caps={[...ctx.caps]} /><p className="muted">{t("forbidden")}</p></>);
  const entity: string | null = ["contacts", "properties", "deals", "organizations", "support_session"].includes(sp.entity ?? "") ? (sp.entity as string) : null;
  const rows = await db(ctx, (tx) => tx`select a.id, a.action, a.entity, a.at, u.full_name as actor, left(coalesce(a.diff->'new'->>'reference', a.diff->>'reference', a.diff->'new'->>'first_name', a.diff->>'first_name', ''), 60) as label
    from public.audit_log a left join public.profiles u on u.id = a.actor_id where (${entity}::text is null or a.entity = ${entity}) order by a.at desc limit 200`);
  return (
    <>
      <PageHeader title={t("title")} sub={t("sub")} /><SettingsNav active="audit" caps={[...ctx.caps]} />
      <form method="get" className="row" style={{ marginBottom: 12, gap: 8 }}><select name="entity" defaultValue={entity ?? ""} className="input" style={{ width: 200 }} aria-label={t("entity")}><option value="">{t("all")}</option>{["contacts", "properties", "deals", "support_session"].map((e) => <option key={e} value={e}>{e}</option>)}</select><button className="btn">{t("filter")}</button></form>
      <div className="card" style={{ overflow: "hidden" }}><table className="tbl"><thead><tr><th>{t("when")}</th><th>{t("who")}</th><th>{t("action")}</th><th>{t("entity")}</th><th>{t("detail")}</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td className="muted tab">{dateTime(locale, r.at)}</td><td>{r.actor ?? "—"}</td><td><span className="badge">{r.action}</span></td><td>{r.entity}</td><td className="muted">{r.label}</td></tr>)}</tbody></table></div>
    </>
  );
}
