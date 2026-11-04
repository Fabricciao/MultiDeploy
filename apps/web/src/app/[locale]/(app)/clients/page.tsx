import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCtx } from "@/lib/session";
import { contactName, listContacts } from "@/lib/data/contacts";
import { listAgents } from "@/lib/data/geo";
import { KINDS, PAGE_SIZE, parseContactFilters, toQuery, type SP } from "@/lib/data/filters";
import { dateShort, initials, money } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { Avatar, Badge, PageHeader } from "@/components/ui";

export default async function ClientsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SP> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const f = parseContactFilters(await searchParams);
  const ctx = await getCtx(locale);
  const t = await getTranslations("clients");
  const tc = await getTranslations("common");
  const [{ rows, total }, agents] = await Promise.all([listContacts(ctx, f), listAgents(ctx)]);
  const base = { q: f.q, kind: f.kind, owner: f.owner };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <>
      <PageHeader title={t("title")} sub={t("count", { count: total })}>
        <Link href="/clients/new" className="btn pri"><Plus size={15} aria-hidden />{t("new")}</Link>
      </PageHeader>
      <form method="get" className="row wrap" style={{ marginBottom: 12 }}>
        <input name="q" defaultValue={f.q} placeholder={t("filters.q")} className="input" style={{ width: 260 }} aria-label={t("filters.q")} />
        <select name="kind" defaultValue={f.kind ?? ""} className="input" style={{ width: 160 }} aria-label={t("filters.kind")}><option value="">{t("filters.allKinds")}</option>{KINDS.map((k) => <option key={k} value={k}>{t(`kind.${k}`)}</option>)}</select>
        <select name="owner" defaultValue={f.owner ?? ""} className="input" style={{ width: 170 }} aria-label={t("filters.owner")}><option value="">{t("filters.allAgents")}</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}</select>
        <button className="btn pri">{tc("apply")}</button>
        {(f.q || f.kind || f.owner) && <Link href="/clients" className="btn ghost sm"><X size={13} aria-hidden />{tc("reset")}</Link>}
      </form>
      <div className="card" style={{ overflow: "hidden" }}>
        {rows.length === 0 ? <p className="muted" style={{ padding: "40px 20px", textAlign: "center" }}>{t("empty")}</p> : (
          <div style={{ overflowX: "auto" }}><table className="tbl">
            <thead><tr><th>{t("name")}</th><th>{t("phone")}</th><th>{t("typeLabel")}</th><th>{t("budget")}</th><th>{t("lang")}</th><th>{t("lastActivity")}</th><th>{t("agent")}</th></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/clients/${c.id}`} className="row" style={{ gap: 10 }}><Avatar text={initials(contactName(c, locale))} /><div><div style={{ fontWeight: 500 }}>{contactName(c, locale)}</div>{c.tags.includes("vip") && <span className="badge acc" style={{ height: 17 }}>VIP</span>}</div></Link></td>
                <td className="tab"><span className="ltr">{formatPhone(c.phones?.[0]?.e164)}</span></td>
                <td><div className="row wrap" style={{ gap: 4 }}>{c.kinds.slice(0, 2).map((k) => <Badge key={k}>{t(`kind.${k}`)}</Badge>)}{c.has_profile && <Badge tone="acc">{t("searching")}</Badge>}</div></td>
                <td className="tab">{c.budget_max ? money(locale, c.budget_max) : "—"}</td>
                <td className="muted">{c.preferred_locale.toUpperCase()}</td>
                <td className="muted">{dateShort(locale, c.last_activity ?? c.created_at)}</td>
                <td>{c.owner_name ? <Avatar text={initials(c.owner_name)} /> : "—"}</td>
              </tr>))}</tbody></table></div>)}
      </div>
      {pages > 1 && <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
        {f.page > 1 && <Link href={`/clients${toQuery({ ...base, page: f.page - 1 })}`} className="btn sm"><span className="flip"><ChevronLeft size={14} aria-hidden /></span>{tc("prev")}</Link>}
        <span className="note tab">{f.page} / {pages}</span>
        {f.page < pages && <Link href={`/clients${toQuery({ ...base, page: f.page + 1 })}`} className="btn sm">{tc("next")}<span className="flip"><ChevronRight size={14} aria-hidden /></span></Link>}
      </div>}
    </>
  );
}
