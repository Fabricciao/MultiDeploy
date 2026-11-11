"use server";
import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/session";
import { sendSlipEmail, siteBase, type SlipSendResult } from "@/lib/data/slips";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type SlipEmailState = { status: SlipSendResult } | null;

export async function sendSlipEmailAction(visitId: string, _p: SlipEmailState, fd: FormData): Promise<SlipEmailState> {
  const l = String(fd.get("locale")); const locale = ["fr", "he", "en"].includes(l) ? l : "fr";
  if (!uuid.test(visitId)) return { status: "forbidden" };
  const ctx = await getCtx(locale);
  const lang = String(fd.get("lang") ?? "");
  const status = await sendSlipEmail(ctx, visitId, await siteBase(), lang === "fr" || lang === "he" || lang === "en" ? lang : undefined);
  revalidatePath(`/${locale}/visit-slips`);
  return { status };
}
