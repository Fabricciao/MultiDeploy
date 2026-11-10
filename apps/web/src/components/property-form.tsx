"use client";
import { useActionState, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Field } from "@/components/ui";
import type { FormState } from "@/app/[locale]/(app)/properties/actions";
import { PROPERTY_TYPES } from "@/lib/data/forms";
import { suggestTextAction } from "@/app/[locale]/(app)/properties/suggest-action";

type City = { id: string; label: string };
export type PropertyDefaults = Record<string, any>;

export function PropertyForm({ action, cities, d = {}, missing, hints, canTranslate = false }: { canTranslate?: boolean } & { action: (s: FormState, fd: FormData) => Promise<FormState>; cities: City[]; d?: PropertyDefaults; missing?: string[]; hints?: Record<string, { confidence: number; evidence?: string }> }) {
  const ti = useTranslations("intake");
  const t = useTranslations("props");
  const tf = useTranslations("form");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, startBusy] = useTransition();
  const [sugErr, setSugErr] = useState<string | null>(null);
  const form = () => formRef.current!;
  const val = (n: string) => (form().elements.namedItem(n) as HTMLInputElement | HTMLTextAreaElement | null);
  const fill = (l: string, r: { title?: string; description: string }) => { const ti_ = val(`title_${l}`), de = val(`desc_${l}`); if (r.title !== undefined && ti_) ti_.value = r.title; if (de) de.value = r.description; };
  const suggest = (l: string) => { setSugErr(null); const fd = new FormData(form()); const v: Record<string, string> = {}; fd.forEach((x, k) => { if (typeof x === "string") v[k] = x; }); startBusy(async () => { const r = await suggestTextAction({ mode: "template", target: l, v }); if (r.ok) fill(l, r); else setSugErr(r.error); }); };
  const translate = (l: string) => { setSugErr(null); const src = (["fr", "en", "he"] as const).find((x) => x !== l && (val(`desc_${x}`)?.value ?? "").trim()); if (!src) { setSugErr("empty"); return; } startBusy(async () => { const r = await suggestTextAction({ mode: "translate", target: l, source: src, v: {}, text: val(`desc_${src}`)!.value }); if (r.ok) { const tt = val(`title_${src}`)?.value.trim(); fill(l, { description: r.description }); void tt; } else setSugErr(r.error); }); };
  const e = (k: string) => (state?.errors?.[k] ? tf(`errors.${state.errors[k]}`) : undefined);
  const chk = (k: string, label: string) => <label className="row" style={{ gap: 8 }}><input type="checkbox" className="ck" name={k} defaultChecked={!!d[k]} />{label}</label>;
  const mandate = (d.mandate ?? {}) as { type?: string; end?: string; origin?: string; partner?: string; co_broke?: boolean };
  const tr = (d.translations ?? {}) as Record<string, { title?: string; description?: string }>;
  return (
    <form ref={formRef} action={formAction} className="col" style={{ gap: 16, maxWidth: 920 }}>
      <input type="hidden" name="locale" value={locale} />
      {missing && missing.length > 0 && <div role="alert" className="card card-b" style={{ borderColor: "var(--bad)", background: "var(--bad-soft)" }}><b>{ti("missing", { fields: missing.map((m) => ti(`fields.${m}`)).join(", ") })}</b></div>}
      {hints && Object.values(hints).some((h) => h.confidence < 0.7) && <div className="card card-b note">{ti("propertyVerify")}</div>}
      {state?.error && <div role="alert" className="card card-b err">{tf(`errors.${state.error}`)}</div>}

      <section className="card"><h2>{t("form.basics")}</h2><div className="card-b" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        <Field label={t("filters.transaction")}><select name="transaction" className="input" defaultValue={d.transaction?.includes("rent") ? "rent" : "sale"}><option value="sale">{t("tx.sale")}</option><option value="rent">{t("tx.rent")}</option></select></Field>
        <Field label={t("form.type")}><select name="property_type" className="input" defaultValue={d.property_type ?? "apartment"}>{PROPERTY_TYPES.map((x) => <option key={x} value={x}>{t(`types.${x}`)}</option>)}</select></Field>
        <Field label={t("statusLabel")} error={e("status")}><select name="status" className="input" defaultValue={d.status ?? "draft"}>{(["draft", "active", "under_offer", "sold", "rented", "withdrawn"] as const).map((x) => <option key={x} value={x}>{t(`status.${x}`)}</option>)}</select></Field>
        <Field label={t("city")}><select name="city_id" className="input" defaultValue={d.city_id ?? ""}><option value="">—</option>{cities.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
        <Field label={t("form.street")}><input name="street" className="input" defaultValue={d.street ?? ""} /></Field>
        <Field label={t("form.houseNumber")}><input name="house_number" className="input" defaultValue={d.house_number ?? ""} /></Field>
        <Field label={t("form.addressVisibility")} hint={t("form.addressVisibilityHint")}><select name="address_visibility" className="input" defaultValue={d.address_visibility ?? "street"}>{(["hidden", "neighborhood", "street", "exact"] as const).map((x) => <option key={x} value={x}>{t(`form.vis.${x}`)}</option>)}</select></Field>
      </div></section>

      <section className="card"><h2>{t("form.figures")}</h2><div className="card-b" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 }}>
        <Field label={t("price")} error={e("price")}><input name="price" type="number" min="0" step="1000" className="input" defaultValue={d.price ?? ""} /></Field>
        <Field label={t("form.currency")}><select name="currency" className="input" defaultValue={d.currency ?? "ILS"}><option>ILS</option><option>USD</option><option>EUR</option></select></Field>
        <Field label={t("rooms")} error={e("rooms")}><input name="rooms" type="number" min="0.5" step="0.5" className="input" defaultValue={d.rooms ?? ""} /></Field>
        <Field label={`${t("area")} (${t("sqm")})`} error={e("area_built")}><input name="area_built" type="number" min="5" className="input" defaultValue={d.area_built ?? ""} /></Field>
        <Field label={t("floor")} error={e("floor")}><input name="floor" type="number" className="input" defaultValue={d.floor ?? ""} /></Field>
        <Field label={t("form.floorsTotal")}><input name="floors_total" type="number" min="1" className="input" defaultValue={d.floors_total ?? ""} /></Field>
        <Field label={t("form.arnona")}><input name="arnona_monthly" type="number" min="0" className="input" defaultValue={d.arnona_monthly ?? ""} /></Field>
        <Field label={t("form.vaad")}><input name="vaad_bayit_monthly" type="number" min="0" className="input" defaultValue={d.vaad_bayit_monthly ?? ""} /></Field>
        <Field label={t("form.registration")}><select name="registration_type" className="input" defaultValue={d.registration_type ?? ""}><option value="">—</option>{(["tabu", "minhal", "company", "other"] as const).map((x) => <option key={x} value={x}>{t(`form.reg.${x}`)}</option>)}</select></Field>
      </div></section>

      <section className="card"><h2>{t("form.features")}</h2><div className="card-b row wrap" style={{ gap: 18 }}>
        {chk("mamad", t("has.mamad"))}{chk("elevator", t("has.elevator"))}{chk("sukkah_balcony", t("has.sukkah_balcony"))}{chk("storage", t("has.storage"))}{chk("ac", t("has.ac"))}
        <label className="row" style={{ gap: 8 }}>{t("has.parking")}<input name="parking_count" type="number" min="0" max="20" className="input" style={{ width: 70 }} defaultValue={d.parking_count ?? 0} /></label>
      </div></section>

      <section className="card"><h2>{t("form.mandate")}</h2><div className="card-b" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        <Field label={t("mandateLabel")}><select name="mandate_type" className="input" defaultValue={mandate.type ?? "non_exclusive"}><option value="non_exclusive">{t("mandate.non_exclusive")}</option><option value="exclusive">{t("mandate.exclusive")}</option></select></Field>
        <Field label={t("form.mandateEnd")} error={e("mandate_end")}><input name="mandate_end" type="date" className="input" defaultValue={mandate.end ?? ""} /></Field>
        <Field label={t("form.origin")} hint={t("form.originHint")}><select name="mandate_origin" className="input" defaultValue={mandate.origin ?? "own"}><option value="own">{t("origin.own")}</option><option value="partner">{t("origin.partner")}</option></select></Field>
        <Field label={t("form.partnerAgency")}><input name="mandate_partner" className="input" maxLength={120} defaultValue={mandate.partner ?? ""} placeholder={t("form.partnerPlaceholder")} /></Field>
        <Field label={t("form.commission")} error={e("commission_pct")} hint={t("form.commissionHint")}><input name="commission_pct" type="number" min="0" max="20" step="0.1" inputMode="decimal" className="input" defaultValue={d.commission_pct ?? ""} placeholder={t("form.commissionAuto")} /></Field>
        <div style={{ gridColumn: "1 / -1" }}><label className="row" style={{ gap: 8 }}><input type="checkbox" className="ck" name="mandate_co_broke" defaultChecked={!!mandate.co_broke} />{t("form.coBroke")}</label><div className="note" style={{ marginBlockStart: 4 }}>{t("form.coBrokeHint")}</div></div>
        <div style={{ gridColumn: "1 / -1" }}><Field label={t("form.internalNotes")}><textarea name="internal_notes" className="input" defaultValue={d.internal_notes ?? ""} /></Field></div>
      </div></section>

      <section className="card"><h2>{t("form.description")}</h2><div className="card-b col" style={{ gap: 14 }}>
        {(["fr", "he", "en"] as const).map((l) => (
          <div key={l} className="col" style={{ gap: 8 }} dir={l === "he" ? "rtl" : "ltr"} lang={l}>
            <div className="row" style={{ gap: 8 }}><div className="lbl grow">{l === "fr" ? "Français" : l === "he" ? "עברית" : "English"}</div><button type="button" className="btn sm ghost" disabled={busy} onClick={() => suggest(l)}>{t("form.suggest")}</button>{canTranslate && <button type="button" className="btn sm ghost" disabled={busy} onClick={() => translate(l)}>{t("form.translate")}</button>}</div>
            <input name={`title_${l}`} className="input" placeholder={t("form.title")} defaultValue={tr[l]?.title ?? ""} />
            <textarea name={`desc_${l}`} className="input" placeholder={t("form.descriptionPlaceholder")} defaultValue={tr[l]?.description ?? ""} />
          </div>
        ))}
        {sugErr && <p role="alert" className="err note">{t(`form.suggestErrors.${sugErr}`)}</p>}
        <p className="note">{t("form.suggestHint")}</p>
      </div></section>

      <div className="row" style={{ gap: 10 }}><button className="btn pri" disabled={pending}>{pending ? tc("saving") : tc("save")}</button></div>
    </form>
  );
}
