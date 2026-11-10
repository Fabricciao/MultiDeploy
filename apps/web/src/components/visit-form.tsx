"use client";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarPlus } from "lucide-react";
import { createVisitAction, type VisitState } from "@/app/[locale]/(app)/agenda/actions";
import { SlipActions } from "@/components/slip-actions";

export function VisitForm({ properties, contacts }: { properties: { id: string; label: string }[]; contacts: { id: string; label: string }[] }) {
  const t = useTranslations("agenda");
  const locale = useLocale();
  const [state, action, pending] = useActionState<VisitState, FormData>(createVisitAction, null);
  return (
    <>
    <form action={action} className="card"><h2><CalendarPlus size={15} aria-hidden />{t("newVisit")}</h2><div className="card-b col" style={{ gap: 10 }}>
      <input type="hidden" name="locale" value={locale} />
      <select name="property" required className="input" aria-label={t("property")}><option value="">{t("property")}</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
      <select name="contact" className="input" aria-label={t("client")}><option value="">{t("client")}</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
      <div className="row" style={{ gap: 8 }}><input name="starts_at" type="datetime-local" required className="input" aria-label={t("when")} /><select name="minutes" className="input" style={{ width: 110 }} defaultValue="30" aria-label={t("duration")}>{[15, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} min</option>)}</select></div>
      {state?.warning && <div role="alert" className="card card-b" style={{ borderColor: "var(--warn)", background: "var(--warn-soft)" }}><b>{t(`quiet.${state.warning.kind}`)}</b>{state.warning.key && state.warning.key !== "shabbat" ? ` — ${t(`holidays.${state.warning.key}`)}` : ""}
        <label className="row" style={{ gap: 8, marginTop: 6 }}><input type="checkbox" className="ck" name="force" />{t("quiet.force")}</label></div>}
      {state?.error && <div role="alert" className="err">{t(`errors.${state.error}`)}</div>}
      {state?.ok && <div role="status" style={{ color: "var(--ok)" }}>{t("created")}</div>}
      <button className="btn pri" disabled={pending}>{t("plan")}</button>
    </div></form>
    {state?.ok && state.slip?.url && <div className="card card-b col" role="status" style={{ gap: 8, marginBlockStart: 12, borderColor: "var(--accent)" }}><b style={{ fontWeight: 500 }}>{t("slipNow")}</b><SlipActions s={state.slip} sm /></div>}
    </>
  );
}
