import { db, seesAllProperties, type Ctx } from "../session";
import { PAGE_SIZE, type PropertyFilters } from "./filters";

/** Mandat : exclusivité, provenance (bien de l'agence ou d'une agence partenaire) et ouverture au co-courtage (שיתוף פעולה). */
export type MandateInfo = { type?: string; end?: string; origin?: "own" | "partner"; partner?: string; co_broke?: boolean };
export const buildMandate = (i: Pick<PropertyInput, "mandate_type" | "mandate_end" | "mandate_origin" | "mandate_partner" | "mandate_co_broke">): MandateInfo => ({
  type: i.mandate_type, ...(i.mandate_end ? { end: i.mandate_end } : {}), origin: i.mandate_origin,
  ...(i.mandate_origin === "partner" && i.mandate_partner ? { partner: i.mandate_partner } : {}), co_broke: i.mandate_co_broke,
});

export type PropertyListRow = {
  id: string; reference: string; transaction: string; property_type: string; status: string; price: string | null; currency: string; rooms: string | null;
  area_built: string | null; floor: number | null; floors_total: number | null; street: string | null; house_number: string | null; address_visibility: string;
  mamad: boolean | null; parking_count: number | null; elevator: boolean | null; mandate: MandateInfo | null; created_at: Date;
  agent_id: string | null; agent_name: string | null; cover_thumb: string | null; city_fr: string | null; city_he: string | null; city_en: string | null; title: string | null; total: string;
  lat: number | null; lng: number | null; approx: boolean;
};

export async function listProperties(ctx: Ctx, f: PropertyFilters) {
  return db(ctx, async (tx) => {
    const w = [tx`p.deleted_at is null`];
    if (!seesAllProperties(ctx)) w.push(tx`p.agent_id = ${ctx.userId}`);
    if (f.q) w.push(tx`p.search_text like '%' || app.normalize_search(${f.q}) || '%'`);
    if (f.transaction) w.push(f.transaction === "rent" ? tx`p.transaction in ('rent','commercial_rent')` : tx`p.transaction in ('sale','commercial_sale')`);
    if (f.status.length) w.push(tx`p.status::text = any(${f.status})`);
    if (f.cityIds.length) w.push(tx`p.city_id = any(${f.cityIds}::uuid[])`);
    if (f.roomsMin !== undefined) w.push(tx`p.rooms >= ${f.roomsMin}`);
    if (f.roomsMax !== undefined) w.push(tx`p.rooms <= ${f.roomsMax}`);
    if (f.priceMin !== undefined) w.push(tx`p.price >= ${f.priceMin}`);
    if (f.priceMax !== undefined) w.push(tx`p.price <= ${f.priceMax}`);
    for (const k of f.has) w.push(k === "parking" ? tx`coalesce(p.parking_count,0) > 0` : tx`coalesce(p.${tx(k)}, false)`);
    if (f.agent) w.push(tx`p.agent_id = ${f.agent}`);
    if (f.mandate === "exclusive") w.push(tx`p.mandate->>'type' = 'exclusive'`);
    if (f.mandate === "own") w.push(tx`coalesce(p.mandate->>'origin', 'own') = 'own'`);
    if (f.mandate === "partner") w.push(tx`p.mandate->>'origin' = 'partner'`);
    if (f.mandate === "co_broke") w.push(tx`(p.mandate->>'co_broke')::boolean is true`);
    if (f.mandate === "expiring") w.push(tx`p.mandate->>'type' = 'exclusive' and (p.mandate->>'end')::date between current_date and current_date + 30`);
    const where = w.reduce((a, b) => tx`${a} and ${b}`);
    const order = { recent: tx`p.created_at desc`, price_asc: tx`p.price asc nulls last`, price_desc: tx`p.price desc nulls last`, mandate: tx`(p.mandate->>'end') asc nulls last` }[f.sort];
    const rows = (await tx`
      select p.id, p.reference, p.transaction, p.property_type, p.status, p.price, p.currency, p.rooms, p.area_built, p.floor, p.floors_total, p.street, p.house_number,
        p.address_visibility, p.mamad, p.parking_count, p.elevator, p.mandate, p.created_at, p.agent_id, ag.full_name as agent_name,
        g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en, coalesce(p.lat, g.lat) as lat, coalesce(p.lng, g.lng) as lng, (p.lat is null) as approx,
        (select t.title from public.property_translations t where t.property_id = p.id order by (t.locale = ${ctx.locale}) desc limit 1) as title,
        (select pm.thumb_path from public.property_media pm where pm.property_id = p.id and pm.kind = 'photo' order by pm.is_cover desc, pm.position limit 1) as cover_thumb,
        count(*) over() as total
      from public.properties p
      left join public.geo_places g on g.id = p.city_id
      left join public.profiles ag on ag.id = p.agent_id
      where ${where} order by ${order}, p.id limit ${PAGE_SIZE} offset ${(f.page - 1) * PAGE_SIZE}`) as unknown as PropertyListRow[];
    return { rows, total: rows[0] ? Number(rows[0].total) : 0 };
  });
}

