import { db, type Ctx } from "../session";

export type City = { id: string; name_fr: string; name_he: string; name_en: string };
export const cityName = (c: { name_fr?: string | null; name_he?: string | null; name_en?: string | null } | null, locale: string) =>
  c ? ((locale === "he" ? c.name_he : locale === "en" ? c.name_en : c.name_fr) ?? c.name_fr ?? "") : "";

export async function listCities(ctx: Ctx): Promise<City[]> {
  return db(ctx, (tx) => tx`select id, name_fr, name_he, name_en from public.geo_places where kind = 'city' order by name_fr`) as unknown as City[];
}
export async function listAgents(ctx: Ctx) {
  return (await db(ctx, (tx) => tx`select p.id, p.full_name from public.profiles p join public.memberships m on m.user_id = p.id and m.organization_id = ${ctx.orgId} and m.status = 'active' order by p.full_name`)) as unknown as { id: string; full_name: string }[];
}
