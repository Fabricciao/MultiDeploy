"use client";
import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy, FileCheck2, Mail, MessageCircle } from "lucide-react";
import { sendSlipEmailAction, type SlipEmailState } from "@/app/[locale]/(app)/visit-slips/actions";
import type { SlipInfo } from "@/lib/data/slips";
import { DocLangSelect, withLang, type DocLang } from "@/components/doc-lang";

/**
 * Bon de visite en un clic : WhatsApp (message préenregistré + lien), e-mail, ou lien à copier.
 * Une fois signé : le PDF signé, rangé sur la fiche du client, du bien et dans « Bons de visite ».
 */
export function SlipActions({ s, sm = false }: { s: SlipInfo; sm?: boolean }) {
  const t = useTranslations("slips");
  const locale = useLocale();
  const [state, action, pending] = useActionState<SlipEmailState, FormData>(sendSlipEmailAction.bind(null, s.id), null);
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState<DocLang>(s.lang ?? "he");
  const b = `btn ${sm ? "sm" : ""}`;
  const fmt = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "medium", timeZone: "Asia/Jerusalem" });
  if (s.signed) return (
    <div className="row wrap" style={{ gap: 6 }}>
      <span className="badge ok"><Check size={12} aria-hidden />{s.signedAt ? t("signedOn", { date: fmt.format(new Date(s.signedAt)) }) : t("signed")}</span>
      {s.doc && <a href={`/api/files/${s.doc}`} target="_blank" rel="noreferrer" className={b}><FileCheck2 size={14} aria-hidden />{t("pdf")}</a>}
    </div>
  );
  if (!s.hasContact) return <span className="note">{t("noContact")}</span>;
  if (!s.url) return <span className="badge warn">{t("pending")}</span>;
  const sent = state?.status === "sent" || state?.status === "dry_run";
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      {s.wa ? <a href={s.wa.startsWith("/api/") ? `${s.wa}?l=${lang}` : s.wa} target="_blank" rel="noopener noreferrer" className={`${b} pri`}><MessageCircle size={14} aria-hidden />{t("whatsapp")}</a>
        : <span className="note">{t("noPhone")}</span>}
      {s.hasEmail && <form action={action}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="lang" value={lang} />
        <button className={b} disabled={pending || sent}>{sent ? <Check size={14} aria-hidden /> : <Mail size={14} aria-hidden />}{sent ? t("emailSent") : pending ? t("sending") : t("email")}</button></form>}
      <button type="button" className={`${b} ghost`} onClick={async () => { try { await navigator.clipboard.writeText(withLang(s.url!, lang)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* refusé */ } }}>
        {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}{copied ? t("copied") : t("copy")}</button>
      <DocLangSelect value={lang} onChange={setLang} label={t("lang")} />
      {state?.status === "failed" && <span role="alert" className="err note">{t("emailFailed")}</span>}
      {state?.status === "no_email" && <span role="alert" className="err note">{t("noEmail")}</span>}
      {s.sentAt && !sent && <span className="note">{t("sentOn", { date: fmt.format(new Date(s.sentAt)) })}</span>}
    </div>
  );
}