export async function getProperty(ctx: Ctx, id: string) {
  return db(ctx, async (tx) => {
    const [p] = await tx`
      select p.*, ag.full_name as agent_name, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en, g.id as city_gid
      from public.properties p left join public.profiles ag on ag.id = p.agent_id left join public.geo_places g on g.id = p.city_id
      where p.id = ${id} and p.deleted_at is null`;
    if (!p || (!seesAllProperties(ctx) && p.agent_id !== ctx.userId)) return null;
    const translations = await tx`select locale, title, description, origin, reviewed from public.property_translations where property_id = ${id}`;
    const owners = await tx`select c.id, c.first_name, c.last_name, c.first_name_he, c.last_name_he, c.phones, c.preferred_locale, pc.relation from public.property_contacts pc join public.contacts c on c.id = pc.contact_id where pc.property_id = ${id}`;
    const matches = await tx`
      select m.contact_id, m.score, m.reasons, c.first_name, c.last_name, c.first_name_he, c.last_name_he, c.preferred_locale, c.phones, c.emails
      from public.match_contacts_for_property(${id}) m join public.contacts c on c.id = m.contact_id order by m.score desc, c.last_name limit 30`;
    const activity = await tx`select kind, summary, occurred_at from public.activities where property_id = ${id} order by occurred_at desc limit 10`;
    const visits = await tx`select v.id, v.starts_at, v.status, c.first_name, c.last_name from public.visits v left join public.contacts c on c.id = v.contact_id where v.property_id = ${id} order by v.starts_at desc limit 8`;
    return { p: p as Record<string, any>, translations: translations as unknown as { locale: string; title: string | null; description: string | null; origin: string; reviewed: boolean }[], owners: owners as unknown as Record<string, any>[], matches: matches as unknown as Record<string, any>[], activity: activity as unknown as Record<string, any>[], visits: visits as unknown as Record<string, any>[] };
  });
}

export type PropertyInput = {
  transaction: "sale" | "rent"; property_type: string; status: string; city_id: string | null; street: string | null; house_number: string | null; address_visibility: string;
  price: number | null; currency: string; rooms: number | null; area_built: number | null; floor: number | null; floors_total: number | null;
  mamad: boolean; parking_count: number; elevator: boolean; sukkah_balcony: boolean; storage: boolean; ac: boolean;
  arnona_monthly: number | null; vaad_bayit_monthly: number | null; registration_type: string | null;
  mandate_type: "exclusive" | "non_exclusive"; mandate_end: string | null; mandate_origin: "own" | "partner"; mandate_partner: string | null; mandate_co_broke: boolean; commission_pct: number | null; internal_notes: string | null;
  titles: Record<string, string>; descriptions: Record<string, string>; agent_id?: string | null;
};

async function saveTranslations(tx: any, orgId: string, propertyId: string, locale: string, i: PropertyInput) {
  for (const l of ["fr", "he", "en"]) {
    const title = i.titles[l]?.trim() || null, description = i.descriptions[l]?.trim() || null;
    if (!title && !description) continue;
    await tx`insert into public.property_translations (property_id, organization_id, locale, title, description, origin, reviewed)
             values (${propertyId}, ${orgId}, ${l}, ${title}, ${description}, 'manual', true)
             on conflict (property_id, locale) do update set title = excluded.title, description = excluded.description, origin = 'manual', reviewed = true`;
  }
}

