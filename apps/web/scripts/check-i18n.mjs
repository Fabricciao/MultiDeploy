// Les 3 fichiers de messages doivent avoir exactement les mêmes clés, sans valeur vide.
import { readFileSync } from "node:fs";
const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) => typeof v === "object" ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]);
const data = Object.fromEntries(["fr", "he", "en"].map((l) => [l, new Map(flat(JSON.parse(readFileSync(`messages/${l}.json`, "utf8"))))]));
let errors = 0;
const all = new Set(Object.values(data).flatMap((m) => [...m.keys()]));
for (const key of all) for (const [l, m] of Object.entries(data)) {
  if (!m.has(key)) { console.error(`[${l}] clé manquante : ${key}`); errors++; }
  else if (!String(m.get(key)).trim()) { console.error(`[${l}] valeur vide : ${key}`); errors++; }
}
// Les variables ICU {x} doivent être identiques dans toutes les langues
const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
for (const key of all) { const set = new Set(Object.values(data).map((m) => vars(m.get(key) ?? ""))); if (set.size > 1) { console.error(`variables ICU divergentes : ${key}`); errors++; } }
if (errors) process.exit(1);
console.log(`check-i18n : OK (${all.size} clés × 3 langues)`);
