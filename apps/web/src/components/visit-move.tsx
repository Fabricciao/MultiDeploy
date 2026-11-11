"use client";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, Check } from "lucide-react";
import { moveVisitAction, type MoveState } from "@/app/[locale]/(app)/agenda/actions";

/** Déplacer une visite prévue : nouvelle date et heure, même durée. */
export function VisitMove({ visitId, at }: { visitId: string; at: string }) {
  const t = useTranslations("agenda");
  const locale = useLocale();
  const [state, action, pending] = useActionState<MoveState, FormData>(moveVisitAction.bind(null, visitId), null);
  return (
    <form action={action} className="col" style={{ gap: 8 }}>
      <input type="hidden" name="locale" value={locale} />
      <div className="row" style={{ gap: 8, alignItems: "flex-end" }}>
        <label className="col grow" style={{ gap: 4 }}><span className="lbl">{t("visit.move")}</span><input name="starts_at" type="datetime-local" required className="input" defaultValue={at} /></label>
        <button className="btn" disabled={pending}><CalendarClock size={14} aria-hidden />{t("visit.moveBtn")}</button>
      </div>
      {state?.warning && <label className="row note" style={{ gap: 8, color: "var(--warning)" }}><input type="checkbox" className="ck" name="force" /><b>{t(`quiet.${state.warning.kind}`)}</b> · {t("quiet.force")}</label>}
      {state?.error && <span role="alert" className="err">{t(`errors.${["conflict", "invalid", "forbidden", "past", "signed"].includes(state.error) ? state.error : "invalid"}`)}</span>}
      {state?.ok && <span role="status" className="badge ok" style={{ alignSelf: "flex-start" }}><Check size={12} aria-hidden />{t("visit.moved")}</span>}
    </form>
  );
}
