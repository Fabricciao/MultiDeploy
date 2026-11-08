"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/session";
import { parsePropertyForm, type FormErrors } from "@/lib/data/forms";
import { archiveProperty, createProperty, PROPERTY_STATUSES, setPropertyStatus, updateProperty, type PropertyStatus } from "@/lib/data/properties";

export type FormState = { errors?: FormErrors; error?: string } | null;
const loc = (fd: FormData) => (["fr", "he", "en"].includes(String(fd.get("locale"))) ? String(fd.get("locale")) : "fr");

export async function saveProperty(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const locale = loc(fd);
  const ctx = await getCtx(locale);
  if (!ctx.caps.has("properties.write")) return { error: "forbidden" };
  const parsed = parsePropertyForm(fd);
  if (!parsed.ok) return { errors: parsed.errors };
  let target = id;
  if (id) {
    if (!(await updateProperty(ctx, id, parsed.data, locale))) return { error: "forbidden" };
  } else {
    target = await createProperty(ctx, parsed.data, locale);
  }
  revalidatePath(`/${locale}/properties`);
  redirect(`/${locale}/properties/${target}`);
}

export async function archivePropertyAction(id: string, fd: FormData) {
  const locale = loc(fd);
  const ctx = await getCtx(locale);
  if (!ctx.caps.has("properties.delete") && !ctx.caps.has("properties.write_all")) redirect(`/${locale}/properties/${id}`);
  await archiveProperty(ctx, id);
  revalidatePath(`/${locale}/properties`);
  redirect(`/${locale}/properties`);
}

/** Statut en un clic depuis la ligne d'un bien. Renvoie un code d'erreur traduit côté client. */
export async function quickStatusAction(locale: string, id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  const l = ["fr", "he", "en"].includes(locale) ? locale : "fr";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !(PROPERTY_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "forbidden" };
  const ctx = await getCtx(l);
  if (!ctx.caps.has("properties.write") || ctx.impersonating) return { ok: false, error: "forbidden" };
  const r = await setPropertyStatus(ctx, id, status as PropertyStatus);
  revalidatePath(`/${l}`, "layout");
  return r === "ok" ? { ok: true } : { ok: false, error: r };
}
