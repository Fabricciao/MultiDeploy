import { describe, expect, it } from "vitest";
import { avatarSrc, parseProfileInput } from "./profile-input";

describe("parseProfileInput", () => {
  it("exige un nom et le normalise", () => {
    expect(parseProfileInput("", "")).toEqual({ ok: false, error: "name_required" });
    expect(parseProfileInput("   ", null)).toEqual({ ok: false, error: "name_required" });
    expect(parseProfileInput("  Eliezer   Cohen ", "")).toEqual({ ok: true, fullName: "Eliezer Cohen", phone: null });
  });
  it("accepte les numéros usuels et les champs vides", () => {
    for (const p of ["+972 54-944-4206", "054 944 4206", "+33 6 12 34 56 78", "(02) 123 4567"]) expect(parseProfileInput("A", p)).toMatchObject({ ok: true, phone: p });
  });
  it("refuse un téléphone invalide", () => {
    for (const p of ["abc", "12", "+++++++", "054-abc-4206", "1".repeat(40), "<script>"]) expect(parseProfileInput("A", p)).toEqual({ ok: false, error: "phone_invalid" });
  });
  it("tronque un nom trop long", () => {
    const r = parseProfileInput("x".repeat(300), "");
    expect(r.ok && r.fullName.length).toBe(120);
  });
});

describe("avatarSrc", () => {
  const org = "0f3a1c52-6d2e-4a88-9b1f-2a7c5e8d9b10", id = "7b9e2d41-3c58-4f6a-a0d2-1e8f4b6c7a93";
  it("sert un fichier de l'agence via /api/files", () => expect(avatarSrc(`org/${org}/avatar/${id}.webp`)).toBe(`/api/files/org/${org}/avatar/${id}.webp`));
  it("accepte une URL https, refuse le reste", () => {
    expect(avatarSrc("https://lh3.googleusercontent.com/a/abc=s96-c")).toBe("https://lh3.googleusercontent.com/a/abc=s96-c");
    for (const v of [null, undefined, "", "http://x.io/a.png", "javascript:alert(1)", `org/${org}/logo/${id}.png`, `org/${org}/avatar/../${id}.png`, 'https://x.io/"onerror=']) expect(avatarSrc(v as string)).toBeNull();
  });
});
