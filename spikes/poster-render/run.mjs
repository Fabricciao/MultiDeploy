// SPIKE : même affiche (hébreu + français + chiffres + ₪) rendue par Satori/resvg et par Chromium.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const f = (p) => readFileSync(new URL(`./node_modules/${p}`, import.meta.url));
const fonts = [
  { name: "Heebo", data: f("@fontsource/heebo/files/heebo-hebrew-700-normal.woff"), weight: 700, style: "normal" },
  { name: "Heebo", data: f("@fontsource/heebo/files/heebo-hebrew-400-normal.woff"), weight: 400, style: "normal" },
  { name: "Inter", data: f("@fontsource/inter/files/inter-latin-700-normal.woff"), weight: 700, style: "normal" },
  { name: "Inter", data: f("@fontsource/inter/files/inter-latin-400-normal.woff"), weight: 400, style: "normal" },
];
const DATA = {
  he: { title: "דירת 4 חדרים ברעננה", sub: "מרפסת סוכה · ממ״ד · חניה · 112 מ״ר", price: "₪3,450,000", cta: "לתיאום ביקור: 050-123-4567" },
  fr: { title: "Appartement 4 pièces à Raanana", sub: "Mamad · Parking · Balcon soukka · 112 m²", price: "3 450 000 ₪", cta: "Visite : 050-123-4567" },
};
const BG = "linear-gradient(160deg,#16325c,#1f4fd8)";

// ---- A : Satori (JSX-like objects) ----
const el = (type, style, children) => ({ type, props: { style, children } });
async function satoriPoster(lang) {
  const d = DATA[lang], rtl = lang === "he";
  const tree = el("div", { display: "flex", flexDirection: "column", justifyContent: "flex-end", width: 1080, height: 1080, background: BG, color: "#fff", padding: 72, fontFamily: "Heebo, Inter", direction: rtl ? "rtl" : "ltr" }, [
    el("div", { fontSize: 76, fontWeight: 700, lineHeight: 1.1, display: "flex" }, d.title),
    el("div", { fontSize: 34, marginTop: 20, opacity: 0.85, display: "flex" }, d.sub),
    el("div", { fontSize: 110, fontWeight: 700, marginTop: 40, display: "flex" }, d.price),
    el("div", { fontSize: 38, marginTop: 28, display: "flex" }, d.cta),
  ]);
  const svg = await satori(tree, { width: 1080, height: 1080, fonts });
  writeFileSync(`out/satori-${lang}.png`, new Resvg(svg).render().asPng());
}

// ---- B : Chromium ----
async function chromiumPosters() {
  const css = ["400", "700"].map((w) => `@font-face{font-family:Heebo;font-weight:${w};src:url(data:font/woff;base64,${f(`@fontsource/heebo/files/heebo-hebrew-${w}-normal.woff`).toString("base64")})}@font-face{font-family:Inter;font-weight:${w};src:url(data:font/woff;base64,${f(`@fontsource/inter/files/inter-latin-${w}-normal.woff`).toString("base64")})}`).join("");
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1080 } });
  for (const lang of ["he", "fr"]) {
    const d = DATA[lang];
    await p.setContent(`<html lang="${lang}" dir="${lang === "he" ? "rtl" : "ltr"}"><style>${css}body{margin:0}.p{width:1080px;height:1080px;box-sizing:border-box;background:${BG};color:#fff;padding:72px;display:flex;flex-direction:column;justify-content:flex-end;font-family:Heebo,Inter}h1{font-size:76px;line-height:1.1;margin:0}p{margin:0}</style><div class="p"><h1>${d.title}</h1><p style="font-size:34px;margin-top:20px;opacity:.85">${d.sub}</p><p style="font-size:110px;font-weight:700;margin-top:40px">${d.price}</p><p style="font-size:38px;margin-top:28px">${d.cta}</p></div></html>`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: `out/chromium-${lang}.png` });
  }
  await b.close();
}

for (const lang of ["he", "fr"]) { const t = performance.now(); await satoriPoster(lang); console.log(`satori   ${lang}: ${(performance.now() - t).toFixed(0)} ms`); }
const t = performance.now(); await chromiumPosters(); console.log(`chromium he+fr (avec lancement): ${(performance.now() - t).toFixed(0)} ms`);
