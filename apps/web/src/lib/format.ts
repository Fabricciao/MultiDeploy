const LOC: Record<string, string> = { fr: "fr-FR", he: "he-IL", en: "en-IL" };
export const intlLocale = (l: string) => LOC[l] ?? "fr-FR";
/** Fuseau d'affichage : les agences sont en Israël, le serveur tourne en UTC. */
export const TZ = "Asia/Jerusalem";
export const money = (l: string, v: number | string | null | undefined, cur = "ILS") =>
  v === null || v === undefined || v === "" ? "—" : new Intl.NumberFormat(intlLocale(l), { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(Number(v));
/** Montant abrégé (1,8 M ₪ · 72 k ₪) écrit par Intl : l'ordre reste juste en hébreu, ce qu'une chaîne assemblée à la main ne garantit pas. */
export const moneyCompact = (l: string, v: number | string | null | undefined, cur = "ILS") =>
  v === null || v === undefined || v === "" ? "—" : new Intl.NumberFormat(intlLocale(l), { style: "currency", currency: cur, notation: "compact", maximumFractionDigits: 2 }).format(Number(v));
/** Pourcentage dans la convention de la langue (« 10 % » en français, « 10% » en hébreu et en anglais). */
export const pct = (l: string, v: number | string | null | undefined, max = 1) =>
  v === null || v === undefined || v === "" ? "—" : new Intl.NumberFormat(intlLocale(l), { style: "percent", maximumFractionDigits: max }).format(Number(v) / 100);
export const num = (l: string, v: number | string | null | undefined, max = 1) => (v === null || v === undefined || v === "" ? "—" : new Intl.NumberFormat(intlLocale(l), { maximumFractionDigits: max }).format(Number(v)));
export const dateShort = (l: string, d: Date | string | null | undefined) => (d ? new Intl.DateTimeFormat(intlLocale(l), { timeZone: TZ, day: "numeric", month: "short" }).format(new Date(d)) : "—");
export const dateTime = (l: string, d: Date | string | null | undefined) => (d ? new Intl.DateTimeFormat(intlLocale(l), { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d)) : "—");
export const timeOnly = (l: string, d: Date | string) => new Intl.DateTimeFormat(intlLocale(l), { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(d));
export const relDays = (l: string, d: Date | string) => {
  const days = Math.round((new Date(d).getTime() - Date.now()) / 86_400_000);
  return new Intl.RelativeTimeFormat(intlLocale(l), { numeric: "auto" }).format(days, "day");
};
export const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
