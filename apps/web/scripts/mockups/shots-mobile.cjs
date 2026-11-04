// Captures PNG (x2) de chaque écran mobile, élément .phone uniquement.
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "../../../../docs/mockups");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 460, height: 900 }, deviceScaleFactor: 2 });
  for (const lang of ["fr", "he"]) for (const f of fs.readdirSync(`${root}/mobile/${lang}`).filter((x) => x.endsWith(".html"))) {
    await p.goto(`file://${root}/mobile/${lang}/${f}`); await p.evaluate(() => document.fonts.ready);
    await p.locator(".phone").screenshot({ path: `${root}/png/mobile/${lang}-${f.replace(".html", ".png")}` });
  }
  await b.close(); console.log("ok");
})();
