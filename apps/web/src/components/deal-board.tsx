"use client";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlarmClock, ArrowRight, Award, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Avatar, Cover } from "@/components/ui";
import { moveDealAction } from "@/app/[locale]/(app)/deals/actions";

export type BoardStage = { id: string; name: string; kind: string; probability: number };
export type BoardDeal = { id: string; stageId: string; client: string; sub: string; value: number | null; fee: number | null; agent: string; agentName: string; contactId: string; stale?: boolean; cover: string | null; next: string | null; nextDue: string | null };

/** Tableau des affaires V2 : glisser-déposer, zones Conclue / Perdue pendant le glisser, annulation pendant 8 secondes. */
export function DealBoard({ stages, deals, canMove, current, query }: { stages: BoardStage[]; deals: BoardDeal[]; canMove: boolean; current?: string | null; query: string }) {
  const locale = useLocale();
  const t = useTranslations("deals");
  const [, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(deals, (state, m: { id: string; stageId: string }) => state.map((d) => (d.id === m.id ? { ...d, stageId: m.stageId } : d)));
  const [over, setOver] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; undo?: () => void; bad?: boolean } | null>(null);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), toast.undo ? 8000 : 4000); return () => clearTimeout(id); }, [toast]);
  const nf = (o: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale === "he" ? "he-IL" : locale === "en" ? "en-IL" : "fr-FR", o);
  const fmt = (v: number) => (v >= 1_000_000 ? `${nf({ maximumFractionDigits: 2 }).format(v / 1_000_000)} M ₪` : nf({ style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(v));
  const k = (v: number) => `${nf({ maximumFractionDigits: 0 }).format(v / 1000)} k ₪`;
  const open = stages.filter((s) => s.kind === "open");
  const won = stages.find((s) => s.kind === "won"), lost = stages.find((s) => s.kind === "lost");
  const color = (i: number) => `var(--stage-${Math.min(6, Math.max(1, Math.round(((i + 1) / Math.max(1, open.length)) * 6)))})`;
  const move = (id: string, stageId: string, silent = false) => {
    const cur = optimistic.find((d) => d.id === id);
    if (!cur || cur.stageId === stageId) return;
    const from = cur.stageId, target = stages.find((s) => s.id === stageId);
    start(async () => {
      setOptimistic({ id, stageId });
      const ok = await moveDealAction(locale, id, stageId);
      if (!ok) { setToast({ msg: t("moveFailed"), bad: true }); return; }
      if (!silent && target) setToast({ msg: target.kind === "won" ? t("v2.wonToast", { name: cur.client }) : target.kind === "lost" ? t("v2.lostToast", { name: cur.client }) : t("v2.movedToast", { name: cur.client, stage: target.name }), undo: () => move(id, from, true) });
    });
  };
  const dropProps = (stageId: string) => canMove ? {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOver(stageId); },
    onDragLeave: () => setOver((o) => (o === stageId ? null : o)),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); setOver(null); setDrag(null); move(e.dataTransfer.getData("text/plain"), stageId); },
  } : {};
  const href = (id: string) => `/deals?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(query)), deal: id }).toString()}`;
  return (
    <>
      {toast && <div className="toast" role={toast.bad ? "alert" : "status"}><span>{toast.msg}</span>{toast.undo && <button type="button" onClick={() => { toast.undo!(); setToast(null); }}>{t("v2.undo")}</button>}</div>}
      <div className="board v2" style={{ gridTemplateColumns: `repeat(${open.length}, minmax(176px, 1fr))` }}>
        {open.map((s, i) => {
          const list = optimistic.filter((d) => d.stageId === s.id);
          const sum = list.reduce((a, d) => a + (d.value ?? 0), 0);
          return (
            <section key={s.id} className={`kcol ${over === s.id ? "drop-on" : ""}`} aria-label={s.name} {...dropProps(s.id)}>
              <div className="kcol-h">
                <div className="t"><i className="st" style={{ background: color(i) }} /><span className="trunc">{s.name}</span><span className="sp cnt-b" style={{ background: "var(--surface)" }}>{list.length}</span></div>
                <div className="s">{sum ? fmt(sum) : "—"} · {s.probability} %</div>
              </div>
              {list.map((d) => (
                <article key={d.id} className={`deal ${drag === d.id ? "drag" : ""} ${current === d.id ? "cur" : ""}`} style={{ cursor: canMove ? "grab" : "default" }} draggable={canMove}
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", d.id); setDrag(d.id); }} onDragEnd={() => { setDrag(null); setOver(null); }}>
                  <Link href={href(d.id) as "/"} scroll={false} className="who"><Avatar text={d.agent} cls="sm" /><b className="trunc grow">{d.client}</b></Link>
                  <div className="prop"><span className="thumb"><Cover path={d.cover} /></span><span className="trunc">{d.sub}</span></div>
                  <div className="f"><span className="price tab">{d.value ? fmt(d.value) : "—"}</span>{d.fee ? <span className="note tab" title={t("v2.feeTip")}>{k(d.fee)}</span> : null}</div>
                  {(d.next || d.stale) && <div className={`next ${d.stale ? "late" : ""}`}>{d.stale ? <AlarmClock size={12} aria-hidden /> : <span className="flip"><ArrowRight size={12} aria-hidden /></span>}<span className="trunc grow">{d.next ?? t("stale")}</span>{d.nextDue && <span className="tab">{d.nextDue}</span>}</div>}
                </article>
              ))}
              {list.length === 0 && <div className="note" style={{ padding: "6px" }}>{t("v2.emptyCol")}</div>}
            </section>
          );
        })}
      </div>
      {drag && canMove && (won || lost) && (
        <div className="dzs">
          {won && <div className={`dz won ${over === won.id ? "drop-on" : ""}`} {...dropProps(won.id)}><Award size={18} aria-hidden />{won.name}</div>}
          {lost && <div className={`dz lost ${over === lost.id ? "drop-on" : ""}`} {...dropProps(lost.id)}><X size={18} aria-hidden />{lost.name}</div>}
        </div>
      )}
    </>
  );
}
