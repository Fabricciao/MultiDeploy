import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { sql } from "../db";
import { db, type Ctx } from "../session";
import { storage } from "../storage";

export type Profile = { fullName: string; phone: string; avatarUrl: string | null; email: string };

export async function getProfile(ctx: Ctx): Promise<Profile> {
  const [p] = await db(ctx, (tx) => tx`select full_name, phone, avatar_url from public.profiles where id = ${ctx.userId}`);
  const [u] = await sql`select email from auth.users where id = ${ctx.userId}`;
  return { fullName: (p?.full_name as string) ?? "", phone: (p?.phone as string) ?? "", avatarUrl: (p?.avatar_url as string) ?? null, email: (u?.email as string) ?? "" };
}

/** Enregistre le profil de l'utilisateur connecté (RLS : uniquement sa propre ligne). Photo : recadrée en carré 320 px (WebP) et stockée dans l'espace privé de l'agence active. */
export async function saveProfile(ctx: Ctx, i: { fullName: string; phone: string | null }, avatar: Buffer | null, removeAvatar: boolean): Promise<boolean> {
  let newKey: string | null = null;
  if (avatar) {
    const img = await sharp(avatar).rotate().resize({ width: 320, height: 320, fit: "cover" }).webp({ quality: 85 }).toBuffer(); // valide aussi que c'est bien une image
    newKey = `org/${ctx.orgId}/avatar/${randomUUID()}.webp`;
    await storage.put(newKey, img, "image/webp");
  }
  const old = await db(ctx, async (tx) => {
    const [o] = await tx`select avatar_url from public.profiles where id = ${ctx.userId}`;
    const rows = await tx`update public.profiles set full_name = ${i.fullName}, phone = ${i.phone},
        avatar_url = ${newKey ?? (removeAvatar ? null : (o?.avatar_url as string | null) ?? null)} where id = ${ctx.userId} returning id`;
    return rows.length > 0 ? ((o?.avatar_url as string | null) ?? null) : undefined;
  });
  if (old === undefined) { if (newKey) await storage.remove(newKey); return false; }
  // Ancienne photo : supprimée seulement si c'est un fichier que nous avons stocké (jamais une URL externe).
  if (old && old !== newKey && (newKey || removeAvatar) && old.startsWith("org/")) await storage.remove(old).catch(() => {});
  return true;
}
