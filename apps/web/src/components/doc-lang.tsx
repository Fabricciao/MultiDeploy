"use client";
import { Languages } from "lucide-react";

export type DocLang = "fr" | "he" | "en";
const NAMES: Record<DocLang, string> = { he: "עברית", fr: "Français + עברית", en: "English + עברית" };

/** Langue du lien et du message envoyés au client. Le document signé contient toujours l'hébreu. */
export function DocLangSelect({ value, onChange, label }: { value: DocLang; onChange: (l: DocLang) => void; label: string }) {
  return (
    <label className="row" style={{ gap: 4 }} title={label}>
      <Languages size={14} aria-hidden className="faint" />
      <select className="langsel" value={value} aria-label={label} onChange={(e) => onChange(e.target.value as DocLang)}>
        {(["he", "fr", "en"] as const).map((l) => <option key={l} value={l}>{NAMES[l]}</option>)}
      </select>
    </label>
  );
}
/** Le lien de signature porte la langue dans son chemin : /fr/sign/… → /he/sign/… */
export const withLang = (url: string, l: DocLang) => url.replace(/\/(fr|he|en)\/(sign|mandate)\//, `/${l}/$2/`);
