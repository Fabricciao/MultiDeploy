"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/session";
import { createHook, createKey, deleteHook, revokeKey } from "@/lib/data/integrations";

const loc = (fd: FormData) => (["fr", "he", "en"].includes(String(fd.get("locale"))) ? String(fd.get("locale")) : "fr");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCOPES = ["properties:read", "leads:write"];
async function gate(fd: FormData) { const locale = loc(fd); const ctx = await getCtx(locale); if (!ctx.caps.has("api.manage") || ctx.impersonating) redirect(`/${locale}/settings/integrations?err=forbidden`); if (!ctx.features.has("api")) redirect(`/${locale}/settings/integrations?err=plan`); return { locale, ctx }; }

export type KeyState = { key?: string; error?: string } | null;
export async function createKeyAction(_p: KeyState, fd: FormData): Promise<KeyState> {
  const locale = loc(fd); const ctx = await getCtx(locale);
  if (!ctx.caps.has("api.manage") || ctx.impersonating) return { error: "forbidden" };
  if (!ctx.features.has("api")) return { error: "plan" };
  const scopes = SCOPES.filter((s) => fd.get(`s_${s}`) === "on");
  if (!scopes.length) return { error: "scopes" };
  const raw = await createKey(ctx, String(fd.get("name") ?? "").trim() || "API", scopes);
  revalidatePath(`/${locale}/settings/integrations`);
  return { key: raw }; // affichée une seule fois, uniquement dans l'état du composant : un rechargement la fait disparaître
}
export async function revokeKeyAction(id: string, fd: FormData) { const { locale, ctx } = await gate(fd); if (uuid.test(id)) await revokeKey(ctx, id); revalidatePath(`/${locale}/settings/integrations`); redirect(`/${locale}/settings/integrations`); }
export async function createHookAction(fd: FormData) {
  const { locale, ctx } = await gate(fd);
  const r = await createHook(ctx, String(fd.get("url") ?? "").trim(), ["property.created", "contact.created", "deal.stage_changed"].filter((e) => fd.get(`e_${e}`) === "on"));
  revalidatePath(`/${locale}/settings/integrations`); redirect(`/${locale}/settings/integrations${r === "ok" ? "?ok=hook" : `?err=${r}`}`);
}
export async function deleteHookAction(id: string, fd: FormData) { const { locale, ctx } = await gate(fd); if (uuid.test(id)) await deleteHook(ctx, id); revalidatePath(`/${locale}/settings/integrations`); redirect(`/${locale}/settings/integrations`); }
