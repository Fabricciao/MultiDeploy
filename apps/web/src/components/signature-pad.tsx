"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/** Zone de signature au doigt/stylet (Pointer Events). Exporte un PNG transparent dans un champ caché. */
export function SignaturePad({ name }: { name: string }) {
  const t = useTranslations("sign");
  const ref = useRef<HTMLCanvasElement>(null), out = useRef<HTMLInputElement>(null);
  const drawing = useRef(false), last = useRef<[number, number] | null>(null);
  const [empty, setEmpty] = useState(true);
  useEffect(() => { const c = ref.current!, r = c.getBoundingClientRect(); c.width = Math.round(r.width * 2); c.height = Math.round(r.height * 2); const g = c.getContext("2d")!; g.scale(2, 2); g.lineWidth = 2.4; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#111"; }, []);
  const pos = (e: React.PointerEvent): [number, number] => { const r = ref.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const down = (e: React.PointerEvent) => { drawing.current = true; last.current = pos(e); ref.current!.setPointerCapture(e.pointerId); e.preventDefault(); };
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; const g = ref.current!.getContext("2d")!, p = pos(e), l = last.current!; g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(p[0], p[1]); g.stroke(); last.current = p; if (empty) setEmpty(false); };
  const up = () => { if (!drawing.current) return; drawing.current = false; out.current!.value = ref.current!.toDataURL("image/png"); };
  const clear = () => { const c = ref.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); out.current!.value = ""; setEmpty(true); };
  return (
    <div className="col" style={{ gap: 6 }}>
      <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="img" aria-label={t("pad")} data-testid="sig-canvas"
        style={{ width: "100%", height: 180, border: "1px dashed var(--line-strong, #9aa)", borderRadius: 8, background: "#fff", touchAction: "none" }} />
      <input ref={out} type="hidden" name={name} />
      <div className="row"><span className="note grow">{empty ? t("hint") : ""}</span><button type="button" className="btn sm ghost" onClick={clear}>{t("clear")}</button></div>
    </div>
  );
}
