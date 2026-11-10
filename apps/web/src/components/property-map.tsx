"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

export type MapPoint = { id: string; lat: number; lng: number; label: string; title: string; href: string; approx: boolean };

const T = 256;
const px = (lng: number, lat: number, z: number) => {
  const s = T * 2 ** z, r = (lat * Math.PI) / 180;
  return { x: ((lng + 180) / 360) * s, y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * s };
};
/** Décalage déterministe pour les biens placés au centre de leur ville (sans coordonnées exactes). */
const jitter = (id: string) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0; return { dx: ((h & 0xff) / 255 - 0.5) * 0.012, dy: (((h >> 8) & 0xff) / 255 - 0.5) * 0.012 }; };

/**
 * Carte des biens sans bibliothèque : tuiles OpenStreetMap, glisser pour déplacer, boutons pour zoomer.
 * Les prix sont des épingles ; survol synchronisé avec la liste par l'attribut data-pid.
 */
export function PropertyMap({ points }: { points: MapPoint[] }) {
  const t = useTranslations("props.map");
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 500 });
  const pts = useMemo(() => points.map((p) => { if (!p.approx) return p; const j = jitter(p.id); return { ...p, lat: p.lat + j.dy, lng: p.lng + j.dx }; }), [points]);
  const fit = useMemo(() => {
    if (!pts.length) return { z: 11, c: px(34.85, 32.1, 11) };
    for (let z = 15; z >= 6; z--) {
      const a = pts.map((p) => px(p.lng, p.lat, z)), xs = a.map((q) => q.x), ys = a.map((q) => q.y);
      if (Math.max(...xs) - Math.min(...xs) < size.w - 120 && Math.max(...ys) - Math.min(...ys) < size.h - 120) return { z, c: { x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2 } };
    }
    return { z: 6, c: px(pts[0]!.lng, pts[0]!.lat, 6) };
  }, [pts, size.w, size.h]);
  const [view, setView] = useState(fit);
  const [hot, setHot] = useState<string | null>(null);
  const [ready, setReady] = useState(false); // la carte dépend de la taille réelle : rendu côté navigateur seulement
  useEffect(() => setReady(true), []);
  useEffect(() => setView(fit), [fit]);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight })); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const on = (e: Event) => { const id = (e.target as HTMLElement).closest?.("[data-pid]")?.getAttribute("data-pid"); setHot(id ?? null); };
    document.addEventListener("mouseover", on); return () => document.removeEventListener("mouseover", on);
  }, []);
  const drag = useRef<{ x: number; y: number; c: { x: number; y: number } } | null>(null);
  const zoom = (d: number) => setView((v) => { const z = Math.min(18, Math.max(5, v.z + d)), k = 2 ** (z - v.z); return { z, c: { x: v.c.x * k, y: v.c.y * k } }; });
  const ox = view.c.x - size.w / 2, oy = view.c.y - size.h / 2, n = 2 ** view.z;
  const tiles: { k: string; x: number; y: number; src: string }[] = [];
  for (let tx = Math.floor(ox / T); tx <= Math.floor((ox + size.w) / T); tx++) for (let ty = Math.floor(oy / T); ty <= Math.floor((oy + size.h) / T); ty++) {
    if (ty < 0 || ty >= n) continue; const wx = ((tx % n) + n) % n;
    tiles.push({ k: `${view.z}/${tx}/${ty}`, x: tx * T - ox, y: ty * T - oy, src: `https://tile.openstreetmap.org/${view.z}/${wx}/${ty}.png` });
  }
  return (
    <div ref={box} className={`mapw ${drag.current ? "drag" : ""}`} role="region" aria-label={t("label")}
      onPointerDown={(e) => { if ((e.target as HTMLElement).closest("button")) return; drag.current = { x: e.clientX, y: e.clientY, c: view.c }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => { const d = drag.current; if (d) setView((v) => ({ ...v, c: { x: d.c.x - (e.clientX - d.x), y: d.c.y - (e.clientY - d.y) } })); }}
      onPointerUp={() => { drag.current = null; }}
      onWheel={(e) => { if (Math.abs(e.deltaY) > 30) zoom(e.deltaY < 0 ? 1 : -1); }}>
      {ready && <div className="tiles" aria-hidden>{tiles.map((q) => <img key={q.k} src={q.src} alt="" style={{ insetInlineStart: Math.round(q.x), insetBlockStart: Math.round(q.y) }} draggable={false} />)}</div>}
      {ready && pts.map((p) => { const q = px(p.lng, p.lat, view.z); return (
        <button key={p.id} type="button" data-pid={p.id} className={`pin ${hot === p.id ? "hot" : ""}`} title={p.title + (p.approx ? ` · ${t("approx")}` : "")}
          style={{ insetInlineStart: Math.round(q.x - ox), insetBlockStart: Math.round(q.y - oy) }} onClick={() => router.push(p.href as "/", { scroll: false })}>{p.label}</button>); })}
      <div className="ctl"><button type="button" className="btn icon" aria-label={t("zoomIn")} onClick={() => zoom(1)}><Plus size={15} aria-hidden /></button><button type="button" className="btn icon" aria-label={t("zoomOut")} onClick={() => zoom(-1)}><Minus size={15} aria-hidden /></button></div>
      <span className="attr ltr">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a></span>
    </div>
  );
}
