import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import sharp from "sharp";
import { analyzeSite } from "./analyze";
import { assertPublicUrl, safeFetch } from "./ssrf";

let server: http.Server; let base = ""; let png: Buffer;
beforeAll(async () => {
  png = await sharp({ create: { width: 200, height: 80, channels: 3, background: "#0f766e" } }).png().toBuffer();
  server = http.createServer((req, res) => {
    if (req.url === "/") { res.setHeader("content-type", "text/html"); res.end(`<html><head><title>Demo Agency</title><meta name="theme-color" content="#0f766e"><link rel="stylesheet" href="/s.css"></head><body><img class="logo" src="/logo.png"></body></html>`); }
    else if (req.url === "/s.css") { res.setHeader("content-type", "text/css"); res.end(":root{--accent:#d99a2b}body{font-family:'Rubik',sans-serif}"); }
    else if (req.url === "/logo.png") { res.setHeader("content-type", "image/png"); res.end(png); }
    else if (req.url === "/redir") { res.statusCode = 302; res.setHeader("location", "http://169.254.169.254/latest/meta-data"); res.end(); }
    else if (req.url === "/big") { res.setHeader("content-type", "text/html"); res.end("x".repeat(3_000_000)); }
    else if (req.url === "/json") { res.setHeader("content-type", "application/json"); res.end("{}"); }
    else { res.statusCode = 404; res.end(); }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => { server.close(); delete process.env.BRAND_FETCH_ALLOW_PRIVATE; });

describe("protection SSRF (par défaut : tout bloqué)", () => {
  it.each(["http://127.0.0.1/", "http://localhost/", "http://169.254.169.254/latest/meta-data", "http://[::1]/", "http://10.0.0.1/", "file:///etc/passwd", "ftp://example.com/", "http://user:pass@example.com/", "http://example.com:22/", "not a url"])("refuse %s", async (u) => {
    await expect(assertPublicUrl(u)).rejects.toMatchObject({ code: expect.stringMatching(/blocked|invalid_url/) });
  });
});

describe("safeFetch + analyzeSite (serveur local, mode test autorisant le loopback)", () => {
  beforeAll(() => { process.env.BRAND_FETCH_ALLOW_PRIVATE = "1"; });
  it("analyse un site complet : couleurs, police, logo", async () => {
    const a = await analyzeSite(base);
    expect(a.colors.primary).toBe("#0f766e"); expect(a.colors.accent).toBe("#d99a2b"); expect(a.fonts.latin).toBe("Rubik");
    expect(a.logo?.bytes.length).toBeGreaterThan(100); expect(a.siteName).toBe("Demo Agency");
  });
  it("une redirection d'un site autorisé vers les métadonnées cloud (169.254.169.254) est refusée", async () => {
    await expect(safeFetch(`${base}/redir`, { maxBytes: 1000, types: /./ })).rejects.toMatchObject({ code: "blocked" });
  });
  it("le mode test n'autorise QUE le loopback : réseaux privés et link-local restent bloqués", async () => {
    for (const u of ["http://169.254.169.254/", "http://10.0.0.5/", "http://192.168.1.1/", "http://[fd00::1]/"]) await expect(assertPublicUrl(u)).rejects.toMatchObject({ code: "blocked" });
  });
  it("taille plafonnée", async () => { await expect(safeFetch(`${base}/big`, { maxBytes: 100_000, types: /html/ })).rejects.toMatchObject({ code: "too_large" }); });
  it("type de contenu contrôlé", async () => { await expect(safeFetch(`${base}/json`, { maxBytes: 1000, types: /html/ })).rejects.toMatchObject({ code: "bad_type" }); });
  it("HTTP 404 → erreur", async () => { await expect(safeFetch(`${base}/nope`, { maxBytes: 1000, types: /./ })).rejects.toMatchObject({ code: "http" }); });
});
