"use client";
import { useTranslations } from "next-intl";
import { CalendarDays, ChartNoAxesColumn, Handshake, Home, Megaphone, Settings, Sun, Users } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";

const ITEMS = [
  { key: "today", href: "/", icon: Sun, ready: true },
  { key: "properties", href: "/properties", icon: Home, ready: false },
  { key: "clients", href: "/clients", icon: Users, ready: false },
  { key: "deals", href: "/deals", icon: Handshake, ready: false },
  { key: "agenda", href: "/agenda", icon: CalendarDays, ready: false },
  { key: "marketing", href: "/marketing", icon: Megaphone, ready: false },
  { key: "reports", href: "/reports", icon: ChartNoAxesColumn, ready: false },
  { key: "settings", href: "/settings", icon: Settings, ready: false },
] as const;

export function Sidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className="flex w-52 shrink-0 flex-col gap-0.5 border-e border-line bg-surface p-2">
      <div className="px-2 pb-3 pt-2 text-sm font-semibold tracking-tight">{t("brand")}</div>
      {ITEMS.map(({ key, href, icon: Icon, ready }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        const cls = `flex h-8 items-center gap-2.5 rounded-ui px-2 text-[13px] ${
          active ? "bg-accent-soft font-medium text-accent-ink" : ready ? "text-ink hover:bg-sunken" : "cursor-not-allowed text-muted/70"
        }`;
        return ready ? (
          <Link key={key} href={href} className={cls} aria-current={active ? "page" : undefined}>
            <Icon size={16} strokeWidth={1.75} aria-hidden /> {t(key)}
          </Link>
        ) : (
          <span key={key} className={cls} aria-disabled="true" title={t("soon")}>
            <Icon size={16} strokeWidth={1.75} aria-hidden /> {t(key)}
          </span>
        );
      })}
    </nav>
  );
}
