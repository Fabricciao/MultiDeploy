"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Send, X } from "lucide-react";

/** Barre qui apparaît dès qu'un bien est coché : le nombre sélectionné et l'envoi groupé à un client. */
export function BulkBar({ formId }: { formId: string }) {
  const t = useTranslations("props");
  const [n, setN] = useState(0);
  const boxes = () => Array.from(document.querySelectorAll<HTMLInputElement>(`input[type=checkbox][form="${formId}"]`));
  useEffect(() => {
    const count = () => setN(boxes().filter((b) => b.checked).length);
    count();
    document.addEventListener("change", count);
    return () => document.removeEventListener("change", count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);
  if (n === 0) return null;
  return (
    <div className="bulkbar"><div className="bulk" role="status">
      <b style={{ fontWeight: 600 }}>{t("bulk.count", { n })}</b>
      <button type="submit" form={formId} className="btn sm pri"><Send size={13} aria-hidden className="flip" />{t("bulk.send")}</button>
      <button type="button" className="btn sm" onClick={() => { boxes().forEach((b) => { b.checked = false; }); setN(0); }} aria-label={t("bulk.clear")} title={t("bulk.clear")}><X size={13} aria-hidden /></button>
    </div></div>
  );
}
