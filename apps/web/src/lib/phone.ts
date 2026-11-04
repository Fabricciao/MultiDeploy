/** Normalise un numéro saisi à la main en E.164. Numéros israéliens par défaut (0501234567 → +972501234567). */
export function normalizePhone(input: string, defaultCountry = "972"): string | null {
  let s = input.trim().replace(/[\s().-]/g, "");
  if (!s) return null;
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (s.startsWith("+")) {
    const d = s.slice(1);
    if (!/^\d{8,14}$/.test(d)) return null;
    // +9720501234567 : zéro de trunk superflu après l'indicatif
    return d.startsWith("9720") ? `+972${d.slice(4)}` : `+${d}`;
  }
  if (!/^\d+$/.test(s)) return null;
  if (s.startsWith("972")) return /^972\d{8,9}$/.test(s) ? `+${s}` : null;
  if (s.startsWith("0")) {
    const d = s.slice(1);
    return /^\d{8,9}$/.test(d) ? `+${defaultCountry}${d}` : null;
  }
  return null;
}

/** Affichage lisible : +972501234567 → 050-123-4567 ; autres pays : tel quel. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const m = /^\+972(5\d)(\d{3})(\d{4})$/.exec(e164);
  return m ? `0${m[1]}-${m[2]}-${m[3]}` : e164;
}
