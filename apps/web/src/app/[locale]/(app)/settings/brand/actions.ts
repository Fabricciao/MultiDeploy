"use server";
import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/session";
import { analyzeSite } from "@/lib/brand/analyze";
import { FetchError } from "@/lib/brand/ssrf";
import { isHexColor } from "@/lib/brand/extract";
import { saveBrandKit } from "@/lib/data/brand";

export type AnalyzeState = { error?: string; proposal?: { colors: { primary: string; secondary: string; accent: string }; font: string | null; siteName: string | null; hasLogo: boolean; sourceUrl: string; logoB64?: string } } | null;
const loc = (fd: FormData) => (["fr", "he", "en"].includes(String(fd.get("locale"))) ? String(fd.get("locale")) : "fr");

export async function analyzeBrandAction(_p: AnalyzeState, fd: FormData): Promise<AnalyzeState> {
  const ctx = await getCtx(loc(fd));
  if (!ctx.caps.has("brand.manage")) return { error: "forbidden" };
  const url = String(fd.get("url") ?? "").trim().slice(0, 300);
  if (!url) return { error: "url_required" };
  try {
    const a = await analyzeSite(url);
    return { proposal: { colors: a.colors, font: a.fonts.latin, siteName: a.siteName, hasLogo: !!a.logo, sourceUrl: a.sourceUrl, logoB64: a.logo ? a.logo.bytes.toString("base64") : undefined } };
  } catch (e) { return { error: e instanceof FetchError ? e.code : "failed" }; }
}

export type SaveBrandState = { ok?: boolean; error?: string } | null;
export async function saveBrandAction(_p: SaveBrandState, fd: FormData): Promise<SaveBrandState> {
  const locale = loc(fd);
  const ctx = await getCtx(locale);
  if (!ctx.caps.has("brand.manage")) return { error: "forbidden" };
  const c = { primary: String(fd.get("primary")), secondary: String(fd.get("secondary")), accent: String(fd.get("accent")) };
  if (![c.primary, c.secondary, c.accent].every(isHexColor)) return { error: "invalid_color" };
  const radius = Math.min(12, Math.max(0, Number(fd.get("radius") ?? 6) || 0));
  const density = (["comfortable", "standard", "compact"] as const).find((d) => d === fd.get("density")) ?? "standard";
  const t = (k: string, n = 400) => String(fd.get(k) ?? "").trim().slice(0, n);
  let logo: Buffer | null = null;
  const file = fd.get("logo");
  if (file instanceof File && file.size > 0) { if (file.size > 3_000_000) return { error: "logo_too_large" }; logo = Buffer.from(await file.arrayBuffer()); }
  else if (typeof fd.get("logo_b64") === "string" && String(fd.get("logo_b64")).length > 0 && String(fd.get("logo_b64")).length < 4_200_000) logo = Buffer.from(String(fd.get("logo_b64")), "base64");
  try {
    const ok = await saveBrandKit(ctx, { colors: c, fonts: { latin: t("font_latin", 60) || null, hebrew: t("font_hebrew", 60) || "Heebo" }, style: { radius, density }, legal_footer: { fr: t("legal_fr"), he: t("legal_he"), en: t("legal_en") }, contact: { phone: t("phone", 40), email: t("email", 120), website: t("website", 200) }, source_url: t("source_url", 300) || null }, logo);
    if (!ok) return { error: "forbidden" };
  } catch { return { error: "logo_invalid" }; }
  revalidatePath(`/${locale}`, "layout");
  return { ok: true };
}
