import type { ReactNode } from "react";
import { Camera } from "lucide-react";

/** Bien sans photo : un fond neutre, jamais une image inventée. */
export function Photo({ label = "" }: { seed?: string; label?: string }) {
  return <div role="img" aria-label={label} className="nophoto"><Camera size={18} strokeWidth={1.5} aria-hidden /></div>;
}

/** Photo de couverture d'un bien, ou fond neutre. `full` pour les grandes tailles. */
export function Cover({ path, alt = "" }: { path?: string | null; alt?: string; full?: boolean }) {
  return path ? <img src={`/api/files/${path}`} alt={alt} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <Photo label={alt} />;
}

export const statusTone = (s: string): "ok" | "warn" | "info" | "bad" | "" => ({ active: "ok", under_offer: "warn", sold: "info", rented: "info", expired: "bad" } as Record<string, "ok" | "warn" | "info" | "bad">)[s] ?? "";

export const Avatar = ({ text, cls = "", src }: { text: string; cls?: string; src?: string | null }) => <span className={`avatar ${cls}`}>{src ? <img src={src} alt="" /> : text}</span>;
export const Badge = ({ tone = "", children }: { tone?: "" | "ok" | "warn" | "bad" | "acc" | "info" | "sig"; children: ReactNode }) => <span className={`badge ${tone}`}>{children}</span>;

export function Ring({ value }: { value: number }) {
  return (
    <span className="ring" style={{ background: `conic-gradient(var(--signal) ${value * 3.6}deg, var(--surface-sunken) 0)` }} title={`${value}%`}>
      <span className="ring-in tab">{value}</span>
    </span>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="ph">
      <div className="grow"><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      {children}
    </div>
  );
}

export function Field({ label, children, error, hint }: { label: ReactNode; children: ReactNode; error?: string; hint?: ReactNode }) {
  return (
    <div>
      <label className="lbl">{label}</label>
      {children}
      {hint && !error && <div className="note" style={{ marginTop: 4 }}>{hint}</div>}
      {error && <div className="err" style={{ marginTop: 4 }}>{error}</div>}
    </div>
  );
}

/** Courbe miniature d'un indicateur (une série, sans axe). */
export function Spark({ values, label }: { values: number[]; label?: string }) {
  if (values.length < 2) return null;
  const w = 96, h = 32, mx = Math.max(...values), mn = Math.min(...values);
  const X = (i: number) => 3 + (i * (w - 6)) / (values.length - 1), Y = (v: number) => h - 5 - ((v - mn) / (mx - mn || 1)) * (h - 10);
  const d = values.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path d={`${d} L${X(values.length - 1)} ${h} L${X(0)} ${h}Z`} fill="var(--accent-soft)" />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={X(values.length - 1)} cy={Y(values.at(-1)!)} r={3.5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
    </svg>
  );
}

/** Barre segmentée par étape du pipeline (couleurs stage-1 à stage-6). */
export function StageBar({ parts, label }: { parts: { label: string; value: number; tip: string }[]; label: string }) {
  const n = parts.length;
  return (
    <div className="stagebar" role="img" aria-label={label}>
      {parts.map((p, i) => <i key={i} title={p.tip} style={{ flex: Math.max(p.value, 0.0001), background: `var(--stage-${Math.min(6, Math.max(1, Math.round(((i + 1) / n) * 6)))})` }} />)}
    </div>
  );
}

/** Histogramme vertical : une série, un axe, valeurs exactes au survol (title), ligne d'objectif facultative. */
export function BarChart({ data, ticks, fmt, target, label }: { data: { l: string; v: number; tip: string; dim?: boolean }[]; ticks: number[]; fmt: (n: number) => string; target?: number; label: string }) {
  const W = 640, H = 230, pl = 52, pr = 8, pt = 14, pb = 24, n = Math.max(1, data.length), bw = (W - pl - pr) / n, w = Math.min(26, bw - 6);
  const max = Math.max(...ticks, ...(data.map((d) => d.v)), 1);
  const Y = (v: number) => pt + (1 - v / max) * (H - pt - pb);
  return (
    <div className="chartbox"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {ticks.map((t) => <g key={t}><line x1={pl} x2={W - pr} y1={Y(t)} y2={Y(t)} stroke="var(--border)" /><text x={pl - 6} y={Y(t) + 4} textAnchor="end">{fmt(t)}</text></g>)}
      {data.map((d, i) => {
        const x = pl + i * bw + (bw - w) / 2, y = Y(d.v), h = Math.max(0, Y(0) - y), r = Math.min(4, h);
        return (
          <g key={i} className="hb"><title>{d.tip}</title>
            <rect className="bg" x={pl + i * bw} y={pt} width={bw} height={H - pt - pb} fill="transparent" />
            {h > 0 && <path d={`M${x} ${y + r}a${r} ${r} 0 0 1 ${r} ${-r}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - r}h${-w}z`} fill="var(--accent)" opacity={d.dim ? 0.55 : 1} />}
            <text x={x + w / 2} y={H - 6} textAnchor="middle">{d.l}</text>
          </g>
        );
      })}
      {target ? <line x1={pl} x2={W - pr} y1={Y(target)} y2={Y(target)} stroke="var(--text)" strokeWidth={1.5} strokeDasharray="5 4" /> : null}
    </svg></div>
  );
}
