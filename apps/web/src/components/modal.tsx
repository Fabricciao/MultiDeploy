"use client";
import { useEffect } from "react";
import { X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

/** Fenêtre posée sur la page, pilotée par l'URL : Échap, la croix ou un clic à côté ramènent à `closeHref`. */
export function Modal({ title, closeHref, closeLabel, wide = false, children }: { title: string; closeHref: string; closeLabel: string; wide?: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const close = () => router.push(closeHref as "/", { scroll: false });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") router.push(closeHref as "/", { scroll: false }); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, closeHref]);
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="overlay" style={{ paddingBlockStart: "8vh" }} onClick={close}>
      <div className={`dialog ${wide ? "wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="hd"><h3 className="trunc">{title}</h3><button type="button" className="iconbtn" onClick={close} aria-label={closeLabel} title={closeLabel}><X size={17} aria-hidden /></button></div>
        {children}
      </div>
    </div>
  );
}
