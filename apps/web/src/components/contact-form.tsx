"use client";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Check, TriangleAlert } from "lucide-react";
import { Field } from "@/components/ui";
import type { FieldMeta } from "@/lib/intake/extract";
import type { ContactFormState } from "@/app/[locale]/(app)/clients/actions";

type Opt = { id: string; label: string };
export function ContactForm({ action, cities, sources, d, edit = false, hints, missing }: { action: (s: ContactFormState, fd: FormData) => Promise<ContactFormState>; cities: Opt[]; sources: Opt[]; d?: Record<string, any>; edit?: boolean; hints?: Record<string, FieldMeta>; missing?: string[] }) {
  const t = useTranslations("clients");
  const tf = useTranslations("form");
  const tp = useTranslations("props");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(action, null);
  const e = (k: string) => (state?.errors?.[k] ? tf(`errors.${state.errors[k]}`) : undefined);
  const kinds = (d?.kinds as string[] | undefined) ?? ["buyer"];
  const g = (k: string) => d?.[k] ?? "";
  const ti = useTranslations("intake");
  const L = (label: string, k: string) => { const h = hints?.[k]; return h ? <span className="row" style={{ gap: 6 }}>{label}{h.confidence < 0.7 ? <span className="badge warn" style={{ height: 18 }}><TriangleAlert size={11} aria-hidden />{ti("verify")}</span> : <span style={{ color: "var(--ok)" }} title={h.evidence}><Check size={13} aria-hidden /></span>}</span> : label; };
  const ev = (k: string) => (hints?.[k]?.evidence ? <>{ti("evidence")} « {hints[k]!.evidence} »</> : undefined);
  return (
    <form action={formAction} className="col" style={{ gap: 16, maxWidth: 920 }}>
      <input type="hidden" name="locale" value={locale} />
      {missing && missing.length > 0 && <div role="alert" className="card card-b" style={{ borderColor: "var(--bad)", background: "var(--bad-soft)" }}><b>{ti("missing", { fields: missing.map((m) => ti(`fields.${m}`)).join(", ") })}</b></div>}
      {state?.error && <div role="alert" className="card card-b err">{tf(`errors.${state.error}`)}</div>}
      {state?.duplicateId && <div role="alert" className="card card-b"><span className="err">{tf("errors.duplicate_phone")}</span> <Link href={`/clients/${state.duplicateId}`} style={{ textDecoration: "underline" }}>{t("openExisting")}</Link></div>}

      <section className="card"><h2>{t("form.identity")}</h2><div className="card-b" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        <Field label={L(t("form.firstName"), "first_name")} error={e("first_name")} hint={ev("first_name")}><input name="first_name" className="input" defaultValue={g("first_name")} autoFocus /></Field>
        <Field label={L(t("form.lastName"), "last_name")} hint={ev("last_name")}><input name="last_name" className="input" defaultValue={g("last_name")} /></Field>
        <Field label={L(t("form.firstNameHe"), "first_name_he")} hint={ev("first_name_he")}><input name="first_name_he" className="input" dir="rtl" defaultValue={g("first_name_he")} /></Field>
        <Field label={L(t("form.lastNameHe"), "last_name_he")} hint={ev("last_name_he")}><input name="last_name_he" className="input" dir="rtl" defaultValue={g("last_name_he")} /></Field>
        <Field label={L(t("phone"), "phone")} error={e("phone")} hint={ev("phone") ?? t("form.phoneHint")}><input name="phone" className="input" dir="ltr" inputMode="tel" defaultValue={g("phone")} /></Field>
        <Field label={L("E-mail", "email")} error={e("email")} hint={ev("email")}><input name="email" type="email" className="input" dir="ltr" defaultValue={g("email")} /></Field>
        <Field label={L(t("form.language"), "preferred_locale")} hint={ev("preferred_locale")}><select name="preferred_locale" className="input" defaultValue={g("preferred_locale") || locale}><option value="fr">Français</option><option value="he">עברית</option><option value="en">English</option></select></Field>
        <Field label={L(t("form.aliyah"), "aliyah_status")} hint={ev("aliyah_status")}><select name="aliyah_status" className="input" defaultValue={g("aliyah_status")}><option value="">—</option>{(["pre_aliyah", "recent", "resident", "none"] as const).map((x) => <option key={x} value={x}>{t(`aliyah.${x}`)}</option>)}</select></Field>
        {!edit && <Field label={t("form.source")}><select name="source_id" className="input" defaultValue=""><option value="">—</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>}
        <div style={{ gridColumn: "1 / -1" }}><div className="lbl">{t("form.kinds")}</div><div className="row wrap" style={{ gap: 14 }}>{(["buyer", "seller", "landlord", "tenant", "investor", "lawyer", "partner", "other"] as const).map((k) => <label key={k} className="row" style={{ gap: 6 }}><input type="checkbox" className="ck" name="kinds" value={k} defaultChecked={kinds.includes(k)} />{t(`kind.${k}`)}</label>)}</div></div>
      </div></section>

      {!edit && (
        <section className="card"><h2><label className="row" style={{ gap: 8 }}><input type="checkbox" className="ck" name="with_profile" defaultChecked />{t("form.searchProfile")}</label></h2>
          <div className="card-b" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
            <Field label={tp("filters.transaction")}><select name="transaction" className="input" defaultValue={d?.transaction ?? "sale"}><option value="sale">{tp("tx.sale")}</option><option value="rent">{tp("tx.rent")}</option></select></Field>
            <Field label={L(t("form.budgetMax"), "budget_max")} error={e("budget_max")} hint={ev("budget_max")}><input name="budget_max" type="number" min="0" step="10000" className="input" defaultValue={g("budget_max")} /></Field>
            <Field label={L(t("form.roomsMin"), "rooms_min")} error={e("rooms_min")} hint={ev("rooms_min")}><input name="rooms_min" type="number" min="0.5" step="0.5" className="input" defaultValue={g("rooms_min")} /></Field>
            <Field label={L(t("form.roomsMax"), "rooms_max")} error={e("rooms_max")} hint={ev("rooms_max")}><input name="rooms_max" type="number" min="0.5" step="0.5" className="input" defaultValue={g("rooms_max")} /></Field>
            <div style={{ gridColumn: "1 / -1" }}><div className="lbl">{tp("filters.cities")}</div><div className="row wrap" style={{ gap: 12 }}>{cities.map((c) => <label key={c.id} className="row" style={{ gap: 6 }}><input type="checkbox" className="ck" name="city_ids" value={c.id} defaultChecked={((d?.city_ids as string[] | undefined) ?? []).includes(c.id)} />{c.label}</label>)}</div></div>
            <div style={{ gridColumn: "1 / -1" }}><div className="lbl">{t("form.mustHave")}</div><div className="row wrap" style={{ gap: 14 }}>{(["mamad", "parking", "elevator", "sukkah_balcony", "storage", "ac"] as const).map((k) => <label key={k} className="row" style={{ gap: 6 }}><input type="checkbox" className="ck" name="must_have" value={k} defaultChecked={((d?.must_have as string[] | undefined) ?? []).includes(k)} />{tp(`has.${k}`)}</label>)}</div></div>
          </div></section>
      )}
      {edit && <Field label={t("form.budgetMax")} error={e("budget_max")}><input name="budget_max" type="number" min="0" step="10000" className="input" style={{ maxWidth: 240 }} defaultValue={g("budget_max")} /></Field>}

      <section className="card"><h2>{t("form.commissionTitle")}</h2><div className="card-b" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        <Field label={t("form.commission")} error={e("commission_pct")} hint={t("form.commissionHint")}><input name="commission_pct" type="number" min="0" max="20" step="0.1" inputMode="decimal" className="input" defaultValue={g("commission_pct")} placeholder={t("form.commissionAuto")} /></Field>
        <div><label className="row" style={{ gap: 8, marginBlockStart: 22 }}><input type="checkbox" className="ck" name="co_broke" defaultChecked={!!d?.co_broke} />{t("form.coBroke")}</label><div className="note" style={{ marginBlockStart: 4 }}>{t("form.coBrokeHint")}</div></div>
      </div></section>

      <section className="card"><h2>{t("form.notes")}</h2><div className="card-b col" style={{ gap: 12 }}>
        <textarea name="notes" className="input" defaultValue={g("notes")} />
        {!edit && <label className="row" style={{ gap: 8 }}><input type="checkbox" className="ck" name="marketing_opt_in" />{t("form.optIn")}</label>}
        {!edit && <p className="note">{t("form.optInHint")}</p>}
      </div></section>
      <div><button className="btn pri" disabled={pending}>{pending ? tc("saving") : tc("save")}</button></div>
    </form>
  );
}
