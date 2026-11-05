import { describe, expect, it } from "vitest";
import { publicOrigin } from "./origin";
const r = (url: string, h: Record<string, string> = {}) => new Request(url, { headers: h });
describe("publicOrigin", () => {
  it("derrière Traefik : Host + X-Forwarded-Proto", () => expect(publicOrigin(r("http://0.0.0.0:3000/auth/callback", { host: "crm.example.test", "x-forwarded-proto": "https" }))).toBe("https://crm.example.test"));
  it("X-Forwarded-Host prioritaire", () => expect(publicOrigin(r("http://0.0.0.0:3000/x", { "x-forwarded-host": "a.example.test", host: "0.0.0.0:3000", "x-forwarded-proto": "https" }))).toBe("https://a.example.test"));
  it("développement : sans en-têtes, l'URL de la requête", () => expect(publicOrigin(r("http://localhost:3120/x", { host: "localhost:3120" }))).toBe("http://localhost:3120"));
  it("hôte invalide → repli sûr", () => expect(publicOrigin(r("http://localhost:3120/x", { host: "evil.test/<script>" }))).toBe("http://localhost:3120"));
});
