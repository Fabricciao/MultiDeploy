"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, ChartNoAxesColumn, ChevronDown, ChevronRight, CircleHelp, Handshake, House, Menu, Mic, Moon, Plus, ScanLine, Settings, Sun, UserPlus, Users, X } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

const MODULES = ["properties", "clients", "deals", "agenda", "reports", "settings", "intake", "import"] as const;

/** Fil d'Ariane déduit de l'URL : module, puis sous-page. */
export function Crumbs() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const path = usePathname().split("/").filter(Boolean);
  const root = path[0];
  if (!root) return <div className="crumb"><b>{t("today")}</b></div>;
  const mod = (MODULES as readonly string[]).includes(root) ? t(root as "properties") : null;
  if (!mod) return <div className="crumb" />;
  const sub = path[path.length - 1] === "new" ? tc("new") : path[path.length - 1] === "edit" ? tc("edit") : path[path.length - 1] === "poster" ? t("poster") : path.length > 1 && /^[0-9a-f-]{36}$/i.test(path[1]!) ? t("detail") : null;
  return (
    <nav className="crumb" aria-label={t("crumbs")}>
      {sub ? <><Link href={`/${root}`}>{mod}</Link><span className="flip"><ChevronRight size={13} aria-hidden /></span><b>{sub}</b></> : <b>{mod}</b>}
    </nav>
  );
}

/** Bascule clair/sombre : le choix reste sur l'appareil, le script de <head> l'applique avant le premier affichage. */
export function ThemeToggle() {
  const t = useTranslations("common");
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches)); }, []);
  const flip = () => { const next = dark ? "light" : "dark"; document.documentElement.dataset.theme = next; try { localStorage.setItem("theme", next); } catch { /* stockage indisponible */ } setDark(!dark); };
  return <button type="button" className="iconbtn hide-m" onClick={flip} aria-label={t("toggleTheme")} title={t("toggleTheme")}>{dark ? <Sun size={17} strokeWidth={1.75} aria-hidden /> : <Moon size={17} strokeWidth={1.75} aria-hidden />}</button>;
}

export function NewMenu() {
  const t = useTranslations("common");
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => { if (ref.current) ref.current.open = false; };
  useEffect(() => {
    const open = () => { if (ref.current) ref.current.open = true; };
    const out = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    window.addEventListener("open-new", open); document.addEventListener("click", out);
    return () => { window.removeEventListener("open-new", open); document.removeEventListener("click", out); };
  }, []);
  return (
    <details className="pop hide-m" ref={ref}>
      <summary className="btn pri"><Plus size={15} aria-hidden />{t("new")}<ChevronDown size={13} aria-hidden /></summary>
      <div className="pop-body" style={{ minWidth: 220, padding: 6, insetInlineStart: "auto", insetInlineEnd: 0 }} onClick={close}>
        <Link href="/intake?mode=voice&target=contact" className="mi" style={{ fontWeight: 500 }}><Mic size={16} aria-hidden />{t("dictate")}</Link>
        <Link href="/intake?mode=scan&target=contact" className="mi" style={{ fontWeight: 500 }}><ScanLine size={16} aria-hidden />{t("scan")}</Link>
        <div className="sep" />
        <Link href="/clients/new" className="mi"><UserPlus size={16} aria-hidden />{t("newClient")}</Link>
        <Link href="/properties/new" className="mi"><House size={16} aria-hidden />{t("newProperty")}</Link>
      </div>
    </details>
  );
}

