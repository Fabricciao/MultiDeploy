// Service de rendu Chromium (PNG / PDF) pour les affiches et bons de visite. Déployé sur un hébergeur de conteneurs (Fly.io, Railway, Cloud Run…).
// POST / { kind: "png"|"pdf", html, width?, height? }  — Authorization: Bearer $RENDER_TOKEN. Le HTML est autonome (data: URI uniquement).
import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { chromium } from "playwright-core";

const TOKEN = process.env.RENDER_TOKEN ?? "";
const PORT = Number(process.env.PORT ?? 8080);
const MAX_BODY = 15 * 1024 * 1024, MAX_PARALLEL = Number(process.env.RENDER_CONCURRENCY ?? 2);
if (TOKEN.length < 24) { console.error("RENDER_TOKEN (>= 24 caractères) obligatoire"); process.exit(1); }

let browserP;
const browser = () => (browserP ??= chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox", "--disable-dev-shm-usage"] }).then((b) => { b.on("disconnected", () => { browserP = undefined; }); return b; }));
let active = 0; const queue = [];
const slot = async (fn) => { if (active >= MAX_PARALLEL) await new Promise((r) => queue.push(r)); active++; try { return await fn(); } finally { active--; queue.shift()?.(); } };
const authOk = (h) => { const a = Buffer.from(String(h ?? "")), b = Buffer.from(`Bearer ${TOKEN}`); return a.length === b.length && timingSafeEqual(a, b); };

async function render({ kind, html, width, height }) {
  const b = await browser();
  const ctx = await b.newContext({ viewport: kind === "png" ? { width, height } : undefined, deviceScaleFactor: 1, javaScriptEnabled: false });
  try {
    const page = await ctx.newPage();
    await page.route("**/*", (r) => (/^(data|about):/.test(r.request().url()) ? r.continue() : r.abort()));
    await page.setContent(html, { waitUntil: "load", timeout: 15000 });
    await page.evaluate("document.fonts.ready").catch(() => {});
    return kind === "png" ? await page.screenshot({ type: "png", timeout: 20000 }) : Buffer.from(await page.pdf({ format: "A4", printBackground: true, margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" } }));
  } finally { await ctx.close(); }
}

http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") { res.writeHead(200).end("ok"); return; }
  if (req.method !== "POST" || req.url !== "/") { res.writeHead(404).end(); return; }
  if (!authOk(req.headers.authorization)) { res.writeHead(401).end(); return; }
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > MAX_BODY) { res.writeHead(413).end(); return; } chunks.push(c); }
  try {
    const j = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!["png", "pdf"].includes(j.kind) || typeof j.html !== "string") { res.writeHead(400).end(); return; }
    if (j.kind === "png" && !(Number.isInteger(j.width) && Number.isInteger(j.height) && j.width >= 200 && j.width <= 2400 && j.height >= 200 && j.height <= 3600)) { res.writeHead(400).end(); return; }
    const out = await slot(() => render(j));
    res.writeHead(200, { "content-type": j.kind === "png" ? "image/png" : "application/pdf", "content-length": out.length }).end(out);
  } catch (e) { console.error("render failed:", e?.message); res.writeHead(500).end(); }
}).listen(PORT, () => console.log(`renderer on :${PORT}`));
