// Génère docs/mockups/{fr,he}/*.html + index.html. Usage : node scripts/mockups/build.mjs [--shots]
import { mkdirSync, writeFileSync } from "node:fs";
import { makeL, css } from "./lib.mjs";
import * as A from "./pages-a.mjs";
import * as B from "./pages-b.mjs";

const OUT = new URL("../../../../docs/mockups/", import.meta.url).pathname;
export const SCREENS = [
  ["01-biens", A.properties, "Liste des biens", "רשימת נכסים"],
  ["02-fiche-bien", A.property, "Fiche bien", "כרטיס נכס"],
  ["03-fiche-client", A.client, "Fiche client", "כרטיס לקוח"],
  ["04-dictee-revue-ia", A.intake, "Dictée & revue IA", "הכתבה ובדיקת AI"],
  ["05-generateur-affiche", B.posterGenerator, "Générateur d'affiche", "יצירת מודעה"],
  ["06-onboarding-charte", B.brandOnboarding, "Onboarding & charte", "הטמעה ומיתוג"],
  ["07-pipeline", B.pipeline, "Pipeline kanban", "צינור עסקאות"],
  ["08-console-admin", B.admin, "Console super-admin", "קונסולת סופר-אדמין"],
];
for (const lang of ["fr", "he"]) {
  mkdirSync(`${OUT}${lang}`, { recursive: true });
  for (const [slug, fn] of SCREENS) {
    // chemin des polices relatif au sous-dossier de langue
    writeFileSync(`${OUT}${lang}/${slug}.html`, fn(makeL(lang)).replaceAll("url(fonts/", "url(../fonts/"));
  }
}
console.log(`${SCREENS.length * 2} maquettes générées dans docs/mockups/`);
