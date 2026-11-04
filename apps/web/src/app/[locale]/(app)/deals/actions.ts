"use server";
import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/session";
import { moveDeal } from "@/lib/data/deals";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function moveDealAction(locale: string, dealId: string, stageId: string): Promise<boolean> {
  if (!uuid.test(dealId) || !uuid.test(stageId)) return false;
  const ctx = await getCtx(["fr", "he", "en"].includes(locale) ? locale : "fr");
  if (!ctx.caps.has("deals.write")) return false;
  const ok = await moveDeal(ctx, dealId, stageId);
  revalidatePath(`/${locale}/deals`);
  return ok;
}
