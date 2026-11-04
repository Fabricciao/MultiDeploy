// Garde-fou RTL : interdit les utilitaires/propriétés physiques (gauche/droite) dans le code source.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const BAD = [
  [/(?<![\w-])(?:-?m[lr]|p[lr])-(?:\d|\[|px|auto)/, "utilise ms-/me-/ps-/pe- (propriétés logiques)"],
  [/(?<![\w-])(?:left|right)-(?:\d|\[|0|full|auto|1\/2)/, "utilise start-/end-"],
  [/(?<![\w-])text-(?:left|right)(?![\w-])/, "utilise text-start/text-end"],
  [/(?<![\w-])border-[lr](?:-|\s|")/, "utilise border-s/border-e"],
  [/(?<![\w-])rounded-[lr]-/, "utilise rounded-s/rounded-e"],
  [/(?<![\w-])(?:float|clear):\s*(?:left|right)/, "utilise inline-start/inline-end"],
  [/margin-(?:left|right)|padding-(?:left|right)/, "utilise margin-inline-*/padding-inline-*"],
];
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
let errors = 0;
for (const f of walk("src").filter((f) => /\.(tsx|ts|css)$/.test(f) && !f.endsWith(".test.ts"))) {
  readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    for (const [re, hint] of BAD) if (re.test(line)) { console.error(`${f}:${i + 1}  ${hint}\n    ${line.trim()}`); errors++; }
  });
}
if (errors) { console.error(`\n${errors} propriété(s) physique(s) trouvée(s) — cassent le RTL.`); process.exit(1); }
console.log("check-logical-css : OK");
