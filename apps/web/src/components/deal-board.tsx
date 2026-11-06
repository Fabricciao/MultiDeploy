"use client";
import { useOptimistic, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRightLeft } from "lucide-react";
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
  const [drag, setDrag] = useState<string | null>(null);
  const [error, setError] = useState(false);
  // Formatage volontairement sans « notation: compact » : les données ICU de Node et du navigateur diffèrent (erreur d'hydratation).
  const nf = (o: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale === "he" ? "he-IL" : locale === "en" ? "en-IL" : "fr-FR", o);
  const fmt = (v: number) => (v >= 1_000_000 ? `${nf({ maximumFractionDigits: 1 }).format(v / 1_000_000)} M ₪` : nf({ style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(v));
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
  const open = stages.filter((s) => s.kind === "open");
  const stageColor = (s: BoardStage) => (s.kind === "won" ? "var(--success)" : `var(--stage-${Math.min(6, Math.round(((open.indexOf(s) + 1) / Math.max(1, open.length)) * 6))})`);
  return (
    <>
      {error && <div className="toast" role="alert">{t("moveFailed")}</div>}
      <div className="board" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(158px, 1fr))` }}>
        {stages.map((s) => {
          const list = optimistic.filter((d) => d.stageId === s.id);
          const sum = list.reduce((a, d) => a + (d.value ?? 0), 0);
          return (
            <section key={s.id} className={`kcol ${over === s.id ? "drop-on" : ""}`} aria-label={s.name}
              onDragOver={canMove ? (e) => { e.preventDefault(); setOver(s.id); } : undefined}
              onDragLeave={() => setOver((o) => (o === s.id ? null : o))}
              onDrop={canMove ? (e) => { e.preventDefault(); setOver(null); setDrag(null); move(e.dataTransfer.getData("text/plain"), s.id); } : undefined}>
              <div className="kcol-h">
                <div className="t"><i className="st" style={{ background: stageColor(s) }} /><span className="trunc">{s.name}</span><span className="sp cnt-b" style={{ background: "var(--surface)" }}>{list.length}</span></div>
                <div className="s">{sum ? fmt(sum) : "—"}</div>
              </div>
              {list.map((d) => (
                <article key={d.id} className={`deal ${drag === d.id ? "drag" : ""}`} style={{ cursor: canMove ? "grab" : "default" }} draggable={canMove}
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", d.id); setDrag(d.id); }} onDragEnd={() => setDrag(null)}>
                  <Link href={`/clients/${d.contactId}`}><b>{d.client}</b></Link>
                  <small className="tab">{d.sub}</small>
                  <div className="f">
                    <span className="price tab">{d.value ? fmt(d.value) : "—"}</span>
                    <span className="row gap4">
                      {canMove && (
                        <span className="move" title={t("moveTo")}><ArrowRightLeft size={13} aria-hidden />
                          <select aria-label={t("moveTo")} value={d.stageId} onChange={(e) => move(d.id, e.target.value)}>
                            {stages.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                          </select>
                        </span>
                      )}
                      <Avatar text={d.agent} cls="sm" />
                    </span>
                  </div>
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}
