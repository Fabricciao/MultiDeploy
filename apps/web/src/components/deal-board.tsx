"use client";
import { useOptimistic, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui";
import { moveDealAction } from "@/app/[locale]/(app)/deals/actions";

export type BoardStage = { id: string; name: string; kind: string; probability: number };
export type BoardDeal = { id: string; stageId: string; client: string; sub: string; value: number | null; agent: string; contactId: string };

export function DealBoard({ stages, deals, canMove }: { stages: BoardStage[]; deals: BoardDeal[]; canMove: boolean }) {
  const locale = useLocale();
  const t = useTranslations("deals");
  const [, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(deals, (state, m: { id: string; stageId: string }) => state.map((d) => (d.id === m.id ? { ...d, stageId: m.stageId } : d)));
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const fmt = (v: number) => new Intl.NumberFormat(locale === "he" ? "he-IL" : locale === "en" ? "en-IL" : "fr-FR", { style: "currency", currency: "ILS", maximumFractionDigits: v >= 1_000_000 ? 1 : 0, notation: v >= 1_000_000 ? "compact" : "standard" }).format(v);
  const move = (id: string, stageId: string) => {
    const cur = optimistic.find((d) => d.id === id);
    if (!cur || cur.stageId === stageId) return;
    setError(false);
    start(async () => {
      setOptimistic({ id, stageId });
      const ok = await moveDealAction(locale, id, stageId);
      if (!ok) setError(true);
    });
  };
  return (
    <>
      {error && <div className="toast" role="alert">{t("moveFailed")}</div>}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${stages.length}, minmax(165px, 1fr))`, gap: 12, overflowX: "auto", alignItems: "start", paddingBottom: 12 }}>
        {stages.map((s) => {
          const list = optimistic.filter((d) => d.stageId === s.id);
          const sum = list.reduce((a, d) => a + (d.value ?? 0), 0);
          return (
            <div key={s.id} className={`kcol col ${over === s.id ? "drop-on" : ""}`}
              style={{ gap: 8, background: "var(--sunken)", borderRadius: 10, padding: 8, minHeight: 120 }}
              onDragOver={canMove ? (e) => { e.preventDefault(); setOver(s.id); } : undefined}
              onDragLeave={() => setOver((o) => (o === s.id ? null : o))}
              onDrop={canMove ? (e) => { e.preventDefault(); setOver(null); move(e.dataTransfer.getData("text/plain"), s.id); } : undefined}>
              <div className="row" style={{ padding: "2px 4px 4px" }}>
                <b style={{ fontWeight: 600 }}>{s.name}</b><span className="note tab">{list.length}</span>
                <span className="sp note tab">{sum ? fmt(sum) : "—"}</span>
              </div>
              {list.map((d) => (
                <div key={d.id} className="card" style={{ padding: "10px 11px", cursor: canMove ? "grab" : "default" }} draggable={canMove}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", d.id)}>
                  <Link href={`/clients/${d.contactId}`} style={{ fontWeight: 500, display: "block", marginBottom: 3 }}>{d.client}</Link>
                  <div className="note" style={{ marginBottom: 8 }}>{d.sub}</div>
                  <div className="row"><b className="tab" style={{ fontWeight: 600 }}>{d.value ? fmt(d.value) : "—"}</b><span className="sp"><Avatar text={d.agent} cls="sm" /></span></div>
                  {canMove && (
                    <select aria-label={t("moveTo")} className="input" style={{ height: 26, fontSize: 11.5, marginTop: 8 }} value={d.stageId} onChange={(e) => move(d.id, e.target.value)}>
                      {stages.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
