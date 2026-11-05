"use client";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mail, MessageCircle, Send } from "lucide-react";
import { sendSelection, type SendState } from "@/app/[locale]/(app)/send-action";
import { Ring } from "@/components/ui";

export type SendItem = { id: string; label: string; sub: string; score: number; warn?: string };

/** Envoi d'une sélection. mode=property : un bien → plusieurs clients ; mode=contact : un client → plusieurs biens. */
export function SendForm({ mode, fixedId, items, waApi = false }: { mode: "property" | "contact"; fixedId: string; items: SendItem[]; waApi?: boolean }) {
  const t = useTranslations("send");
  const locale = useLocale();
  const [state, action, pending] = useActionState<SendState, FormData>(sendSelection, null);
  const name = mode === "property" ? "contact" : "property";
  const done = new Map(state?.results?.map((r) => [r.contactId, r]));
  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name={mode === "property" ? "property" : "contact"} value={fixedId} />
      {items.length === 0 ? <p className="muted" style={{ padding: "12px 14px" }}>{t(mode === "property" ? "noClients" : "noProperties")}</p> : (
        <div>
          {items.map((it, i) => (
            <label key={it.id} className="row sel-row" style={{ padding: "10px 14px", borderTop: i ? "1px solid var(--line)" : 0, cursor: "pointer", gap: 10 }}>
              <input type="checkbox" className="ck" name={name} value={it.id} defaultChecked={it.score >= 80 && i < 3} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>{it.label}</div>
                <div className="note" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.sub}</div>
                {it.warn && <div className="note" style={{ color: "var(--warn)" }}>{it.warn}</div>}
              </div>
              <Ring value={it.score} />
            </label>
          ))}
        </div>
      )}
      {items.length > 0 && (
        <div className="col" style={{ gap: 10, padding: 14, borderTop: "1px solid var(--line)" }}>
          <div className="seg" style={{ display: "flex" }}>
            <label className="grow" style={{ cursor: "pointer" }}><input type="radio" name="channel" value="email" defaultChecked hidden className="peer" /><span className="seg-opt"><Mail size={14} aria-hidden />{t("email")}</span></label>
            <label className="grow" style={{ cursor: "pointer" }}><input type="radio" name="channel" value="whatsapp_link" hidden className="peer" /><span className="seg-opt"><MessageCircle size={14} aria-hidden />WhatsApp</span></label>
            {waApi && <label className="grow" style={{ cursor: "pointer" }}><input type="radio" name="channel" value="whatsapp_api" hidden className="peer" /><span className="seg-opt"><MessageCircle size={14} aria-hidden />{t("whatsappApi")}</span></label>}
          </div>
          <textarea name="message" className="input" placeholder={t("messagePlaceholder")} maxLength={600} />
          <button className="btn pri" disabled={pending}><Send size={15} aria-hidden />{pending ? t("sending") : t("send")}</button>
          {state?.error && <div className="err" role="alert">{t(`errors.${state.error}`)}</div>}
          {state?.results && (
            <ul className="col" style={{ gap: 6, margin: 0, padding: 0, listStyle: "none" }} role="status">
              {state.results.map((r) => {
                const it = items.find((x) => x.id === r.contactId);
                return (
                  <li key={r.contactId} className="row" style={{ gap: 8, fontSize: 12.5 }}>
                    <span className={`badge ${r.status === "sent" || r.status === "link" ? "ok" : r.status === "dry_run" ? "warn" : "bad"}`}>{t(`result.${r.status}`)}</span>
                    <span className="grow">{it?.label ?? ""}</span>
                    {r.waUrl && <a className="btn sm" href={r.waUrl} target="_blank" rel="noopener noreferrer"><MessageCircle size={13} aria-hidden />{t("openWhatsapp")}</a>}
                  </li>
                );
              })}
            </ul>
          )}
          {done.size > 0 && <div className="note">{t("dryRunNote")}</div>}
        </div>
      )}
    </form>
  );
}
