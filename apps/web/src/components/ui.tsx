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
