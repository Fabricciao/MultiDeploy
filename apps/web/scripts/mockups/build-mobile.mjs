// Génère docs/mockups/mobile/{fr,he}/*.html. Usage : node scripts/mockups/build-mobile.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { makeL } from "./lib.mjs";
import { MOBILE } from "./mobile.mjs";
const OUT = new URL("../../../../docs/mockups/mobile/", import.meta.url).pathname;
for (const lang of ["fr", "he"]) {
  mkdirSync(`${OUT}${lang}`, { recursive: true });
  for (const [slug, fn] of MOBILE) writeFileSync(`${OUT}${lang}/${slug}.html`, fn(makeL(lang)).replaceAll("url(fonts/", "url(../../fonts/"));
}
console.log(`${MOBILE.length * 2} écrans mobiles générés`);
