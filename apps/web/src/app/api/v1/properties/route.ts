import { publicOrigin } from "@/lib/origin";
import type { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { guard, json, preflight } from "@/lib/api/http";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

/** GET /api/v1/properties?tx=sale|rent&city=<nom>&rooms_min=&price_max=&limit=&offset= — biens actifs, champs publics uniquement. */
export async function GET(req: NextRequest) {
  const g = await guard(req, "properties:read"); if ("res" in g) return g.res;
  const q = req.nextUrl.searchParams, num = (k: string) => { const v = Number(q.get(k)); return q.get(k) && Number.isFinite(v) ? v : null; };
  const limit = Math.min(50, Math.max(1, num("limit") ?? 20)), offset = Math.max(0, num("offset") ?? 0);
  const tx = q.get("tx") === "rent" ? "rent" : q.get("tx") === "sale" ? "sale" : null, city = (q.get("city") ?? "").slice(0, 60) || null;
  const rows = await sql`
    select p.public_token as id, p.reference, p.transaction, p.property_type, p.price, p.currency, p.rooms, p.area_built, p.floor, p.floors_total, p.mamad, p.parking_count, p.elevator, p.sukkah_balcony, p.storage, p.ac, p.published_at, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en,
      case p.address_visibility when 'hidden' then null when 'neighborhood' then null else p.street end as street,
      coalesce((select jsonb_object_agg(t.locale, jsonb_build_object('title', t.title, 'description', t.description)) from public.property_translations t where t.property_id = p.id), '{}') as text,
      coalesce((select jsonb_agg(pm.id order by pm.is_cover desc, pm.position) from public.property_media pm where pm.property_id = p.id and pm.kind = 'photo' and pm.visibility = 'public'), '[]') as photo_ids
    from public.properties p left join public.geo_places g on g.id = p.city_id
    where p.organization_id = ${g.auth.orgId} and p.deleted_at is null and p.status = 'active' and p.public_token is not null
      and (${tx}::text is null or (${tx} = 'rent' and p.transaction in ('rent','commercial_rent')) or (${tx} = 'sale' and p.transaction in ('sale','commercial_sale')))
      and (${city}::text is null or ${city} in (g.name_fr, g.name_he, g.name_en))
      and (${num("rooms_min")}::numeric is null or p.rooms >= ${num("rooms_min")}) and (${num("price_max")}::numeric is null or p.price <= ${num("price_max")})
    order by p.published_at desc nulls last, p.id limit ${limit} offset ${offset}`;
  const base = publicOrigin(req);
  return json({ data: rows.map((r) => ({ ...r, photos: (r.photo_ids as string[]).map((pid) => `${base}/api/public/photo/${r.id}/${pid}`), photo_ids: undefined })), limit, offset });
}
