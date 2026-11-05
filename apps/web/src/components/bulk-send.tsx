"use client";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mail, MessageCircle, Send } from "lucide-react";
import { sendSelection, type SendState } from "@/app/[locale]/(app)/send-action";

export function BulkSend({ propertyIds, contacts }: { propertyIds: string[]; contacts: { id: string; label: string }[] }) {
  const t = useTranslations("send");
  const locale = useLocale();
  const [state, action, pending] = useActionState<SendState, FormData>(sendSelection, null);
  return (
    <form action={action} className="col" style={{ gap: 10 }}>
      <input type="hidden" name="locale" value={locale} />{propertyIds.map((id) => <input key={id} type="hidden" name="property" value={id} />)}
      <select name="contact" required className="input" aria-label={t("recipient")}><option value="">{t("recipient")}</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
      <div className="seg" style={{ display: "flex" }}>
        <label className="grow" style={{ cursor: "pointer" }}><input type="radio" name="channel" value="email" defaultChecked hidden /><span className="seg-opt"><Mail size={14} aria-hidden />{t("email")}</span></label>
        <label className="grow" style={{ cursor: "pointer" }}><input type="radio" name="channel" value="whatsapp_link" hidden /><span className="seg-opt"><MessageCircle size={14} aria-hidden />WhatsApp</span></label></div>
      <textarea name="message" className="input" placeholder={t("messagePlaceholder")} maxLength={600} />
      <button className="btn pri" disabled={pending}><Send size={15} aria-hidden />{pending ? t("sending") : t("send")}</button>
      {state?.error && <div className="err" role="alert">{t(`errors.${state.error}`)}</div>}
      {state?.results && <ul style={{ margin: 0, padding: 0, listStyle: "none" }} role="status">{state.results.map((r) => <li key={r.contactId} className="row" style={{ gap: 8 }}><span className={`badge ${r.status === "sent" || r.status === "link" ? "ok" : r.status === "dry_run" ? "warn" : "bad"}`}>{t(`result.${r.status}`)}</span>{r.waUrl && <a className="btn sm" href={r.waUrl} target="_blank" rel="noopener noreferrer">{t("openWhatsapp")}</a>}</li>)}</ul>}
    </form>
  );
}
