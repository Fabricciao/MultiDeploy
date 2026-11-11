import type { ReactNode } from "react";
import { Check, Route } from "lucide-react";
import { Link } from "@/i18n/navigation";

export type JStep = { key: string; label: string; hint?: string; done: boolean; href?: string };
export type JNext = { label: string; title: string; sub?: string; action?: ReactNode; ok?: boolean };

/**
 * Parcours d'un bien ou d'un client : les étapes du métier dans l'ordre, celles qui sont faites, celle où l'on en est,
 * et une seule « prochaine étape » avec son bouton. L'étape en cours est la première qui n'est pas faite.
 */
export function Journey({ title, steps, next, current }: { title: string; steps: JStep[]; next?: JNext | null; current?: number }) {
  const cur = current ?? steps.findIndex((s) => !s.done);
  return (
    <section className="card journey" aria-label={title}>
      <div className="journey-h"><Route size={14} aria-hidden />{title}</div>
      <ol className="jsteps">
        {steps.map((s, i) => {
          const cls = `jstep ${s.done ? "dn" : i === cur ? "cur" : ""}`;
          const body = <><span className="jd" aria-hidden>{s.done ? <Check size={14} strokeWidth={3} /> : i + 1}</span><b className="trunc">{s.label}</b>{s.hint && <small className="trunc">{s.hint}</small>}</>;
          return <li key={s.key} style={{ display: "contents" }} aria-current={i === cur ? "step" : undefined}>{s.href ? <Link href={s.href as "/"} scroll={false} className={cls}>{body}</Link> : <div className={cls}>{body}</div>}</li>;
        })}
      </ol>
      {next && <div className={`jnext ${next.ok ? "ok" : ""}`}><div className="grow"><small>{next.label}</small><b>{next.title}</b>{next.sub && <small>{next.sub}</small>}</div>{next.action}</div>}
    </section>
  );
}
