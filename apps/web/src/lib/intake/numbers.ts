/** Nombres en toutes lettres (FR / HE / EN) → valeur. Évalue « deux millions deux cent mille », « שני מיליון ומאתיים אלף », « four million »… */
const UNITS: Record<string, number> = {
  // fr
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60,
  // he (masc./fém.)
  אחד: 1, אחת: 1, שניים: 2, שנים: 2, שני: 2, שתי: 2, שתיים: 2, שלושה: 3, שלוש: 3, ארבעה: 4, ארבע: 4, חמישה: 5, חמש: 5, שישה: 6, שש: 6, שבעה: 7, שבע: 7, שמונה: 8, תשעה: 9, תשע: 9, עשרה: 10, עשר: 10, עשרים: 20, שלושים: 30, ארבעים: 40, חמישים: 50,
  // en
  one: 1, two: 2, three: 3, four: 4, five: 5, seven_: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50,
};
Object.assign(UNITS, { seven: 7 }); delete UNITS.seven_;
const HUNDREDS: Record<string, number> = { cent: 100, cents: 100, מאה: 100, מאתיים: 200, hundred: 100, "מאות": 100 };
const THOUSAND = new Set(["mille", "אלף", "אלפים", "thousand", "k"]);
const MILLION = new Set(["million", "millions", "מיליון", "מיליונים", "m"]);
export const HALF = new Set(["demi", "demie", "וחצי", "חצי", "half"]);

const strip = (w: string) => w.toLowerCase().replace(/^[ו]/u, (m, o) => m).replace(/[.,;:!?()«»"“”]/g, "");
/** Tokenise en mots/nombres ; un « ו » collé (« ומאתיים ») est séparé. */
export function tokens(s: string): string[] {
  return s.replace(/[֑-ׇ]/g, "").split(/[\s ]+/).flatMap((w) => { const x = strip(w); return /^ו(?=מאת|אלף|שלוש|שני|שתי|ארבע|חמש|שש|שבע|שמונה|תשע|עשר|חצי)/.test(x) ? ["ו", x.slice(1)] : [x]; }).filter(Boolean);
}

const isNumTok = (t: string) => /^\d+(?:[.,]\d+)?$/.test(t) || t in UNITS || t in HUNDREDS || THOUSAND.has(t) || MILLION.has(t) || t === "et" || t === "ו" || t === "and";
const val = (t: string) => (/^\d/.test(t) ? Number(t.replace(",", ".")) : (UNITS[t] ?? HUNDREDS[t] ?? NaN));

/** Évalue une suite de tokens numériques. Renvoie null si rien d'évaluable. */
export function evalNumber(toks: string[]): number | null {
  let total = 0, cur = 0, seen = false;
  for (const t of toks) {
    if (t === "et" || t === "ו" || t === "and") continue;
    if (MILLION.has(t)) { total += (cur || 1) * 1_000_000; cur = 0; seen = true; }
    else if (THOUSAND.has(t)) { total += (cur || 1) * 1000; cur = 0; seen = true; }
    else if (t in HUNDREDS) { const h = HUNDREDS[t]!; cur = t === "מאות" || h === 100 && cur ? cur * 100 : cur + h; seen = true; }
    else { const v = val(t); if (Number.isNaN(v)) return null; cur += v; seen = true; }
  }
  return seen ? total + cur : null;
}

/** Cherche le premier montant dans `text` à partir de `from`. Gère « 2,2 millions », « 4 M », « quatre millions », « 3 450 000 ». */
export function findAmount(text: string, from = 0): { value: number; start: number; end: number; hasCurrency: boolean } | null {
  const slice = text.slice(from);
  // 1) chiffres : 3 450 000 / 3,450,000 / 2,2 millions / 4M / 850 mille
  const m = /(\d{1,3}(?:[\s .,]\d{3})+|\d+(?:[.,]\d+)?)\s*(millions?|מיליון|mille|אלף|k|m)?(?![\p{L}\d])/iu.exec(slice);
  const w = firstWordNumber(slice);
  const cand = [m && { idx: m.index, len: m[0].length, v: digitsValue(m[1]!, m[2]) }, w && { idx: w.idx, len: w.len, v: w.v }].filter(Boolean) as { idx: number; len: number; v: number }[];
  if (!cand.length) return null;
  const c = cand.sort((a, b) => a.idx - b.idx)[0]!;
  const tail = slice.slice(c.idx + c.len, c.idx + c.len + 14);
  return { value: c.v, start: from + c.idx, end: from + c.idx + c.len, hasCurrency: /₪|nis|shekel|שקל|ש"ח|ש״ח|shek/i.test(tail) };
}
function digitsValue(num: string, mult?: string): number {
  const grouped = /^\d{1,3}(?:[\s .,]\d{3})+$/.test(num);
  const n = grouped ? Number(num.replace(/[\s .,]/g, "")) : Number(num.replace(",", "."));
  const x = mult?.toLowerCase();
  if (!x) return n;
  return n * (MILLION.has(x) || x === "millions" ? 1_000_000 : 1000);
}
function firstWordNumber(s: string): { idx: number; len: number; v: number } | null {
  const re = /[\p{L}'׳]+/gu; const words: { w: string; i: number; e: number }[] = [];
  for (let m = re.exec(s); m; m = re.exec(s)) words.push({ w: m[0], i: m.index, e: m.index + m[0].length });
  // les mots ו+mot sont déjà collés : on retokenise chaque mot
  for (let a = 0; a < words.length; a++) {
    const first = tokens(words[a]!.w);
    if (!first.some((t) => t in UNITS || t in HUNDREDS)) continue;
    let b = a, buf: string[] = [];
    while (b < words.length) { const tk = tokens(words[b]!.w); if (!tk.every(isNumTok)) break; buf = buf.concat(tk); b++; }
    while (buf.length && ["et", "ו", "and"].includes(buf[buf.length - 1]!)) { buf.pop(); b--; }
    const v = evalNumber(buf);
    if (v !== null && v > 0) return { idx: words[a]!.i, len: words[b - 1]!.e - words[a]!.i, v };
  }
  return null;
}
