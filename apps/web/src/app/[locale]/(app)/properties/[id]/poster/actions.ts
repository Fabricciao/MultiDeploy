"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/session";
import { generatePoster, type Level, type PosterResult } from "@/lib/data/posters";
import type { PosterFormat, PosterVariant } from "@/lib/poster/html";

export type PosterState = { results?: (PosterResult & { format?: PosterFormat })[]; error?: string } | null;
const FORMATS = ["square", "portrait", "story", "facebook", "a4"] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generatePosterAction(propertyId: string, _prev: PosterState, fd: FormData): Promise<PosterState> {
  const locale = (["fr", "he", "en"].includes(String(fd.get("locale"))) ? String(fd.get("locale")) : "fr") as "fr" | "he" | "en";
  if (!uuid.test(propertyId)) return { error: "not_found" };
  const ctx = await getCtx(locale);
  const formats = fd.getAll("format").map(String).filter((f): f is PosterFormat => (FORMATS as readonly string[]).includes(f)).slice(0, 3);
  if (!formats.length) return { error: "no_format" };
  const lang = (["fr", "he", "en"].includes(String(fd.get("poster_locale"))) ? String(fd.get("poster_locale")) : locale) as "fr" | "he" | "en";
  const variant = (["A", "B", "C"].includes(String(fd.get("variant"))) ? String(fd.get("variant")) : "A") as PosterVariant;
  const level = (["faithful", "enhanced", "creative"].includes(String(fd.get("level"))) ? String(fd.get("level")) : "faithful") as Level;
  const h = await headers();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const results: NonNullable<PosterState>["results"] = [];
  for (const format of formats) {
    const r = await generatePoster(ctx, { propertyId, format, locale: lang, variant, level, siteUrl, headline: String(fd.get("headline") ?? "").trim() || null,
      showPrice: fd.get("show_price") === "on", showAddress: fd.get("show_address") === "on", showContact: fd.get("show_contact") === "on", showQr: fd.get("show_qr") === "on" });
    results.push({ ...r, format });
    if (!r.ok) break;
  }
  revalidatePath(`/${locale}/properties/${propertyId}/poster`);
  return { results };
}
