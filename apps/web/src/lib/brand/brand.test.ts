import { describe, expect, it } from "vitest";
import { extractBrand } from "./extract";
import { isPrivateIp } from "./ssrf";

const HTML = `<html><head><title>Agence Sharon | Immobilier</title><meta name="theme-color" content="#0f766e"><meta property="og:site_name" content="Sharon Estates">
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;700&display=swap" rel="stylesheet"><link rel="apple-touch-icon" href="/icon.png"><style>:root{--brand-primary:#0f766e;--accent:#d99a2b} body{font-family:'Rubik',sans-serif;color:#111;background:#fff} .x{color:#14304a}</style></head>
<body><header><img class="site-logo" src="/img/logo.svg" alt="Sharon"></header></body></html>`;

describe("extractBrand", () => {
  const r = extractBrand(HTML, [], "https://sharon.example/");
  it("couleur primaire = theme-color", () => { expect(r.colors.primary).toBe("#0f766e"); expect(r.signals).toContain("theme-color"); });
  it("accent depuis la variable CSS", () => expect(r.colors.accent).toBe("#d99a2b"));
  it("police latine depuis Google Fonts", () => expect(r.fonts.latin).toBe("Rubik"));
  it("hébreu par défaut : Heebo", () => expect(r.fonts.hebrew).toBe("Heebo"));
  it("logo : <img> en-tête, URL absolue", () => expect(r.logoUrl).toBe("https://sharon.example/img/logo.svg"));
  it("nom du site", () => expect(r.siteName).toBe("Sharon Estates"));
  it("sans signal : repli sur une couleur par défaut explicite", () => {
    const e = extractBrand("<html><body>hello</body></html>", [], "https://x.test/");
    expect(e.signals).toContain("default-primary"); expect(e.colors.primary).toMatch(/^#[0-9a-f]{6}$/);
  });
  it("ignore blancs, noirs et gris (non saturés)", () => {
    const e = extractBrand("<html><body></body></html>", ["a{color:#ffffff}b{color:#000}c{color:#888888}d{color:#c2410c}d2{color:#c2410c}"], "https://x.test/");
    expect(e.colors.primary).toBe("#c2410c");
  });
});
describe("isPrivateIp", () => {
  it.each(["127.0.0.1", "10.1.2.3", "192.168.0.5", "172.16.0.1", "172.31.255.255", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fe80::1", "fd00::1", "::ffff:127.0.0.1", "224.0.0.1"])("%s est privée", (ip) => expect(isPrivateIp(ip)).toBe(true));
  it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "93.184.216.34", "2606:4700:4700::1111"])("%s est publique", (ip) => expect(isPrivateIp(ip)).toBe(false));
});
