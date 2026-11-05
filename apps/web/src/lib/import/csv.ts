/** CSV : parseur RFC 4180 (guillemets, retours ligne dans les champs, BOM), détection du séparateur (, ; tab). */
export function detectDelimiter(text: string): string {
  const first = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
  const counts = [",", ";", "\t"].map((d) => [d, first.split(d).length - 1] as const).sort((a, b) => b[1] - a[1]);
  return counts[0]![1] > 0 ? counts[0]![0] : ",";
}
export function parseCsv(input: string, maxRows = 5000): { headers: string[]; rows: string[][]; truncated: boolean } {
  const text = input.replace(/^\uFEFF/, ""), d = detectDelimiter(text);
  const out: string[][] = []; let row: string[] = [], cell = "", q = false, i = 0;
  for (; i < text.length; i++) {
    const c = text[i]!;
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"' && cell === "") q = true;
    else if (c === d) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.some((x) => x.trim() !== "")) out.push(row); row = []; if (out.length > maxRows + 1) break; }
    else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); if (row.some((x) => x.trim() !== "")) out.push(row); }
  const [headers = [], ...rows] = out;
  return { headers: headers.map((h) => h.trim()), rows: rows.slice(0, maxRows), truncated: out.length > maxRows + 1 };
}

export type ContactField = "first_name" | "last_name" | "first_name_he" | "last_name_he" | "phone" | "email" | "preferred_locale" | "budget_max" | "notes" | "kind" | "ignore";
export type PropertyField = "transaction" | "property_type" | "city" | "street" | "house_number" | "price" | "rooms" | "area_built" | "floor" | "floors_total" | "mamad" | "parking_count" | "elevator" | "title" | "description" | "ignore";
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f\u0591-\u05c7"״'׳’.\-_/()]/g, " ").replace(/\s+/g, " ").trim();
const SYN: Record<string, string[]> = {
  first_name: ["prenom", "prénom", "first name", "firstname", "given name", "שם פרטי", "שם"], last_name: ["nom", "nom de famille", "last name", "lastname", "surname", "family name", "שם משפחה"],
  first_name_he: ["prenom hebreu", "first name he", "שם פרטי בעברית"], last_name_he: ["nom hebreu", "last name he", "שם משפחה בעברית"],
  phone: ["telephone", "téléphone", "tel", "tél", "mobile", "portable", "phone", "cell", "טלפון", "נייד", "פלאפון"], email: ["email", "e mail", "mail", "courriel", "אימייל", "דוא ל", "מייל"],
  preferred_locale: ["langue", "language", "locale", "שפה"], budget_max: ["budget", "budget max", "budget maximum", "תקציב"], notes: ["notes", "note", "commentaire", "commentaires", "remarques", "comments", "הערות"], kind: ["type", "type de contact", "kind", "סוג"],
  transaction: ["transaction", "vente location", "sale rent", "עסקה", "מכירה השכרה"], property_type: ["type de bien", "property type", "type bien", "סוג נכס", "סוג"], city: ["ville", "city", "עיר", "localite"],
  street: ["rue", "adresse", "street", "address", "רחוב", "כתובת"], house_number: ["numero", "numéro", "n°", "house number", "מספר בית", "מספר"], price: ["prix", "price", "loyer", "montant", "מחיר", "שכירות"],
  rooms: ["pieces", "pièces", "nb pieces", "rooms", "chambres", "חדרים"], area_built: ["surface", "m2", "m²", "area", "sqm", "שטח", "מ ר", "מר"], floor: ["etage", "étage", "floor", "קומה"], floors_total: ["etages total", "total floors", "nb etages", "מספר קומות", "סה כ קומות"],
  mamad: ["mamad", "ממד", "safe room", "pièce sécurisée"], parking_count: ["parking", "parkings", "חניה", "חניות"], elevator: ["ascenseur", "elevator", "lift", "מעלית"], title: ["titre", "title", "כותרת"], description: ["description", "תיאור"],
};
export function guessMapping<T extends string>(headers: string[], fields: readonly T[]): (T | "ignore")[] {
  const used = new Set<string>();
  return headers.map((h) => {
    const n = norm(h);
    for (const f of fields) if (!used.has(f) && (SYN[f] ?? []).some((s) => norm(s) === n)) { used.add(f); return f; }
    return "ignore";
  });
}
export const CONTACT_FIELDS = ["first_name", "last_name", "first_name_he", "last_name_he", "phone", "email", "preferred_locale", "budget_max", "notes", "kind"] as const;
export const PROPERTY_FIELDS = ["transaction", "property_type", "city", "street", "house_number", "price", "rooms", "area_built", "floor", "floors_total", "mamad", "parking_count", "elevator", "title", "description"] as const;

const yes = (v: string) => /^(1|true|oui|yes|y|כן|x|✓)$/i.test(v.trim());
const numOf = (v: string) => { const n = Number(v.replace(/[\s\u00a0₪$€]/g, "").replace(/,(?=\d{3}(\D|$))/g, "").replace(",", ".")); return v.trim() && Number.isFinite(n) ? n : null; };
export type MappedRow<F extends string> = { values: Partial<Record<F, string>>; line: number };
export function mapRows<F extends string>(rows: string[][], mapping: (F | "ignore")[]): MappedRow<F>[] {
  return rows.map((r, i) => { const values: Partial<Record<F, string>> = {}; mapping.forEach((f, c) => { if (f !== "ignore" && (r[c] ?? "").trim()) values[f as F] = (r[c] ?? "").trim(); }); return { values, line: i + 2 }; });
}
export { yes as csvYes, numOf as csvNumber };
