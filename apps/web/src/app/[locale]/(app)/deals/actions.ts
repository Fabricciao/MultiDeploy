"use server";
import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/session";
import { redirect } from "next/navigation";
import { createDeal, moveDeal } from "@/lib/data/deals";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function moveDealAction(locale: string, dealId: string, stageId: string): Promise<boolean> {
  if (!uuid.test(dealId) || !uuid.test(stageId)) return false;
  const ctx = await getCtx(["fr", "he", "en"].includes(locale) ? locale : "fr");
  if (!ctx.caps.has("deals.write")) return false;
  const ok = await moveDeal(ctx, dealId, stageId);
  revalidatePath(`/${locale}/deals`);
  return ok;
}

/** Nouvelle affaire depuis le tableau : client obligatoire, bien, montant et étape facultatifs. */
export async function createDealFormAction(fd: FormData) {
  const locale = ["fr", "he", "en"].includes(String(fd.get("locale"))) ? String(fd.get("locale")) : "fr";
  const ctx = await getCtx(locale);
  const contact = String(fd.get("contact") ?? ""), prop = String(fd.get("property") ?? ""), stage = String(fd.get("stage") ?? "");
  if (!ctx.caps.has("deals.write") || !uuid.test(contact)) redirect(`/${locale}/deals?err=deal`);
  const value = Number(fd.get("value") ?? "");
  const id = await createDeal(ctx, contact, uuid.test(prop) ? prop : null, Number.isFinite(value) && value > 0 ? value : null, uuid.test(stage) ? stage : null);
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/deals${id ? "" : "?err=deal"}`);
}
