"use client";
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { quickStatusAction } from "@/app/[locale]/(app)/properties/actions";

const STATUSES = ["draft", "active", "under_offer", "sold", "rented", "withdrawn"] as const;
const TONE: Record<string, string> = { active: "ok", under_offer: "warn", sold: "info", rented: "info", withdrawn: "bad" };

/** Statut d'un bien modifiable en un clic depuis la liste (sans ouvrir la fiche). */
export function StatusSelect({ id, status, canEdit }: { id: string; status: string; canEdit: boolean }) {
  const t = useTranslations("props");
  const locale = useLocale();
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!canEdit) return <span className={`badge ${TONE[status] ?? ""}`}><i className="dot" />{t(`status.${status}`)}</span>;
  const change = (next: string) => {
    const prev = value; setValue(next); setError(null);
    start(async () => {
      const r = await quickStatusAction(locale, id, next);
      if (!r.ok) { setValue(prev); setError(t(`quickStatus.${r.error === "active_needs_price_city" ? "needsPriceCity" : "forbidden"}`)); }
    });
  };
  return (
    <span className="col" style={{ gap: 2, alignItems: "flex-start" }}>
      <select className={`st-sel badge ${TONE[value] ?? ""}`} value={value} disabled={pending} onChange={(e) => change(e.target.value)} aria-label={t("quickStatus.label")} title={t("quickStatus.label")} onClick={(e) => e.stopPropagation()}>
        {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
      </select>
      {error && <span className="note" role="alert" style={{ color: "var(--danger)", maxWidth: 160, whiteSpace: "normal" }}>{error}</span>}
    </span>
  );
}
