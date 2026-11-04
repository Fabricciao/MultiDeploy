"use client";
import { useTranslations } from "next-intl";
import { CalendarDays, ChartNoAxesColumn, Handshake, House, Megaphone, Settings, Sun, Users } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";

const ITEMS = [
  { key: "today", href: "/", icon: Sun, ready: true },
  { key: "properties", href: "/properties", icon: House, ready: true },
  { key: "clients", href: "/clients", icon: Users, ready: true },
  { key: "deals", href: "/deals", icon: Handshake, ready: true },
  { key: "agenda", href: "/agenda", icon: CalendarDays, ready: false },
  { key: "marketing", href: "/marketing", icon: Megaphone, ready: false },
  { key: "reports", href: "/reports", icon: ChartNoAxesColumn, ready: false },
  { key: "settings", href: "/settings", icon: Settings, ready: true },
] as const;

export function Sidebar({ orgName, userName, roleLabel, counts }: { orgName: string; userName: string; roleLabel: string; counts: { properties: number; clients: number } }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <aside className="side" aria-label={t("label")}>
      <div className="org"><div className="mark">{orgName[0]}</div><div><b>{orgName}</b><small>{roleLabel}</small></div></div>
      {ITEMS.map(({ key, href, icon: Icon, ready }) => {
        const on = href === "/" ? pathname === "/" : pathname.startsWith(href);
        const cnt = key === "properties" ? counts.properties : key === "clients" ? counts.clients : null;
        return ready ? (
          <Link key={key} href={href} className={`nav ${on ? "on" : ""}`} aria-current={on ? "page" : undefined}>
            <Icon size={16} strokeWidth={1.75} aria-hidden /><span>{t(key)}</span>{cnt !== null && <span className="cnt tab">{cnt}</span>}
          </Link>
        ) : (
          <span key={key} className="nav" aria-disabled="true" title={t("soon")} style={{ opacity: 0.5, cursor: "not-allowed" }}>
            <Icon size={16} strokeWidth={1.75} aria-hidden /><span>{t(key)}</span>
          </span>
        );
      })}
      <div className="side-foot"><span className="avatar">{userName.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span><div className="grow"><b style={{ fontWeight: 500, display: "block", lineHeight: 1.2 }}>{userName}</b></div></div>
    </aside>
  );
}
