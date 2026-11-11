"use client";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarPlus, Check } from "lucide-react";
import { createVisitAction, type VisitState } from "@/app/[locale]/(app)/agenda/actions";
import { SlipActions } from "@/components/slip-actions";
import { Link } from "@/i18n/navigation";

type Opt = { id: string; label: string };
/**
 * Planifier une visite. `bare` : sans carte autour (dans une fenêtre). Les valeurs par défaut viennent de l'URL
 * (bien ou client d'où l'on vient, créneau cliqué dans la semaine).
 */
export function VisitForm({ properties, contacts, bare = false, defaults, doneHref, againHref }: { properties: Opt[]; contacts: Opt[]; bare?: boolean; defaults?: { property?: string; contact?: string; at?: string }; doneHref?: string; againHref?: string }) {
  const t = useTranslations("agenda");
  const locale = useLocale();
  const [state, action, pending] = useActionState<VisitState, FormData>(createVisitAction, null);
  if (state?.ok && bare) return (
    <div className="bd col" style={{ gap: 14 }}>
      <div className="banner ok" role="status"><Check size={15} aria-hidden /><b style={{ fontWeight: 600 }}>{t("created")}</b></div>
      {state.slip?.url && <div className="col" style={{ gap: 8 }}><b style={{ fontWeight: 500 }}>{t("slipNow")}</b><SlipActions s={state.slip} /></div>}
      <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
        {againHref && <Link href={againHref as "/"} scroll={false} className="btn ghost">{t("another")}</Link>}
        {doneHref && <Link href={doneHref as "/"} scroll={false} className="btn pri">{t("close")}</Link>}
      </div>
    </div>
  );
  const fields = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <label className="col" style={{ gap: 4 }}><span className="lbl">{t("property")}</span>
        <select name="property" required className="input" defaultValue={defaults?.property ?? ""}><option value="">—</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
      <label className="col" style={{ gap: 4 }}><span className="lbl">{t("client")}</span>
        <select name="contact" className="input" defaultValue={defaults?.contact ?? ""}><option value="">—</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        {bare && <span className="hint">{t("clientHint")}</span>}</label>
      <div className="row" style={{ gap: 8, alignItems: "flex-end" }}>
        <label className="col grow" style={{ gap: 4 }}><span className="lbl">{t("when")}</span><input name="starts_at" type="datetime-local" required className="input" defaultValue={defaults?.at ?? ""} autoFocus={bare && !!defaults?.property && !defaults?.at} /></label>
        <label className="col" style={{ gap: 4 }}><span className="lbl">{t("duration")}</span><select name="minutes" className="input" style={{ width: 110 }} defaultValue="30">{[15, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{t("minutes", { n: m })}</option>)}</select></label>
      </div>
      {state?.warning && <div role="alert" className="card card-b" style={{ borderColor: "var(--warn)", background: "var(--warn-soft)" }}><b>{t(`quiet.${state.warning.kind}`)}</b>{state.warning.key && state.warning.key !== "shabbat" ? ` — ${t(`holidays.${state.warning.key}`)}` : ""}
        <label className="row" style={{ gap: 8, marginTop: 6 }}><input type="checkbox" className="ck" name="force" />{t("quiet.force")}</label></div>}
      {state?.error && <div role="alert" className="err">{t(`errors.${state.error}`)}</div>}
      {state?.ok && !bare && <div role="status" style={{ color: "var(--ok)" }}>{t("created")}</div>}
    </>
  );
  if (bare) return (
    <form action={action}>
      <div className="bd col" style={{ gap: 12 }}>{fields}</div>
      <div className="ft">{doneHref && <Link href={doneHref as "/"} scroll={false} className="btn ghost">{t("cancel")}</Link>}<button className="btn pri" disabled={pending}><CalendarPlus size={15} aria-hidden />{t("plan")}</button></div>
    </form>
  );
  return (
    <>
      <form action={action} className="card"><h2><CalendarPlus size={15} aria-hidden />{t("newVisit")}</h2><div className="card-b col" style={{ gap: 10 }}>
        {fields}
        <button className="btn pri" disabled={pending}>{t("plan")}</button>
      </div></form>
      {state?.ok && state.slip?.url && <div className="card card-b col" role="status" style={{ gap: 8, marginBlockStart: 12, borderColor: "var(--accent)" }}><b style={{ fontWeight: 500 }}>{t("slipNow")}</b><SlipActions s={state.slip} sm /></div>}
    </>
  );
}
