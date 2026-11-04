"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createKeyAction, type KeyState } from "@/app/[locale]/(app)/settings/integrations/actions";

export function CreateKeyForm({ locale, enabled, border }: { locale: string; enabled: boolean; border: boolean }) {
  const t = useTranslations("integrations");
  const [state, action, pending] = useActionState<KeyState, FormData>(createKeyAction, null);
  return (
    <form action={action} className="col" style={{ gap: 8, borderTop: border ? "1px solid var(--line)" : 0, paddingTop: border ? 10 : 0 }}>
      <input type="hidden" name="locale" value={locale} /><input name="name" className="input" placeholder={t("keyName")} aria-label={t("keyName")} />
      <label className="row" style={{ gap: 8 }}><input type="checkbox" className="ck" name="s_properties:read" defaultChecked />{t("scopeProps")}</label>
      <label className="row" style={{ gap: 8 }}><input type="checkbox" className="ck" name="s_leads:write" defaultChecked />{t("scopeLeads")}</label>
      <button className="btn pri" disabled={!enabled || pending}>{t("createKey")}</button>
      {state?.error && <div role="alert" className="err">{t(`errors.${state.error}`)}</div>}
      {state?.key && <div role="status" className="card card-b" style={{ borderColor: "var(--ok)" }}><b>{t("keyOnce")}</b><div className="ltr tab" data-testid="new-key" style={{ marginTop: 6, wordBreak: "break-all", fontFamily: "monospace" }}>{state.key}</div></div>}
    </form>
  );
}
