/** Semaine israélienne (dimanche → samedi) et conversions heure de Jérusalem ↔ UTC, sans dépendance. */
const TZ = "Asia/Jerusalem";
const parts = (d: Date) => Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(d).map((p) => [p.type, p.value])) as Record<string, string>;
export const dayKey = (d: Date) => { const p = parts(d); return `${p.year}-${p.month}-${p.day}`; };

/** « 2026-11-05T14:30 » saisi à l'heure de Jérusalem → instant UTC (gère l'heure d'été). */
export function jerusalemToDate(local: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local); if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  for (const off of [3, 2]) { const t = new Date(Date.UTC(y, mo - 1, d, h - off, mi)); const p = parts(t); if (Number(p.year) === y && Number(p.month) === mo && Number(p.day) === d && Number(p.hour) === h && Number(p.minute) === mi) return t; }
  return null;
}
const IDX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
/** Début (dimanche 00:00 Jérusalem) de la semaine décalée de `offset` semaines par rapport à `now`. */
export function weekStart(now: Date, offset = 0): Date {
  const p = parts(now), idx = IDX[p.weekday!] ?? 0;
  const base = new Date(Date.UTC(+p.year!, +p.month! - 1, +p.day! - idx + offset * 7));
  return jerusalemToDate(`${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}-${String(base.getUTCDate()).padStart(2, "0")}T00:00`)!;
}
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
