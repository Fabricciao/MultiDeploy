"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Home, Mic, Plus, ScanLine, Search, Sparkles, UserPlus, Users } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

type Item = { key: string; label: string; sub?: string; href: string; icon: React.ReactNode; group: string };
type Resp = { properties: { id: string; label: string; sub: string }[]; contacts: { id: string; label: string; sub: string }[]; nl: { href: string } | null };

export function CommandPalette() {
  const t = useTranslations("palette");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [data, setData] = useState<Resp | null>(null);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); } else if (e.key === "Escape") setOpen(false); };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey); window.addEventListener("open-palette", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("open-palette", onOpen); };
  }, []);
  useEffect(() => { if (open) { setQ(""); setData(null); setSel(0); setTimeout(() => input.current?.focus(), 30); } }, [open]);
  useEffect(() => {
    if (!open || q.trim().length < 2) { setData(null); return; }
    const ctl = new AbortController(); const id = setTimeout(async () => { try { const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&l=${locale}`, { signal: ctl.signal }); if (r.ok) { setData(await r.json()); setSel(0); } } catch { /* annulé */ } }, 150);
    return () => { clearTimeout(id); ctl.abort(); };
  }, [q, open, locale]);

  const actions: Item[] = [
    { key: "a1", label: t("actions.newClient"), href: "/clients/new", icon: <UserPlus size={15} />, group: t("groups.actions") }, { key: "a2", label: t("actions.newProperty"), href: "/properties/new", icon: <Plus size={15} />, group: t("groups.actions") },
    { key: "a3", label: t("actions.dictate"), href: "/intake?mode=voice&target=contact", icon: <Mic size={15} />, group: t("groups.actions") }, { key: "a4", label: t("actions.scan"), href: "/intake?mode=scan&target=contact", icon: <ScanLine size={15} />, group: t("groups.actions") },
  ];
  const items: Item[] = q.trim().length < 2 ? actions : [
    ...(data?.nl ? [{ key: "nl", label: t("nl"), sub: q, href: data.nl.href, icon: <Sparkles size={15} />, group: t("groups.smart") }] : []),
    ...(data?.properties ?? []).map((p) => ({ key: `p${p.id}`, label: p.label, sub: p.sub, href: `/properties/${p.id}`, icon: <Home size={15} />, group: t("groups.properties") })),
    ...(data?.contacts ?? []).map((c) => ({ key: `c${c.id}`, label: c.label, sub: c.sub, href: `/clients/${c.id}`, icon: <Users size={15} />, group: t("groups.clients") })),
    ...actions.filter((a) => a.label.toLowerCase().includes(q.toLowerCase())),
  ];
  const go = useCallback((it: Item | undefined) => { if (it) { setOpen(false); router.push(it.href); } }, [router]);
  if (!open) return null;
  let last = "";
  return (
    <div role="dialog" aria-modal="true" aria-label={t("title")} onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgb(12 18 36/.45)", zIndex: 80, display: "grid", placeItems: "start center", paddingTop: "12vh" }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "min(620px, 92vw)", overflow: "hidden", boxShadow: "0 20px 60px -10px rgb(0 0 0/.4)" }}>
        <div className="row" style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", gap: 10 }}>
          <Search size={16} aria-hidden />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("placeholder")} aria-label={t("placeholder")} className="grow" style={{ border: 0, outline: 0, background: "transparent", fontSize: 15 }}
            onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); } else if (e.key === "Enter") go(items[sel]); }} />
          <span className="kbd">Esc</span>
        </div>
        <div role="listbox" style={{ maxHeight: 360, overflow: "auto", padding: 6 }}>
          {items.length === 0 && <p className="muted" style={{ padding: 16 }}>{t("none")}</p>}
          {items.map((it, i) => { const head = it.group !== last ? (last = it.group) : null; return (
            <div key={it.key}>{head && <div className="note" style={{ padding: "8px 10px 2px", fontWeight: 600 }}>{head}</div>}
              <div role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => go(it)} className="row" style={{ gap: 10, padding: "8px 10px", borderRadius: 6, cursor: "pointer", background: i === sel ? "var(--accent-soft)" : undefined }}>
                <span className="muted">{it.icon}</span><span className="grow" style={{ fontWeight: 500 }}>{it.label}</span>{it.sub && <span className="note ltr">{it.sub}</span>}</div></div>); })}
        </div>
      </div>
    </div>
  );
}
export function PaletteButton({ label }: { label: string }) {
  return <button type="button" className="search" onClick={() => window.dispatchEvent(new Event("open-palette"))} style={{ cursor: "pointer", textAlign: "start" }}><Search size={14} aria-hidden /><span className="grow">{label}</span><span className="kbd ltr">Ctrl K</span></button>;
}
