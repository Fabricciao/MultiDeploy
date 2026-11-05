"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/session";
import { removeConnection, removeGoogle, saveConnection, type Provider } from "@/lib/data/connections";

const loc = (fd: FormData) => (["fr", "he", "en"].includes(String(fd.get("locale"))) ? String(fd.get("locale")) : "fr");
const s = (fd: FormData, k: string, max = 600) => String(fd.get(k) ?? "").trim().slice(0, max);
const ID = /^[0-9A-Za-z_.:-]{3,64}$/;
const back = (locale: string, q: string) => redirect(`/${locale}/settings/connections?${q}`);

export async function saveConnectionAction(provider: Provider, fd: FormData) {
  const locale = loc(fd); const ctx = await getCtx(locale);
  if (!ctx.caps.has("org.manage") || ctx.impersonating) back(locale, "err=forbidden");
  const token = s(fd, "accessToken", 1000);
  let config: Record<string, string>, meta: Record<string, string>;
  if (provider === "whatsapp") {
    const id = s(fd, "phoneNumberId", 64), tpl = s(fd, "template", 100), lang = s(fd, "lang", 10);
    if (!ID.test(id) || token.length < 10) back(locale, "err=invalid");
    config = { phoneNumberId: id, accessToken: token, ...(tpl ? { template: tpl, lang: lang || "fr" } : {}) }; meta = { phone_number_id: id, display: s(fd, "display", 40) };
  } else if (provider === "facebook") {
    const id = s(fd, "pageId", 64); if (!ID.test(id) || token.length < 10) back(locale, "err=invalid");
    config = { pageId: id, accessToken: token }; meta = { page_id: id };
  } else {
    const id = s(fd, "igUserId", 64); if (!ID.test(id) || token.length < 10) back(locale, "err=invalid");
    config = { igUserId: id, accessToken: token }; meta = { ig_user_id: id };
  }
  const r = await saveConnection(ctx, provider, config, meta);
  revalidatePath(`/${locale}/settings/connections`);
  back(locale, r === "ok" ? "ok=1" : `err=${r}`);
}
export async function removeConnectionAction(provider: Provider, fd: FormData) {
  const locale = loc(fd); const ctx = await getCtx(locale);
  if (!(await removeConnection(ctx, provider))) back(locale, "err=forbidden");
  revalidatePath(`/${locale}/settings/connections`); back(locale, "ok=1");
}
export async function removeGoogleAction(fd: FormData) {
  const locale = loc(fd); const ctx = await getCtx(locale);
  if (!ctx.impersonating) await removeGoogle(ctx.userId);
  revalidatePath(`/${locale}/settings/connections`); back(locale, "ok=1");
}