export async function createProperty(ctx: Ctx, i: PropertyInput, locale: string) {
  return db(ctx, async (tx) => {
    const mandate = buildMandate(i);
    const [row] = await tx`
      insert into public.properties (organization_id, transaction, property_type, status, agent_id, city_id, street, house_number, address_visibility, price, currency, rooms, area_built, floor, floors_total,
        mamad, parking_count, elevator, sukkah_balcony, storage, ac, arnona_monthly, vaad_bayit_monthly, registration_type, mandate, commission_pct, internal_notes, published_at, public_token)
      values (${ctx.orgId}, ${i.transaction}, ${i.property_type}, ${i.status}, ${i.agent_id ?? ctx.userId}, ${i.city_id}, ${i.street}, ${i.house_number}, ${i.address_visibility}, ${i.price}, ${i.currency}, ${i.rooms}, ${i.area_built}, ${i.floor}, ${i.floors_total},
        ${i.mamad}, ${i.parking_count}, ${i.elevator}, ${i.sukkah_balcony}, ${i.storage}, ${i.ac}, ${i.arnona_monthly}, ${i.vaad_bayit_monthly}, ${i.registration_type}, ${tx.json(mandate)}, ${i.commission_pct}, ${i.internal_notes},
        ${i.status === "active" ? tx`now()` : null}, encode(extensions.gen_random_bytes(12), 'hex'))
      returning id`;
    await saveTranslations(tx, ctx.orgId, row!.id, locale, i);
    return row!.id as string;
  });
}

export async function updateProperty(ctx: Ctx, id: string, i: PropertyInput, locale: string) {
  return db(ctx, async (tx) => {
    const mandate = buildMandate(i);
    const rows = await tx`
      update public.properties set transaction = ${i.transaction}, property_type = ${i.property_type}, status = ${i.status}, city_id = ${i.city_id}, street = ${i.street}, house_number = ${i.house_number},
        address_visibility = ${i.address_visibility}, price = ${i.price}, currency = ${i.currency}, rooms = ${i.rooms}, area_built = ${i.area_built}, floor = ${i.floor}, floors_total = ${i.floors_total},
        mamad = ${i.mamad}, parking_count = ${i.parking_count}, elevator = ${i.elevator}, sukkah_balcony = ${i.sukkah_balcony}, storage = ${i.storage}, ac = ${i.ac},
        arnona_monthly = ${i.arnona_monthly}, vaad_bayit_monthly = ${i.vaad_bayit_monthly}, registration_type = ${i.registration_type}, mandate = ${tx.json(mandate)}::jsonb || jsonb_strip_nulls(jsonb_build_object('signed', mandate->'signed', 'mandate_id', mandate->'mandate_id', 'start', mandate->'start')), commission_pct = ${i.commission_pct}, internal_notes = ${i.internal_notes},
        published_at = coalesce(published_at, ${i.status === "active" ? tx`now()` : null})
      where id = ${id} returning id`;
    if (!rows.length) return false; // RLS : bien d'un autre agent sans droit write_all, ou inexistant
    await saveTranslations(tx, ctx.orgId, id, locale, i);
    return true;
  });
}

export async function archiveProperty(ctx: Ctx, id: string) {
  return db(ctx, async (tx) => (await tx`update public.properties set deleted_at = now(), status = 'withdrawn' where id = ${id} returning id`).length > 0);
}

export const PROPERTY_STATUSES = ["draft", "active", "under_offer", "sold", "rented", "withdrawn"] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

/** Changement de statut rapide (depuis la liste). « Actif » exige un prix et une ville, comme le formulaire. */
export async function setPropertyStatus(ctx: Ctx, id: string, status: PropertyStatus): Promise<"ok" | "forbidden" | "active_needs_price_city"> {
  return db(ctx, async (tx) => {
    const [p] = await tx`select price, city_id from public.properties where id = ${id} and deleted_at is null`;
    if (!p) return "forbidden";
    if (status === "active" && (p.price === null || !p.city_id)) return "active_needs_price_city";
    const rows = await tx`update public.properties set status = ${status}, published_at = coalesce(published_at, ${status === "active" ? tx`now()` : null}) where id = ${id} returning id`;
    if (!rows.length) return "forbidden";
    await tx`insert into public.activities (organization_id, kind, property_id, summary, payload) values (${ctx.orgId}, 'status_change', ${id}, 'status_change', ${tx.json({ status })})`;
    return "ok";
  });
}
