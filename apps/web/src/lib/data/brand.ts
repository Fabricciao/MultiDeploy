import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db, type Ctx } from "../session";
import { storage } from "../storage";
import { isHexColor } from "../brand/extract";

export type BrandKit = {
  version: number; source_url: string | null; logo_path: string | null;
  colors: { primary: string; secondary: string; accent: string };
  fonts: { latin: string | null; hebrew: string };
  style: { radius: number; density: "comfortable" | "standard" | "compact" };
  legal_footer: { fr: string; he: string; en: string };
  contact: { phone: string; email: string; website: string };
};
const DEFAULT: BrandKit = { version: 1, source_url: null, logo_path: null, colors: { primary: "#1f4fd8", secondary: "#14304a", accent: "#0e8f6e" }, fonts: { latin: "Inter", hebrew: "Heebo" }, style: { radius: 6, density: "standard" }, legal_footer: { fr: "", he: "", en: "" }, contact: { phone: "", email: "", website: "" } };

export async function getBrandKit(ctx: Ctx): Promise<BrandKit> {
  const [r] = await db(ctx, (tx) => tx`select version, source_url, logo_light_path, colors, fonts, style, legal_footer, contact_block from public.brand_kits where organization_id = ${ctx.orgId}`);
  if (!r) return DEFAULT;
  const c = (r.colors ?? {}) as Partial<BrandKit["colors"]>, f = (r.fonts ?? {}) as Record<string, string | null>, s = (r.style ?? {}) as Partial<BrandKit["style"]>;
  return {
    version: r.version, source_url: r.source_url, logo_path: r.logo_light_path,
    colors: { primary: isHexColor(c.primary) ? c.primary : DEFAULT.colors.primary, secondary: isHexColor(c.secondary) ? c.secondary : DEFAULT.colors.secondary, accent: isHexColor(c.accent) ? c.accent : DEFAULT.colors.accent },
    fonts: { latin: f.latin ?? f.heading ?? null, hebrew: f.hebrew ?? "Heebo" },
    style: { radius: Math.min(12, Math.max(0, Number(s.radius ?? 6))), density: (["comfortable", "standard", "compact"] as const).includes(s.density as never) ? (s.density as BrandKit["style"]["density"]) : "standard" },
    legal_footer: { fr: "", he: "", en: "", ...((r.legal_footer ?? {}) as object) }, contact: { phone: "", email: "", website: "", ...((r.contact_block ?? {}) as object) },
  };
}

export type BrandInput = { colors: BrandKit["colors"]; fonts: BrandKit["fonts"]; style: BrandKit["style"]; legal_footer: BrandKit["legal_footer"]; contact: BrandKit["contact"]; source_url: string | null };

export async function saveBrandKit(ctx: Ctx, i: BrandInput, logo?: Buffer | null): Promise<boolean> {
  let logoKey: string | null = null;
  if (logo) {
    const png = await sharp(logo).resize({ width: 600, height: 300, fit: "inside", withoutEnlargement: true }).png().toBuffer(); // valide aussi que c'est bien une image
    logoKey = `org/${ctx.orgId}/logo/${randomUUID()}.png`;
    await storage.put(logoKey, png, "image/png");
  }
  const ok = await db(ctx, async (tx) => (await tx`
    update public.brand_kits set colors = ${tx.json(i.colors)}, fonts = ${tx.json(i.fonts)}, style = ${tx.json(i.style)}, legal_footer = ${tx.json(i.legal_footer)}, contact_block = ${tx.json(i.contact)},
      source_url = ${i.source_url}, logo_light_path = coalesce(${logoKey}, logo_light_path) where organization_id = ${ctx.orgId} returning organization_id`).length > 0);
  return ok;
}
