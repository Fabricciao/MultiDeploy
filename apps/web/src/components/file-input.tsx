"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Paperclip } from "lucide-react";

/** Champ de fichier dont le libellé suit la langue du CRM (le champ natif suit celle du navigateur). */
export function FileInput({ name, accept, multiple = false, capture, disabled, id, label, required }: { name: string; accept?: string; multiple?: boolean; capture?: "environment" | "user"; disabled?: boolean; id?: string; label?: string; required?: boolean }) {
  const t = useTranslations("common");
  const ref = useRef<HTMLInputElement>(null);
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    const form = ref.current?.form; if (!form) return;
    const clear = () => setNames([]);
    form.addEventListener("reset", clear);
    return () => form.removeEventListener("reset", clear);
  }, []);
  return (
    <label className="filebtn" style={{ position: "relative", opacity: disabled ? 0.55 : 1 }}>
      <input ref={ref} id={id} type="file" name={name} accept={accept} multiple={multiple} capture={capture} disabled={disabled} required={required} aria-label={label}
        onChange={(e) => setNames(Array.from(e.target.files ?? []).map((f) => f.name))} />
      <span className="btn sm" aria-hidden><Paperclip size={14} />{t(multiple ? "chooseFiles" : "chooseFile")}</span>
      <span className="fname trunc" aria-live="polite">{names.length === 0 ? t("noFile") : names.length === 1 ? names[0] : t("filesChosen", { n: names.length })}</span>
    </label>
  );
}
