"use client";
import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy, Mail, MessageCircle } from "lucide-react";
import { createMandateAction, sendMandateEmailAction, type MandateEmailState, type MandateFormState } from "@/app/[locale]/(app)/properties/[id]/mandate-actions";
import { ACTIONS } from "@/lib/mandate/actions";
import type { MandateLinks } from "@/lib/data/mandates";
import { DocLangSelect, withLang, type DocLang } from "@/components/doc-lang";

type Owner = { id: string; name: string };
/** Nouveau mandat d'exclusivité : propriétaire, durée (6 mois max. pour un logement), prix, commission, actions de commercialisation (2 au moins). */
export function MandateForm({ propertyId, owners, price, commission, license }: { propertyId: string; owners: Owner[]; price: number | null; commission: number; license: string }) {
  const t = useTranslations("mandate");
  const locale = useLocale();
  const [state, action, pending] = useActionState<MandateFormState, FormData>(createMandateAction.bind(null, propertyId), null);
  const [owner, setOwner] = useState(owners[0]?.id ?? "");
  const today = new Date(), end = new Date(today); end.setMonth(end.getMonth() + 6); end.setDate(end.getDate() - 1);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (state?.ok) return <p className="badge ok"><Check size={12} aria-hidden />{t("created")}</p>;
  return (
    <form action={action} className="col" style={{ gap: 12 }}>
      <input type="hidden" name="locale" value={locale} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        {owners.length > 0 && <label className="col" style={{ gap: 4 }}><span className="lbl">{t("owner")}</span>
          <select name="contact" className="input" value={owner} onChange={(e) => setOwner(e.target.value)}>{owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}<option value="">{t("otherOwner")}</option></select></label>}
        <label className="col" style={{ gap: 4 }}><span className="lbl">{t("ownerName")}</span><input key={owner} name="owner_name" className="input" required minLength={2} maxLength={120} defaultValue={owners.find((o) => o.id === owner)?.name ?? ""} /></label>
        <label className="col" style={{ gap: 4 }}><span className="lbl">{t("license")}</span><input name="license" className="input ltr" dir="ltr" maxLength={40} defaultValue={license} /></label>
        <label className="col" style={{ gap: 4 }}><span className="lbl">{t("from")}</span><input name="starts_on" type="date" className="input" required defaultValue={iso(today)} /></label>
        <label className="col" style={{ gap: 4 }}><span className="lbl">{t("to")}</span><input name="ends_on" type="date" className="input" required defaultValue={iso(end)} /></label>
        <label className="col" style={{ gap: 4 }}><span className="lbl">{t("price")}</span><input name="price" type="number" min="0" step="1000" className="input" defaultValue={price ?? ""} /></label>
        <label className="col" style={{ gap: 4 }}><span className="lbl">{t("commission")}</span><input name="commission" type="number" min="0" max="20" step="0.1" className="input" required defaultValue={commission} /></label>
      </div>
      <div><div className="lbl">{t("actions")}</div><div className="row wrap" style={{ gap: "6px 14px" }}>
        {ACTIONS.map((a) => <label key={a} className="row" style={{ gap: 6 }}><input type="checkbox" className="ck" name="actions" value={a} defaultChecked={["sign", "internet", "social"].includes(a)} />{t(`a.${a}`)}</label>)}
      </div><p className="note" style={{ marginBlockStart: 4 }}>{t("actionsHint")}</p></div>
      {state?.error && <div role="alert" className="err">{t(`errors.${state.error}`)}</div>}
      <div className="row" style={{ gap: 8 }}><button className="btn pri" disabled={pending}>{pending ? t("creating") : t("create")}</button><span className="note">{t("legal")}</span></div>
    </form>
  );
}

/** Envoi du mandat au propriétaire en un clic : WhatsApp, e-mail ou lien. */
export function MandateSend({ id, links, lang: initial }: { id: string; links: MandateLinks; lang?: string | null }) {
  const ts = useTranslations("slips");
  const locale = useLocale();
  const [state, action, pending] = useActionState<MandateEmailState, FormData>(sendMandateEmailAction.bind(null, id), null);
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState<DocLang>(initial === "he" || initial === "en" || initial === "fr" ? initial : "he");
  if (!links.url) return null;
  const sent = state?.status === "sent" || state?.status === "dry_run";
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      {links.wa && <a href={links.wa.startsWith("/api/") ? `${links.wa}?l=${lang}` : links.wa} target="_blank" rel="noopener noreferrer" className="btn sm pri"><MessageCircle size={14} aria-hidden />{ts("whatsapp")}</a>}
      {links.hasEmail && <form action={action}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="lang" value={lang} /><button className="btn sm" disabled={pending || sent}>{sent ? <Check size={14} aria-hidden /> : <Mail size={14} aria-hidden />}{sent ? ts("emailSent") : pending ? ts("sending") : ts("email")}</button></form>}
      <button type="button" className="btn sm ghost" onClick={async () => { try { await navigator.clipboard.writeText(withLang(links.url!, lang)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* refusé */ } }}>
        {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}{copied ? ts("copied") : ts("copy")}</button>
      <DocLangSelect value={lang} onChange={setLang} label={ts("lang")} />
      {state?.status === "failed" && <span role="alert" className="err note">{ts("emailFailed")}</span>}
      {state?.status === "no_email" && <span role="alert" className="err note">{ts("noEmail")}</span>}
    </div>
  );
}
