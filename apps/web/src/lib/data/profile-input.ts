/** Validation du profil utilisateur et résolution de l'adresse de la photo. Fonctions pures (testées), sans accès aux données. */
export type ProfileError = "name_required" | "phone_invalid";
export type ProfileInput = { ok: true; fullName: string; phone: string | null } | { ok: false; error: ProfileError };

export function parseProfileInput(name: unknown, phone: unknown): ProfileInput {
  const fullName = String(name ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (!fullName) return { ok: false, error: "name_required" };
  const ph = String(phone ?? "").trim();
  if (!ph) return { ok: true, fullName, phone: null };
  // Chiffres, +, espaces, points, tirets, parenthèses ; au moins 6 chiffres (numéros israéliens, français ou internationaux).
  if (!/^\+?[\d\s().-]{6,25}$/.test(ph) || (ph.match(/\d/g) ?? []).length < 6) return { ok: false, error: "phone_invalid" };
  return { ok: true, fullName, phone: ph };
}

const FILE_KEY = /^org\/[0-9a-f-]{36}\/avatar\/[0-9a-f-]{36}\.(?:png|jpe?g|webp)$/i;

/** Adresse affichable de la photo : fichier privé de l'agence (via /api/files) ou, à défaut, une URL https (ex. photo Google). Sinon null. */
export function avatarSrc(value: string | null | undefined): string | null {
  if (!value) return null;
  if (FILE_KEY.test(value) && !value.includes("..")) return `/api/files/${value}`;
  if (/^https:\/\/[^\s"'<>]+$/i.test(value) && value.length < 500) return value;
  return null;
}
