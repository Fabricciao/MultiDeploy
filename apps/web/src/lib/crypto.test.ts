import { beforeAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { decryptJson, encryptJson, signToken, verifyToken } from "./crypto";

beforeAll(() => { process.env.INTEGRATIONS_KEY = randomBytes(32).toString("base64"); });
describe("chiffrement AES-256-GCM", () => {
  it("aller-retour", () => expect(decryptJson(encryptJson({ token: "EAAB…", n: 1 }, "org-1"), "org-1")).toEqual({ token: "EAAB…", n: 1 }));
  it("IV aléatoire : deux chiffrements du même texte diffèrent", () => expect(encryptJson({ a: 1 })).not.toBe(encryptJson({ a: 1 })));
  it("données associées (AAD) : un blob d'une agence ne se déchiffre pas pour une autre", () => expect(() => decryptJson(encryptJson({ a: 1 }, "org-1"), "org-2")).toThrow());
  it("détecte toute altération", () => { const b = encryptJson({ a: 1 }); const parts = b.split("."); parts[3] = Buffer.from("x" + Buffer.from(parts[3]!, "base64url").toString("latin1").slice(1), "latin1").toString("base64url"); expect(() => decryptJson(parts.join("."))).toThrow(); });
  it("refuse un format inconnu", () => expect(() => decryptJson("nope")).toThrow());
  it("clé absente ou de mauvaise taille : erreur explicite (jamais de chiffrement faible)", () => { const k = process.env.INTEGRATIONS_KEY; process.env.INTEGRATIONS_KEY = "court"; expect(() => encryptJson({})).toThrow(/INTEGRATIONS_KEY/); process.env.INTEGRATIONS_KEY = k; });
});
describe("jetons signés", () => {
  it("valide puis expire", () => { const t = signToken({ v: "visit-1" }, 60, 1_000_000); expect(verifyToken(t, 1_000_000 + 30_000)?.v).toBe("visit-1"); expect(verifyToken(t, 1_000_000 + 61_000)).toBeNull(); });
  it("refuse une charge utile modifiée ou une mauvaise signature", () => { const t = signToken({ v: "a" }, 60); const [, sig] = t.split("."); const forged = Buffer.from(JSON.stringify({ v: "b", exp: 9999999999 })).toString("base64url") + "." + sig; expect(verifyToken(forged)).toBeNull(); expect(verifyToken("x.y")).toBeNull(); expect(verifyToken("")).toBeNull(); });
});
