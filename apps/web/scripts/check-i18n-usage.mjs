// Vérifie que toute clé de traduction utilisée dans le code (t("ns.key")) existe dans messages/fr.json.
// Les clés dynamiques t(`status.${x}`) exigent au moins une clé « ns.status.* ».
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? flat(v, `${p}${k}.`) : [`${p}${k}`]));
const keys = new Set(flat(JSON.parse(readFileSync("messages/fr.json", "utf8"))));
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const missing = new Set();
for (const file of walk("src").filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".test.ts"))) {
  const src = readFileSync(file, "utf8");
  const vars = new Map();
  for (const m of src.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:"([\w.]*)")?\s*\)/g)) vars.set(m[1], m[2] ?? "");
  for (const [v, ns] of vars) {
    for (const m of src.matchAll(new RegExp(`(?<![\\w.])${v}\\(\\s*([\`"])([^\`"]+)\\1`, "g"))) {
      const key = (ns ? `${ns}.` : "") + m[2];
      if (m[1] === "`") {
        const prefix = key.split("${")[0];
        if (![...keys].some((k) => k.startsWith(prefix))) missing.add(`${key}  (${file})`);
      } else if (!keys.has(key)) missing.add(`${key}  (${file})`);
    }
  }
}
if (missing.size) { console.error([...missing].sort().join("\n")); console.error(`\n${missing.size} clé(s) i18n manquante(s).`); process.exit(1); }
console.log("check-i18n-usage : OK");
