import { getTranslations, setRequestLocale } from "next-intl/server";
import { MailPlus } from "lucide-react";
import { getCtx } from "@/lib/session";
import { AGENT_SCOPES, getAgentScopes, listTeam } from "@/lib/data/team";
import { dateShort, initials } from "@/lib/format";
import { Avatar, Badge, PageHeader } from "@/components/ui";
import { SettingsNav } from "@/components/settings-nav";
import { agentScopesAction, changeMemberAction, inviteAction, revokeAction } from "./actions";
import { Eye } from "lucide-react";

const ROLES = ["admin", "agent", "assistant", "viewer"] as const;

export default async function TeamPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ err?: string; ok?: string }> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("team");
  const tr = await getTranslations("roles");
  if (!ctx.caps.has("members.manage")) return (<><PageHeader title={t("title")} /><SettingsNav active="team" caps={[...ctx.caps]} /><p className="muted">{t("forbidden")}</p></>);
  const { members, invitations, seats } = await listTeam(ctx);
  const isOwner = ctx.role === "owner";
  const scopes = ctx.caps.has("org.manage") ? await getAgentScopes(ctx) : null;
  return (
    <>
      <PageHeader title={t("title")} sub={t("seats", { used: seats.used, limit: seats.limit })} />
      <SettingsNav active="team" caps={[...ctx.caps]} />
      {sp.err && <div role="alert" className="card card-b err" style={{ marginBottom: 12 }}>{t(`errors.${["seat_limit", "last_owner", "forbidden", "invalid_email", "already_member"].includes(sp.err) ? sp.err : "unknown"}`)}</div>}
      {sp.ok && <div role="status" className="card card-b" style={{ marginBottom: 12, color: "var(--ok)" }}>{t(`ok.${sp.ok === "invited" ? "invited" : "saved"}`)}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 20, alignItems: "start" }} className="split">
        <div className="card" style={{ overflow: "hidden" }}><table className="tbl">
          <thead><tr><th>{t("member")}</th><th>{t("role")}</th><th>{t("status")}</th><th></th></tr></thead>
          <tbody>{members.map((m) => {
            const locked = m.role === "owner" && !isOwner;
            return (
              <tr key={m.user_id}>
                <td><div className="row" style={{ gap: 10 }}><Avatar text={initials(m.full_name ?? "?")} /><div><div style={{ fontWeight: 500 }}>{m.full_name}{m.user_id === ctx.userId ? ` (${t("you")})` : ""}</div><div className="note ltr">{m.email}</div></div></div></td>
                <td>{locked || m.user_id === ctx.userId && m.role === "owner" && false ? <Badge>{tr(m.role)}</Badge> : (
                  <form action={changeMemberAction.bind(null, m.user_id)} className="row" style={{ gap: 6 }}>
                    <input type="hidden" name="locale" value={locale} />
                    <select name="role" defaultValue={m.role} className="input" style={{ height: 28, width: 150 }} disabled={locked} aria-label={t("role")}>
                      {(isOwner ? ["owner", ...ROLES] : ROLES).map((r) => <option key={r} value={r}>{tr(r)}</option>)}
                    </select><button className="btn sm" disabled={locked}>OK</button>
                  </form>)}</td>
                <td><Badge tone={m.status === "active" ? "ok" : "bad"}>{t(`statuses.${m.status}`)}</Badge></td>
                <td>{!locked && m.user_id !== ctx.userId && (
                  <form action={changeMemberAction.bind(null, m.user_id)}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="status" value={m.status === "active" ? "disabled" : "active"} /><button className="btn sm ghost">{m.status === "active" ? t("disable") : t("enable")}</button></form>)}</td>
              </tr>);
          })}</tbody></table></div>
        <div className="col" style={{ gap: 16 }}>
          <form action={inviteAction} className="card"><h2><MailPlus size={15} aria-hidden />{t("invite")}</h2><div className="card-b col" style={{ gap: 10 }}>
            <input type="hidden" name="locale" value={locale} />
            <input name="email" type="email" required dir="ltr" className="input" placeholder="agent@agence.co.il" aria-label="E-mail" />
            <select name="role" className="input" defaultValue="agent" aria-label={t("role")}>{ROLES.map((r) => <option key={r} value={r}>{tr(r)}</option>)}</select>
            <button className="btn pri">{t("sendInvite")}</button><p className="note">{t("inviteHint")}</p>
          </div></form>
          {scopes && <form action={agentScopesAction} className="card"><h2><Eye size={15} aria-hidden />{t("scopes.title")}</h2><div className="card-b col" style={{ gap: 10 }}>
            <input type="hidden" name="locale" value={locale} />
            <p className="note">{t("scopes.intro")}</p>
            {AGENT_SCOPES.map((c) => <label key={c} className="row" style={{ gap: 8, alignItems: "flex-start" }}><input type="checkbox" className="ck" name={c} defaultChecked={scopes[c]} style={{ marginBlockStart: 2 }} /><span>{t(`scopes.${c.replace(".", "_")}`)}</span></label>)}
            <button className="btn sm" style={{ alignSelf: "flex-start" }}>{t("scopes.save")}</button>
          </div></form>}
          {invitations.length > 0 && <div className="card"><h2>{t("pending")}<span className="badge">{invitations.length}</span></h2><div className="card-b col" style={{ gap: 8 }}>
            {invitations.map((i) => <form key={i.id} action={revokeAction.bind(null, i.id)} className="row" style={{ gap: 8 }}><input type="hidden" name="locale" value={locale} /><div className="grow"><div className="ltr">{i.email}</div><div className="note">{tr(i.role)} · {t("expires", { date: dateShort(locale, i.expires_at) })}</div></div><button className="btn sm ghost">{t("revoke")}</button></form>)}</div></div>}
        </div>
      </div>
    </>
  );
}
