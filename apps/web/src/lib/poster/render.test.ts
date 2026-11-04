import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import QRCode from "qrcode";
import { FORMATS, posterHtml, type PosterData, type PosterFormat } from "./html";
import { loadFonts, renderPoster } from "./render";

const hasChromium = !!process.env.CHROMIUM_PATH || existsSync("/opt/pw-browsers/chromium");
const out = process.env.POSTER_OUT;

async function fakePhoto() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1100"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bcd3ea"/><stop offset="1" stop-color="#f3efe6"/></linearGradient></defs><rect width="1600" height="1100" fill="url(#s)"/><rect x="180" y="300" width="560" height="800" fill="#8d97a8"/><rect x="760" y="180" width="520" height="920" fill="#6f7a8f"/><rect x="1300" y="420" width="300" height="680" fill="#9aa4b4"/>${Array.from({ length: 40 }, (_, i) => `<rect x="${210 + (i % 5) * 100}" y="${330 + Math.floor(i / 5) * 90}" width="60" height="60" fill="#e6edf5"/>`).join("")}</svg>`;
  return `data:image/jpeg;base64,${(await sharp(Buffer.from(svg)).jpeg().toBuffer()).toString("base64")}`;
}
const data = (over: Partial<PosterData>): PosterData => ({ locale: "fr", format: "portrait", variant: "A", brand: { primary: "#0f766e", secondary: "#14304a", fontLatin: null, fontHebrew: "Heebo" }, orgName: "Eliezer.immo", tag: "À VENDRE", title: "4 pièces · Raanana", place: "Rue Ahuza, Raanana", price: "3 450 000 ₪", specs: ["112 m²", "Mamad", "2 parkings"], phone: "050-123-4567", agentName: "Yaël Lévy", legal: "Eliezer.immo · Courtier agréé · Prix sous réserve", ...over });

describe.skipIf(!hasChromium)("rendu Chromium", () => {
  it.each(Object.keys(FORMATS) as PosterFormat[])("format %s : PNG aux dimensions exactes", async (f) => {
    const fonts = await loadFonts(); const photo = await fakePhoto(); const qr = await QRCode.toDataURL("https://example.test/l/abc", { margin: 1, width: 300 });
    const png = await renderPoster(posterHtml(data({ format: f, photo, qr }), fonts), f);
    const m = await sharp(png).metadata();
    expect([m.width, m.height]).toEqual([FORMATS[f].w, FORMATS[f].h]);
    if (out) { mkdirSync(out, { recursive: true }); writeFileSync(`${out}/fr-A-${f}.png`, png); }
  }, 60000);
  it.each(["A", "B", "C"] as const)("hébreu RTL variante %s", async (v) => {
    const fonts = await loadFonts(); const photo = await fakePhoto();
    const png = await renderPoster(posterHtml(data({ locale: "he", variant: v, photo, tag: "למכירה", title: "דירת 4 חדרים · רעננה", place: "אחוזה, רעננה", price: "₪3,450,000", specs: ["112 מ״ר", "ממ״ד", "2 חניות"], agentName: "יעל לוי", legal: "אליעזר נדל״ן · מתווך מורשה" }), fonts), "portrait");
    expect((await sharp(png).metadata()).width).toBe(1080);
    if (out) { mkdirSync(out, { recursive: true }); writeFileSync(`${out}/he-${v}-portrait.png`, png); }
  }, 60000);
  it("le HTML ne peut pas déclencher de requête réseau (JS coupé, réseau bloqué)", async () => {
    const fonts = await loadFonts();
    const html = posterHtml(data({ photo: "https://evil.test/x.png" }), fonts); // URL http dans l'image → doit être bloquée, rendu sans l'image
    const png = await renderPoster(html, "square");
    expect((await sharp(png).metadata()).width).toBe(1080);
  }, 60000);
});