/** Navigation mobile : cinq onglets, le + au centre ouvre Dicter et Scanner. */
export function MobileNav() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const path = usePathname();
  const [sheet, setSheet] = useState<null | "new" | "more">(null);
  useEffect(() => setSheet(null), [path]);
  const tab = (href: string, label: string, icon: React.ReactNode, on: boolean) => <Link href={href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>{icon}{label}</Link>;
  const line = (href: string, label: string, icon: React.ReactNode) => <Link href={href} className="row" style={{ height: 50, gap: 12, borderBlockEnd: "1px solid var(--border)" }}>{icon}{label}<span className="sp faint flip"><ChevronRight size={14} aria-hidden /></span></Link>;
  return (
    <div className="mobnav">
      {sheet && <div className="scrim" onClick={() => setSheet(null)} aria-hidden />}
      {sheet === "new" && (
        <div className="sheet" role="dialog" aria-label={tc("new")}><div className="grab" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBlockEnd: 10 }}>
            <Link href="/intake?mode=voice&target=contact" className="card" style={{ padding: 14, background: "var(--signal-soft)", border: 0 }}><span style={{ color: "var(--signal-text)" }}><Mic size={24} strokeWidth={1.75} aria-hidden /></span><div style={{ fontWeight: 600, marginBlockStart: 10 }}>{tc("dictate")}</div></Link>
            <Link href="/intake?mode=scan&target=contact" className="card" style={{ padding: 14, background: "var(--accent-soft)", border: 0 }}><span style={{ color: "var(--accent-text)" }}><ScanLine size={24} strokeWidth={1.75} aria-hidden /></span><div style={{ fontWeight: 600, marginBlockStart: 10 }}>{tc("scan")}</div></Link>
          </div>
          {line("/clients/new", tc("newClient"), <UserPlus size={20} strokeWidth={1.75} aria-hidden />)}
          {line("/properties/new", tc("newProperty"), <House size={20} strokeWidth={1.75} aria-hidden />)}
        </div>
      )}
      {sheet === "more" && (
        <div className="sheet" role="dialog" aria-label={t("more")}><div className="grab" />
          {line("/deals", t("deals"), <Handshake size={20} strokeWidth={1.75} aria-hidden />)}
          {line("/agenda", t("agenda"), <CalendarDays size={20} strokeWidth={1.75} aria-hidden />)}
          {line("/reports", t("reports"), <ChartNoAxesColumn size={20} strokeWidth={1.75} aria-hidden />)}
          {line("/settings", t("settings"), <Settings size={20} strokeWidth={1.75} aria-hidden />)}
        </div>
      )}
      <nav className="tabbar" aria-label={t("label")}>
        {tab("/", t("today"), <Sun size={20} strokeWidth={1.75} aria-hidden />, path === "/")}
        {tab("/properties", t("properties"), <House size={20} strokeWidth={1.75} aria-hidden />, path.startsWith("/properties"))}
        <button type="button" onClick={() => setSheet(sheet === "new" ? null : "new")} aria-label={tc("new")}><span className="fab">{sheet === "new" ? <X size={24} aria-hidden /> : <Plus size={24} aria-hidden />}</span></button>
        {tab("/clients", t("clients"), <Users size={20} strokeWidth={1.75} aria-hidden />, path.startsWith("/clients"))}
        <button type="button" onClick={() => setSheet(sheet === "more" ? null : "more")} className={sheet === "more" ? "on" : ""}><Menu size={20} strokeWidth={1.75} aria-hidden />{t("more")}</button>
      </nav>
    </div>
  );
}

const GO: Record<string, string> = { a: "/", b: "/properties", c: "/clients", f: "/deals", p: "/agenda", r: "/reports" };

