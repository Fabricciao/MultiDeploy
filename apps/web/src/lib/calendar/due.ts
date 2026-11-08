import { jerusalemToDate } from "./week";

/** Échéance saisie à l'heure de Jérusalem : date seule → 18:00 ; date + heure → instant exact. */
export function parseDue(date: string, time: string): { at: Date | null; timed: boolean } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { at: null, timed: false };
  const timed = /^\d{2}:\d{2}$/.test(time);
  return { at: jerusalemToDate(`${date}T${timed ? time : "18:00"}`), timed };
}
