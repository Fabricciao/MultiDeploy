import { publicOrigin } from "@/lib/origin";
import type { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { guard, json, preflight } from "@/lib/api/http";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(req, "properties:read"); if ("res" in g) return g.res;
  const { id } = await params;
  if (!/^[0-9a-f]{24}$/.test(id)) return json({ error: "not_found" }, 404);
  const [r] = await sql`select p.public_token as id, p.reference, p.transaction, p.property_type, p.price, p.currency, p.rooms, p.area_built, p.floor, p.floors_total, p.mamad, p.parking_count, p.elevator, p.arnona_monthly, p.vaad_bayit_monthly,
      g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en, case p.address_visibility when 'hidden' then null when 'neighborhood' then null else p.street end as street,
      coalesce((select jsonb_object_agg(t.locale, jsonb_build_object('title', t.title, 'description', t.description)) from public.property_translations t where t.property_id = p.id), '{}') as text,
      coalesce((select jsonb_agg(pm.id order by pm.is_cover desc, pm.position) from public.property_media pm where pm.property_id = p.id and pm.kind = 'photo' and pm.visibility = 'public'), '[]') as photo_ids
    from public.properties p left join public.geo_places g on g.id = p.city_id where p.public_token = ${id} and p.organization_id = ${g.auth.orgId} and p.deleted_at is null and p.status = 'active'`;
  if (!r) return json({ error: "not_found" }, 404);
  return json({ data: { ...r, photos: (r.photo_ids as string[]).map((pid) => `${publicOrigin(req)}/api/public/photo/${r.id}/${pid}`), photo_ids: undefined } });
}