/** Raccourcis clavier globaux. Inactifs pendant la saisie. */
export function Shortcuts() {
  const t = useTranslations("shortcuts");
  const tn = useTranslations("nav");
  const router = useRouter();
  const [help, setHelp] = useState(false);
  useEffect(() => {
    let g = 0;
    const rows = () => Array.from(document.querySelectorAll<HTMLElement>("tr[data-row]"));
    const move = (d: number) => { const r = rows(); if (!r.length) return; const i = r.findIndex((x) => x.classList.contains("cur")); r[i]?.classList.remove("cur"); const n = r[Math.min(r.length - 1, Math.max(0, i + d))]!; n.classList.add("cur"); n.scrollIntoView({ block: "nearest" }); };
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === "escape") { setHelp(false); return; }
      if (Date.now() - g < 1200 && GO[k]) { g = 0; router.push(GO[k]!); return; }
      if (k === "g") { g = Date.now(); return; }
      if (k === "?") { setHelp((h) => !h); return; }
      if (k === "[") { window.dispatchEvent(new Event("toggle-rail")); return; }
      if (k === "n") { e.preventDefault(); window.dispatchEvent(new Event("open-new")); return; }
      if (k === "j") { e.preventDefault(); move(1); return; }
      if (k === "k") { e.preventDefault(); move(-1); return; }
      const cur = document.querySelector<HTMLElement>("tr[data-row].cur");
      if (!cur) return;
      if (k === "enter") cur.querySelector<HTMLAnchorElement>("a[data-open]")?.click();
      if (k === " ") { e.preventDefault(); cur.querySelector<HTMLAnchorElement>("a[data-peek]")?.click(); }
      if (k === "x") cur.querySelector<HTMLInputElement>("input[type=checkbox]")?.click();
    };
    const onHelp = () => setHelp(true);
    window.addEventListener("keydown", onKey); window.addEventListener("open-help", onHelp);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("open-help", onHelp); };
  }, [router]);
  if (!help) return null;
  const row = (keys: string[], label: string) => <div className="row" style={{ height: 30, fontSize: 13 }}><span className="grow">{label}</span>{keys.map((k) => <span key={k} className="kbd">{k}</span>)}</div>;
  return (
    <div role="dialog" aria-modal="true" aria-label={t("title")} className="overlay" onClick={() => setHelp(false)}>
      <div className="dialog" style={{ width: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="bd">
          <h3 style={{ marginBlockEnd: 14 }}>{t("title")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 24 }}>
            <div><div className="over" style={{ marginBlockEnd: 6 }}>{t("go")}</div>{row(["G", "A"], tn("today"))}{row(["G", "B"], tn("properties"))}{row(["G", "C"], tn("clients"))}{row(["G", "F"], tn("deals"))}{row(["G", "P"], tn("agenda"))}{row(["G", "R"], tn("reports"))}</div>
            <div><div className="over" style={{ marginBlockEnd: 6 }}>{t("general")}</div>{row(["⌘", "K"], t("search"))}{row(["N"], t("new"))}{row(["["], t("rail"))}{row(["?"], t("help"))}</div>
            <div><div className="over" style={{ marginBlockEnd: 6 }}>{t("list")}</div>{row(["J", "K"], t("move"))}{row(["↵"], t("open"))}{row([t("space")], t("peek"))}{row(["X"], t("select"))}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const HelpButton = ({ label }: { label: string }) => <button type="button" className="iconbtn hide-m" aria-label={label} title={label} onClick={() => window.dispatchEvent(new Event("open-help"))}><CircleHelp size={17} strokeWidth={1.75} aria-hidden /></button>;

/** Soumet un formulaire de filtres dès qu'un champ change. Le bouton Appliquer reste pour le clavier et sans JavaScript. */
export function AutoSubmit({ formId }: { formId: string }) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    let id: ReturnType<typeof setTimeout>;
    const later = (ms: number) => { clearTimeout(id); id = setTimeout(() => form.requestSubmit(), ms); };
    const onChange = () => later(250);
    const onInput = (e: Event) => { const el = e.target as HTMLInputElement; if (el.type === "search" || el.type === "text") later(450); };
    form.addEventListener("change", onChange); form.addEventListener("input", onInput);
    return () => { clearTimeout(id); form.removeEventListener("change", onChange); form.removeEventListener("input", onInput); };
  }, [formId]);
  return null;
}

/** Échap ferme l'aperçu latéral. */
export function PeekKeys({ closeHref, prevHref, nextHref }: { closeHref: string; prevHref?: string | null; nextHref?: string | null }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === "Escape") router.push(closeHref as "/", { scroll: false });
      if (e.key === "ArrowUp" && prevHref) { e.preventDefault(); router.push(prevHref as "/", { scroll: false }); }
      if (e.key === "ArrowDown" && nextHref) { e.preventDefault(); router.push(nextHref as "/", { scroll: false }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, closeHref, prevHref, nextHref]);
  return null;
}
