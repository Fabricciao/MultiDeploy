/** Calendrier juif (via Intl, données ICU) : Chabbat et fêtes chômées en Israël — avertissement lors de la planification. Fonctions pures, testées. */
const TZ = "Asia/Jerusalem";
export type HebrewDate = { day: number; month: string };
export function hebrewDate(d: Date): HebrewDate {
  const p = new Intl.DateTimeFormat("en-u-ca-hebrew", { timeZone: TZ, day: "numeric", month: "long" }).formatToParts(d);
  return { day: Number(p.find((x) => x.type === "day")?.value), month: (p.find((x) => x.type === "month")?.value ?? "").replace(/\s+/g, " ") };
}
export const localParts = (d: Date) => { const p = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", hour: "2-digit", hourCycle: "h23" }).formatToParts(d); return { weekday: p.find((x) => x.type === "weekday")!.value, hour: Number(p.find((x) => x.type === "hour")!.value) }; };

const HOLIDAYS: { key: string; month: string; days: number[] }[] = [
  { key: "rosh_hashana", month: "Tishri", days: [1, 2] }, { key: "yom_kippur", month: "Tishri", days: [10] }, { key: "sukkot", month: "Tishri", days: [15] }, { key: "shemini_atzeret", month: "Tishri", days: [22] },
  { key: "pesach", month: "Nisan", days: [15] }, { key: "pesach_last", month: "Nisan", days: [21] }, { key: "shavuot", month: "Sivan", days: [6] },
];
const matchHoliday = (h: HebrewDate) => HOLIDAYS.find((x) => x.month === h.month && x.days.includes(h.day))?.key ?? null;

export type QuietReason = { kind: "shabbat" | "holiday" | "eve"; key?: string };
/** Un rendez-vous à cet instant tombe-t-il sur Chabbat / une fête / une veille (à partir de `eveHour`, 14 h par défaut) ? */
export function quietReason(at: Date, eveHour = 14): QuietReason | null {
  const { weekday, hour } = localParts(at);
  const h = hebrewDate(at), hol = matchHoliday(h);
  if (weekday === "Sat") return { kind: "shabbat" };
  if (hol) return { kind: "holiday", key: hol };
  const next = new Date(at.getTime() + 24 * 3600_000), holNext = matchHoliday(hebrewDate(next));
  if (hour >= eveHour && holNext) return { kind: "eve", key: holNext };
  if (weekday === "Fri" && hour >= eveHour) return { kind: "eve", key: "shabbat" };
  return null;
}
