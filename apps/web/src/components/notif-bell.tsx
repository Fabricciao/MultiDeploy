"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlarmClock, ArrowRightLeft, Bell, CalendarCheck, Eye, ListChecks, UserPlus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Notif } from "@/lib/data/cockpit";

const ICON = { lead: UserPlus, opened: Eye, task: ListChecks, mandate: AlarmClock, stage: ArrowRightLeft, visit: CalendarCheck } as const;
const TONE = { lead: "acc", opened: "sig", task: "", mandate: "", stage: "acc", visit: "ok" } as const;

/** Cloche de notifications. Les éléments plus récents que le cookie `notif_seen` sont « nouveaux ». */
export function NotifBell({ items, seen }: { items: Notif[]; seen: string | null }) {
  const t = useTranslations("notifs");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [since, setSince] = useState(seen);
  const ref = useRef<HTMLDivElement>(null);
  const fresh = items.filter((n) => !since || n.at > since).length;
  useEffect(() => {
    if (!open) return;
    const out = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", out); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", out); document.removeEventListener("keydown", esc); };
  }, [open]);
  const markRead = () => { const now = new Date().toISOString(); document.cookie = `notif_seen=${now};path=/;max-age=31536000;samesite=lax`; setSince(now); };
  const when = (iso: string) => {
    const d = new Date(iso), days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    const tag = locale === "he" ? "he-IL" : locale === "en" ? "en-IL" : "fr-FR";
    return days < 1 ? new Intl.DateTimeFormat(tag, { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit" }).format(d) : new Intl.DateTimeFormat(tag, { timeZone: "Asia/Jerusalem", weekday: "short" }).format(d);
  };
  const text = (n: Notif) => t(`k.${n.kind}`, { name: n.name ?? "", extra: n.extra ?? "" });
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" className="iconbtn" aria-label={fresh ? t("labelNew", { n: fresh }) : t("label")} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Bell size={17} strokeWidth={1.75} aria-hidden />{fresh > 0 && <i />}
      </button>
      {open && (
        <div className="notifs" role="dialog" aria-label={t("label")}>
          <div className="card-h" style={{ borderBlockEnd: "1px solid var(--border)" }}>{t("label")}{fresh > 0 && <span className="cnt-b">{fresh}</span>}
            {fresh > 0 && <button type="button" className="sp note" style={{ color: "var(--accent-text)", fontWeight: 500 }} onClick={markRead}>{t("markRead")}</button>}</div>
          <div className="list">
            {items.length === 0 ? <p className="muted card-b">{t("empty")}</p> : items.map((n) => {
              const I = ICON[n.kind];
              return (
                <Link key={n.id} href={n.href} className={`nt ${!since || n.at > since ? "new" : ""}`} onClick={() => setOpen(false)}>
                  <span className={`tl-d ${TONE[n.kind]}`}><I size={14} aria-hidden /></span>
                  <div style={{ minWidth: 0 }}><p>{text(n)}</p></div>
                  <time>{when(n.at)}</time>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
