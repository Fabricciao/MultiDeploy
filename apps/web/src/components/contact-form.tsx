"use client";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Field } from "@/components/ui";
import type { ContactFormState } from "@/app/[locale]/(app)/clients/actions";

type Opt = { id: string; label: string };
export function ContactForm({ action, cities, sources, d, edit = false }: { action: (s: ContactFormState, fd: FormData) => Promise<ContactFormState>; cities: Opt[]; sources: Opt[]; d?: Record<string, any>; edit?: boolean }) {
  const t = useTranslations("clients");
  const tf = useTranslations("form");
  const tp = useTranslations("props");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(action, null);
  const e = (k: string) => (state?.errors?.[k] ? tf(`errors.${state.errors[k]}`) : undefined);
  const kinds = (d?.kinds as string[] | undefined) ?? ["buyer"];
  const g = (k: string) => d?.[k] ?? "";
  return (
    <form action={formAction} className="col" style={{ gap: 16, maxWidth: 920 }}>
      <input type="hidden" name="locale" value={locale} />
      {state?.error && <div role="alert" className="card card-b err">{tf(`errors.${state.error}`)}</div>}
      {state?.duplicateId && <div role="alert" className="card card-b"><span className="err">{tf("errors.duplicate_phone")}</span> <Link href={`/clients/${state.duplicateId}`} style={{ textDecoration: "underline" }}>{t("openExisting")}</Link></div>}

      <section className="card"><h2>{t("form.identity")}</h2><div className="card-b" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        <Field label={t("form.firstName")} error={e("first_name")}><input name="first_name" className="input" defaultValue={g("first_name")} autoFocus /></Field>
        <Field label={t("form.lastName")}><input name="last_name" className="input" defaultValue={g("last_name")} /></Field>
        <Field label={t("form.firstNameHe")}><input name="first_name_he" className="input" dir="rtl" defaultValue={g("first_name_he")} /></Field>
        <Field label={t("form.lastNameHe")}><input name="last_name_he" className="input" dir="rtl" defaultValue={g("last_name_he")} /></Field>
        <Field label={t("phone")} error={e("phone")} hint={t("form.phoneHint")}><input name="phone" className="input" dir="ltr" inputMode="tel" defaultValue={g("phone")} /></Field>
        <Field label="E-mail" error={e("email")}><input name="email" type="email" className="input" dir="ltr" defaultValue={g("email")} /></Field>
        <Field label={t("form.language")}><select name="preferred_locale" className="input" defaultValue={g("preferred_locale") || locale}><option value="fr">Français</option><option value="he">עברית</option><option value="en">English</option></select></Field>
        <Field label={t("form.aliyah")}><select name="aliyah_status" className="input" defaultValue={g("aliyah_status")}><option value="">—</option>{(["pre_aliyah", "recent", "resident", "none"] as const).map((x) => <option key={x} value={x}>{t(`aliyah.${x}`)}</option>)}</select></Field>
        {!edit && <Field label={t("form.source")}><select name="source_id" className="input" defaultValue=""><option value="">—</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>}
        <div style={{ gridColumn: "1 / -1" }}><div className="lbl">{t("form.kinds")}</div><div className="row wrap" style={{ gap: 14 }}>{(["buyer", "seller", "landlord", "tenant", "investor", "lawyer", "partner", "other"] as const).map((k) => <label key={k} className="row" style={{ gap: 6 }}><input type="checkbox" className="ck" name="kinds" value={k} defaultChecked={kinds.includes(k)} />{t(`kind.${k}`)}</label>)}</div></div>
      </div></section>

      {!edit && (
        <section className="card"><h2><label className="row" style={{ gap: 8 }}><input type="checkbox" className="ck" name="with_profile" defaultChecked />{t("form.searchProfile")}</label></h2>
          <div className="card-b" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
            <Field label={tp("filters.transaction")}><select name="transaction" className="input"><option value="sale">{tp("tx.sale")}</option><option value="rent">{tp("tx.rent")}</option></select></Field>
            <Field label={t("form.budgetMax")} error={e("budget_max")}><input name="budget_max" type="number" min="0" step="10000" className="input" /></Field>
            <Field label={t("form.roomsMin")} error={e("rooms_min")}><input name="rooms_min" type="number" min="0.5" step="0.5" className="input" /></Field>
            <Field label={t("form.roomsMax")} error={e("rooms_max")}><input name="rooms_max" type="number" min="0.5" step="0.5" className="input" /></Field>
            <div style={{ gridColumn: "1 / -1" }}><div className="lbl">{tp("filters.cities")}</div><div className="row wrap" style={{ gap: 12 }}>{cities.map((c) => <label key={c.id} className="row" style={{ gap: 6 }}><input type="checkbox" className="ck" name="city_ids" value={c.id} />{c.label}</label>)}</div></div>
            <div style={{ gridColumn: "1 / -1" }}><div className="lbl">{t("form.mustHave")}</div><div className="row wrap" style={{ gap: 14 }}>{(["mamad", "parking", "elevator", "sukkah_balcony", "storage", "ac"] as const).map((k) => <label key={k} className="row" style={{ gap: 6 }}><input type="checkbox" className="ck" name="must_have" value={k} />{tp(`has.${k}`)}</label>)}</div></div>
          </div></section>
      )}
      {edit && <Field label={t("form.budgetMax")} error={e("budget_max")}><input name="budget_max" type="number" min="0" step="10000" className="input" style={{ maxWidth: 240 }} defaultValue={g("budget_max")} /></Field>}

      <section className="card"><h2>{t("form.notes")}</h2><div className="card-b col" style={{ gap: 12 }}>
        <textarea name="notes" className="input" defaultValue={g("notes")} />
        {!edit && <label className="row" style={{ gap: 8 }}><input type="checkbox" className="ck" name="marketing_opt_in" />{t("form.optIn")}</label>}
        {!edit && <p className="note">{t("form.optInHint")}</p>}
      </div></section>
      <div><button className="btn pri" disabled={pending}>{pending ? tc("saving") : tc("save")}</button></div>
    </form>
  );
}
