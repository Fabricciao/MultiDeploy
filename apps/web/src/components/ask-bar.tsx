"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

/** Recherche par phrase : « 4 pièces Raanana moins de 3,5 M avec mamad » devient des filtres (règles, sans IA). */
export function AskBar({ view }: { view?: string }) {
  const t = useTranslations("props.ask");
  const locale = useLocale();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [miss, setMiss] = useState(false);
  const go = async () => {
    if (q.trim().length < 3) return;
    const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&l=${locale}`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
    const href = r?.nl?.href as string | undefined;
    if (!href) { setMiss(true); return; }
    setMiss(false);
    router.push((view ? `${href}${href.includes("?") ? "&" : "?"}view=${view}` : href) as "/");
  };
  return (
    <div style={{ marginBlockEnd: 10 }}>
      <form className="ask" onSubmit={(e) => { e.preventDefault(); void go(); }} role="search">
        <span style={{ color: "var(--signal-text)" }}><Sparkles size={15} aria-hidden /></span>
        <input value={q} onChange={(e) => { setQ(e.target.value); setMiss(false); }} placeholder={t("placeholder")} aria-label={t("label")} />
        <span className="kbd">↵</span>
      </form>
      {miss && <p className="note" role="status" style={{ marginBlockStart: 4 }}>{t("miss")}</p>}
    </div>
  );
}
