import type { ReactNode } from "react";

export function Photo({ seed, label = "" }: { seed: string; label?: string }) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = [210, 28, 160, 340, 50, 250][h % 6]!;
  const id = `p${h.toString(36)}`;
  const b = (x: number, w: number, hh: number, l: number) => <rect key={x} x={x} y={120 - hh} width={w} height={hh} fill={`hsl(${hue} ${14 + l}% ${58 - l * 1.2}%)`} />;
  return (
    <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={`hsl(${hue} 30% 88%)`} /><stop offset="1" stopColor={`hsl(${hue} 25% 96%)`} /></linearGradient>
        <pattern id={`${id}w`} width="12" height="14" patternUnits="userSpaceOnUse"><rect x="3" y="3" width="6" height="8" fill={`hsl(${hue} 30% 90% / .75)`} /></pattern>
      </defs>
      <rect width="200" height="120" fill={`url(#${id}s)`} />
      {b(10, 46, 78, 2)}{b(60, 62, 96, 0)}{b(126, 40, 64, 4)}{b(170, 30, 84, 6)}
      <rect x="60" y="24" width="62" height="96" fill={`url(#${id}w)`} /><rect x="10" y="42" width="46" height="78" fill={`url(#${id}w)`} /><rect x="126" y="56" width="40" height="64" fill={`url(#${id}w)`} />
      <rect y="112" width="200" height="8" fill={`hsl(${hue} 12% 40% / .35)`} />
    </svg>
  );
}

export const Avatar = ({ text, cls = "" }: { text: string; cls?: string }) => <span className={`avatar ${cls}`}>{text}</span>;
export const Badge = ({ tone = "", children }: { tone?: "" | "ok" | "warn" | "bad" | "acc"; children: ReactNode }) => <span className={`badge ${tone}`}>{children}</span>;

export function Ring({ value }: { value: number }) {
  return (
    <span className="ring" style={{ background: `conic-gradient(var(--accent) ${value * 3.6}deg, var(--line) 0)` }} title={`${value}%`}>
      <span className="ring-in tab">{value}</span>
    </span>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
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
