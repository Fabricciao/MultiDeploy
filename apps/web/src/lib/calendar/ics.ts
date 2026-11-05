/** iCalendar (RFC 5545) minimal : échappement, pliage des lignes à 75 octets, UID stables, heures en UTC. */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const fold = (line: string) => { const out: string[] = []; let cur = ""; for (const ch of line) { if (Buffer.byteLength(cur + ch) > 74) { out.push(cur); cur = " " + ch; } else cur += ch; } out.push(cur); return out.join("\r\n"); };
export type IcsEvent = { uid: string; start: Date; end: Date; summary: string; description?: string; location?: string };
export function buildIcs(events: IcsEvent[], calName = "MultiDeploy"): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MultiDeploy//CRM//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${esc(calName)}`];
  for (const e of events) lines.push("BEGIN:VEVENT", `UID:${e.uid}@multideploy`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(e.start)}`, `DTEND:${fmt(e.end)}`, `SUMMARY:${esc(e.summary)}`, ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []), ...(e.location ? [`LOCATION:${esc(e.location)}`] : []), "END:VEVENT");
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
