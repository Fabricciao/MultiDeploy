"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/session";
import { sendShares, type ShareResult } from "@/lib/data/shares";

export type SendState = { results?: ShareResult[]; error?: string } | null;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Envoie une sélection (biens × clients) par e-mail ou lien WhatsApp. Les ids ne sont jamais crus : tout passe par la RLS. */
export async function sendSelection(_prev: SendState, fd: FormData): Promise<SendState> {
  const locale = ["fr", "he", "en"].includes(String(fd.get("locale"))) ? String(fd.get("locale")) : "fr";
  const ctx = await getCtx(locale);
  if (!ctx.caps.has("shares.send")) return { error: "forbidden" };
  const contactIds = fd.getAll("contact").map(String).filter((x) => uuid.test(x)).slice(0, 30);
  const propertyIds = fd.getAll("property").map(String).filter((x) => uuid.test(x)).slice(0, 10);
  const channel = fd.get("channel") === "whatsapp_link" ? "whatsapp_link" : "email";
  const message = String(fd.get("message") ?? "").trim().slice(0, 600) || undefined;
  if (!contactIds.length || !propertyIds.length) return { error: "nothing_selected" };
  const h = await headers();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const results = await sendShares(ctx, { contactIds, propertyIds, channel, message }, site);
  revalidatePath(`/${locale}`, "layout");
  return { results };
}
