"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/session";
import { saveProfile } from "@/lib/data/profile";
import { parseProfileInput } from "@/lib/data/profile-input";

const loc = (fd: FormData) => (["fr", "he", "en"].includes(String(fd.get("locale"))) ? String(fd.get("locale")) : "fr");
const back = (locale: string, q: string) => redirect(`/${locale}/settings/profile?${q}`);

export async function saveProfileAction(fd: FormData) {
  const locale = loc(fd); const ctx = await getCtx(locale);
  if (ctx.impersonating) return back(locale, "err=forbidden"); // session de support : lecture seule
  const input = parseProfileInput(fd.get("full_name"), fd.get("phone"));
  if (!input.ok) return back(locale, `err=${input.error}`);
  let avatar: Buffer | null = null;
  const file = fd.get("avatar");
  if (file instanceof File && file.size > 0) { if (file.size > 3_000_000) return back(locale, "err=avatar_too_large"); avatar = Buffer.from(await file.arrayBuffer()); }
  let ok = false;
  try { ok = await saveProfile(ctx, { fullName: input.fullName, phone: input.phone }, avatar, fd.get("remove_avatar") === "on"); } catch { return back(locale, "err=avatar_invalid"); }
  if (!ok) return back(locale, "err=forbidden");
  revalidatePath(`/${locale}`, "layout"); // le nom et la photo apparaissent dans la barre latérale
  back(locale, "ok=saved");
}
