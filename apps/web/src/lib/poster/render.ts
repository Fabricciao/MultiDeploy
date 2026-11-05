import "server-only";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Browser } from "playwright-core";
import { FORMATS, type PosterFormat } from "./html";

const FONT_DIR = process.env.POSTER_FONT_DIR ?? join(process.cwd(), "assets", "fonts");
let fontCache: { inter: string; heeboHe: string; heeboLatin: string } | null = null;
export async function loadFonts() {
  if (fontCache) return fontCache;
  const b64 = async (f: string) => `data:font/woff2;base64,${(await readFile(join(FONT_DIR, f))).toString("base64")}`;
  return (fontCache = { inter: await b64("inter-latin-wght-normal.woff2"), heeboHe: await b64("heebo-hebrew-wght-normal.woff2"), heeboLatin: await b64("heebo-latin-wght-normal.woff2") });
}

/** Chromium : CHROMIUM_PATH si défini, sinon le Chromium pré-installé de l'environnement, sinon celui de Playwright. */
function executablePath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  return existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
}
declare global { var __browser: Promise<Browser> | undefined }
const browser = () => (globalThis.__browser ??= chromium.launch({ executablePath: executablePath(), args: ["--no-sandbox", "--disable-dev-shm-usage"] }).then((b) => { b.on("disconnected", () => { globalThis.__browser = undefined; }); return b; }));

let active = 0; const waiters: (() => void)[] = [];
const MAX = Number(process.env.POSTER_CONCURRENCY ?? 2);
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX) await new Promise<void>((r) => waiters.push(r));
  active++;
  try { return await fn(); } finally { active--; waiters.shift()?.(); }
}

/** Rendu délégué à un service séparé (apps/renderer) : Vercel n'embarque pas Chromium de façon fiable. Authentifié par jeton partagé. */
async function remote(body: { kind: "png" | "pdf"; html: string; width?: number; height?: number }): Promise<Buffer> {
  const r = await fetch(process.env.POSTER_RENDER_URL!, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.POSTER_RENDER_TOKEN ?? ""}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(45_000) });
  if (!r.ok) throw new Error(`renderer_${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

/** Rend un HTML autonome en PNG. JavaScript désactivé et toute requête réseau bloquée (le HTML ne contient que des data: URI). */
export async function renderPoster(html: string, format: PosterFormat): Promise<Buffer> {
  const { w, h } = FORMATS[format];
  if (process.env.POSTER_RENDER_URL) return remote({ kind: "png", html, width: w, height: h });
  return slot(async () => {
    const b = await browser();
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, javaScriptEnabled: false });
    try {
      const page = await ctx.newPage();
      await page.route("**/*", (r) => (/^(data|about):/.test(r.request().url()) ? r.continue() : r.abort()));
      await page.setContent(html, { waitUntil: "load", timeout: 15000 });
      await page.evaluate("document.fonts.ready").catch(() => {});
      return await page.screenshot({ type: "png", timeout: 20000 });
    } finally { await ctx.close(); }
  });
}

/** Rend un HTML autonome en PDF A4 (bon de visite signé). Mêmes garde-fous que renderPoster : pas de JavaScript, réseau bloqué. */
export async function renderPdf(html: string): Promise<Buffer> {
  if (process.env.POSTER_RENDER_URL) return remote({ kind: "pdf", html });
  return slot(async () => {
    const b = await browser();
    const ctx = await b.newContext({ javaScriptEnabled: false });
    try {
      const page = await ctx.newPage();
      await page.route("**/*", (r) => (/^(data|about):/.test(r.request().url()) ? r.continue() : r.abort()));
      await page.setContent(html, { waitUntil: "load", timeout: 15000 });
      await page.evaluate("document.fonts.ready").catch(() => {});
      return Buffer.from(await page.pdf({ format: "A4", printBackground: true, margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" } }));
    } finally { await ctx.close(); }
  });
}
