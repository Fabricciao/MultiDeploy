"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, CalendarDays, ChartNoAxesColumn, Handshake, House, Megaphone, PanelLeftClose, PanelLeftOpen, Settings, Sun, Users, type LucideIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Mark } from "@/components/logo";

type Item = { key: string; href: string; icon: LucideIcon; ready?: boolean };
const DAILY: Item[] = [{ key: "today", href: "/", icon: Sun }, { key: "agenda", href: "/agenda", icon: CalendarDays }];
const PORTFOLIO: Item[] = [{ key: "properties", href: "/properties", icon: House }, { key: "clients", href: "/clients", icon: Users }, { key: "deals", href: "/deals", icon: Handshake }];
const GROWTH: Item[] = [{ key: "marketing", href: "/marketing", icon: Megaphone, ready: false }, { key: "reports", href: "/reports", icon: ChartNoAxesColumn }];

export type RailView = { id: string; name: string; href: string };

export function Sidebar({ orgName, logoUrl, userName, avatarUrl, roleLabel, counts, views, mini: miniInit }: { orgName: string; logoUrl?: string | null; userName: string; avatarUrl?: string | null; roleLabel: string; counts: { properties: number; clients: number }; views: RailView[]; mini: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [mini, setMini] = useState(miniInit);
  const toggle = () => setMini((m) => { document.cookie = `rail=${m ? "full" : "mini"};path=/;max-age=31536000;samesite=lax`; return !m; });
  useEffect(() => { const on = () => toggle(); window.addEventListener("toggle-rail", on); return () => window.removeEventListener("toggle-rail", on); }, []);
  const cnt = (k: string) => (k === "properties" ? counts.properties : k === "clients" ? counts.clients : null);
  const link = ({ key, href, icon: Icon, ready = true }: Item) => {
    const on = href === "/" ? pathname === "/" : pathname.startsWith(href);
    const n = cnt(key);
    return ready ? (
      <Link key={key} href={href} className={`nav ${on ? "on" : ""}`} aria-current={on ? "page" : undefined} title={mini ? t(key) : undefined}>
        <Icon size={16} strokeWidth={1.75} aria-hidden /><span>{t(key)}</span>{n !== null && <span className="cnt">{n}</span>}
      </Link>
    ) : (
      <span key={key} className="nav" aria-disabled="true" title={t("soon")} style={{ opacity: 0.55, cursor: "not-allowed" }}>
        <Icon size={16} strokeWidth={1.75} aria-hidden /><span>{t(key)}</span>
      </span>
    );
  };
  const initials = userName.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <aside className={`side ${mini ? "mini" : ""}`} aria-label={t("label")}>
      <div className="org">
        <div className="mark" style={{ background: "var(--surface)", color: "var(--rail)" }}>{logoUrl ? <img src={logoUrl} alt="" /> : orgName[0]}</div>
        <div className="grow"><b className="trunc">{orgName}</b><small>{roleLabel}</small></div>
      </div>
      {DAILY.map(link)}
      <div className="grp">{t("groups.portfolio")}</div>
      {PORTFOLIO.map(link)}
      <div className="grp">{t("groups.growth")}</div>
      {GROWTH.map(link)}
      {views.length > 0 && <div className="grp">{t("groups.views")}</div>}
      {views.slice(0, 6).map((v) => <Link key={v.id} href={v.href} className="nav" title={v.name}><Bookmark size={14} strokeWidth={1.75} aria-hidden /><span className="trunc">{v.name}</span></Link>)}
      <div className="side-foot">
        {link({ key: "settings", href: "/settings", icon: Settings })}
        <Link href="/settings/profile" className="me" title={t("profile")}><span className="avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : initials}</span><div className="grow"><b className="trunc">{userName}</b></div></Link>
        <div className="row" style={{ gap: 4, justifyContent: mini ? "center" : undefined }}>
          <div className="powered grow"><Mark size={11} color="var(--rail-muted)" /><span>{t("poweredBy")}</span></div>
          <button type="button" onClick={toggle} className="rail-toggle" aria-label={t(mini ? "expand" : "collapse")} title={t(mini ? "expand" : "collapse")}><span className="flip">{mini ? <PanelLeftOpen size={15} aria-hidden /> : <PanelLeftClose size={15} aria-hidden />}</span></button>
        </div>
      </div>
    </aside>
  );
}
