// Captures PNG de toutes les maquettes (Chromium pré-installé). Usage : node apps/web/scripts/mockups/shots.cjs
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "../../../../docs/mockups");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  for (const lang of ["fr", "he"]) for (const f of fs.readdirSync(`${root}/${lang}`).filter((x) => x.endsWith(".html"))) {
    await p.goto("file://" + `${root}/${lang}/${f}`); await p.evaluate(() => document.fonts.ready);
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    await p.setViewportSize({ width: 1440, height: Math.max(900, h) });
    await p.screenshot({ path: `${root}/png/${lang}-${f.replace(".html", ".png")}`, fullPage: true });
  }
  await b.close(); console.log("ok");
})();
