import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, House, Trash2, User } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCtx, db } from "@/lib/session";
import { listTasks, type TaskRow } from "@/lib/data/today";
import { listAgents } from "@/lib/data/geo";
import { contactName } from "@/lib/data/contacts";
import { dayKey } from "@/lib/calendar/week";
import { dateShort, initials, timeOnly } from "@/lib/format";
import { Avatar, Badge, PageHeader } from "@/components/ui";
import { TaskAdd } from "@/components/task-add";
import { deleteTaskFormAction, toggleTaskFormAction } from "./actions";

export default async function TasksPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ scope?: string; show?: string; new?: string }> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("tasks");
  const manager = ctx.caps.has("contacts.write_all");
  const scope = manager && sp.scope === "all" ? "all" : "mine";
  const done = sp.show === "done";
  const [rows, agents, contacts] = await Promise.all([
    listTasks(ctx, { scope, done }),
    manager ? listAgents(ctx) : Promise.resolve([]),
    db(ctx, (tx) => tx`select id, first_name, last_name, first_name_he, last_name_he from public.contacts where deleted_at is null order by updated_at desc limit 300`),
  ]);
  const today = dayKey(new Date());
  const group = (r: TaskRow) => (done ? "done" : !r.due_at ? "none" : r.overdue && dayKey(r.due_at) < today ? "overdue" : dayKey(r.due_at) === today ? "today" : "later");
  const groups = (done ? ["done"] : ["overdue", "today", "later", "none"]).map((g) => ({ g, list: rows.filter((r) => group(r) === g) })).filter((x) => x.list.length);
  const q = (o: { scope?: string; show?: string }) => { const u = new URLSearchParams(); if (o.scope === "all") u.set("scope", "all"); if (o.show === "done") u.set("show", "done"); const s = u.toString(); return s ? `/tasks?${s}` : "/tasks"; };
  const hasTime = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(d)) !== "18:00";

  return (
    <>
      <PageHeader title={t("title")} sub={t("sub", { count: done ? 0 : rows.length, overdue: rows.filter((r) => group(r) === "overdue").length })}>
        {manager && <div className="seg"><Link href={q({ show: sp.show })} className={scope === "mine" ? "on" : ""}>{t("mine")}</Link><Link href={q({ scope: "all", show: sp.show })} className={scope === "all" ? "on" : ""}>{t("agency")}</Link></div>}
        <div className="seg"><Link href={q({ scope })} className={done ? "" : "on"}>{t("open")}</Link><Link href={q({ scope, show: "done" })} className={done ? "on" : ""}>{t("done")}</Link></div>
      </PageHeader>

      {ctx.caps.has("tasks.write") && (
        <section className="card" style={{ marginBottom: 14 }}><div className="card-b col" style={{ gap: 6 }}>
          <TaskAdd locale={locale} autoFocus={sp.new === "1"} agents={agents.map((a) => ({ id: a.id, label: a.full_name }))} contacts={(contacts as unknown as Record<string, any>[]).map((c) => ({ id: c.id, label: contactName(c, locale) }))} />
          {manager && agents.length > 1 && <p className="note">{t("assignHint")}</p>}
          <p className="note">{t("calendarHint")}</p>
        </div></section>
      )}

      {groups.length === 0 ? <div className="card empty"><h3>{done ? t("emptyDone") : t("empty")}</h3></div> : groups.map(({ g, list }) => (
        <section key={g} className="card" style={{ marginBottom: 12 }}>
          <h2>{t(`groups.${g}`)}<span className="cnt-b">{list.length}</span></h2>
          <div>{list.map((k) => (
            <div key={k.id} className={`task-row ${k.done_at ? "done" : ""}`}>
              <form action={toggleTaskFormAction.bind(null, k.id, !k.done_at)}><input type="hidden" name="locale" value={locale} /><button className={`cb ${k.done_at ? "on" : ""}`} style={{ width: 20, height: 20, cursor: "pointer" }} aria-label={k.done_at ? t("reopen") : t("markDone")}>{k.done_at ? "✓" : ""}</button></form>
              <div style={{ minWidth: 0 }}>
                <b style={{ fontWeight: 500 }}>{k.title}</b>
                <div className="row wrap note" style={{ gap: 10 }}>
                  {k.contact_id && <Link href={`/clients/${k.contact_id}`} className="row gap4"><User size={12} aria-hidden />{contactName(k, locale)}</Link>}
                  {k.property_id && <Link href={`/properties/${k.property_id}`} className="row gap4"><House size={12} aria-hidden /><span className="ltr tab">{k.reference}</span>{k.street ? ` · ${k.street}` : ""}</Link>}
                </div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                {k.due_at && (g === "overdue" ? <Badge tone="bad"><Clock size={11} aria-hidden />{dateShort(locale, k.due_at)}</Badge> : <span className="note tab">{g === "today" ? (hasTime(k.due_at) ? timeOnly(locale, k.due_at) : t("groups.today")) : dateShort(locale, k.due_at)}{g !== "today" && hasTime(k.due_at) ? ` · ${timeOnly(locale, k.due_at)}` : ""}</span>)}
                {scope === "all" && k.assignee_name && <span title={k.assignee_name}><Avatar text={initials(k.assignee_name)} cls="sm" /></span>}
                <form action={deleteTaskFormAction.bind(null, k.id)}><input type="hidden" name="locale" value={locale} /><button className="btn icon ghost sm" aria-label={t("delete")} title={t("delete")}><Trash2 size={14} aria-hidden /></button></form>
              </div>
            </div>
          ))}</div>
        </section>
      ))}
    </>
  );
}
