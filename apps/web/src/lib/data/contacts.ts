import { db, type Ctx } from "../session";
import { PAGE_SIZE, type ContactFilters } from "./filters";

export type ContactListRow = {
  id: string; kinds: string[]; first_name: string | null; last_name: string | null; first_name_he: string | null; last_name_he: string | null; phones: { e164: string; is_whatsapp?: boolean }[];
  preferred_locale: string; aliyah_status: string | null; owner_id: string | null; owner_name: string | null; budget_max: string | null; tags: string[]; created_at: Date;
  has_profile: boolean; last_activity: Date | null; total: string;
};
export const contactName = (c: { first_name?: string | null; last_name?: string | null; first_name_he?: string | null; last_name_he?: string | null }, locale: string) => {
  const lat = [c.first_name, c.last_name].filter(Boolean).join(" "), he = [c.first_name_he, c.last_name_he].filter(Boolean).join(" ");
  return (locale === "he" ? he || lat : lat || he) || "—";
};

export async function listContacts(ctx: Ctx, f: ContactFilters) {
  return db(ctx, async (tx) => {
    const w = [tx`c.deleted_at is null`];
    if (f.q) w.push(tx`c.search_text like '%' || app.normalize_search(${f.q}) || '%'`);
    if (f.kind) w.push(tx`${f.kind}::public.contact_kind = any(c.kinds)`);
    if (f.owner) w.push(tx`c.owner_id = ${f.owner}`);
    const where = w.reduce((a, b) => tx`${a} and ${b}`);
    const rows = (await tx`
      select c.id, c.kinds::text[] as kinds, c.first_name, c.last_name, c.first_name_he, c.last_name_he, c.phones, c.preferred_locale, c.aliyah_status, c.owner_id, o.full_name as owner_name,
        c.budget_max, c.tags, c.created_at, exists (select 1 from public.contact_search_profiles s where s.contact_id = c.id and s.active) as has_profile,
        (select max(a.occurred_at) from public.activities a where a.contact_id = c.id) as last_activity, count(*) over() as total
      from public.contacts c left join public.profiles o on o.id = c.owner_id
      where ${where} order by coalesce((select max(a.occurred_at) from public.activities a where a.contact_id = c.id), c.created_at) desc, c.id limit ${PAGE_SIZE} offset ${(f.page - 1) * PAGE_SIZE}`) as unknown as ContactListRow[];
    return { rows, total: rows[0] ? Number(rows[0].total) : 0 };
  });
}

export async function getContact(ctx: Ctx, id: string) {
  return db(ctx, async (tx) => {
    const [c] = await tx`select c.*, c.kinds::text[] as kinds, o.full_name as owner_name, s.name as source_name from public.contacts c left join public.profiles o on o.id = c.owner_id left join public.lead_sources s on s.id = c.source_id where c.id = ${id} and c.deleted_at is null`;
    if (!c) return null;
    const profiles = await tx`select sp.*, (select coalesce(json_agg(json_build_object('id', g.id, 'fr', g.name_fr, 'he', g.name_he, 'en', g.name_en)), '[]') from public.geo_places g where g.id = any(sp.city_ids)) as cities from public.contact_search_profiles sp where sp.contact_id = ${id} order by sp.created_at`;
    const matches = await tx`
      select m.property_id, m.score, m.reasons, p.reference, p.price, p.currency, p.rooms, p.area_built, p.street, p.property_type, p.status,
        g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en,
        (select t.title from public.property_translations t where t.property_id = p.id order by (t.locale = ${ctx.locale}) desc limit 1) as title
      from public.match_properties_for_contact(${id}) m join public.properties p on p.id = m.property_id left join public.geo_places g on g.id = p.city_id
      order by m.score desc, p.price limit 24`;
    const activities = await tx`select a.id, a.kind, a.summary, a.occurred_at, u.full_name as actor_name from public.activities a left join public.profiles u on u.id = a.actor_id where a.contact_id = ${id} order by a.occurred_at desc limit 25`;
    const tasks = await tx`select id, title, due_at, done_at from public.tasks where contact_id = ${id} order by (done_at is not null), due_at nulls last limit 10`;
    const shares = await tx`select s.id, s.channel, s.status, s.sent_at, s.opened_at, s.created_at, cardinality(s.property_ids) as n from public.shares s where s.contact_id = ${id} order by s.created_at desc limit 8`;
    const deals = await tx`select d.id, d.value, d.currency, st.name as stage_name, st.kind from public.deals d join public.pipeline_stages st on st.id = d.stage_id where d.contact_id = ${id} and d.deleted_at is null order by d.created_at desc`;
    return { c: c as Record<string, any>, profiles: profiles as unknown as Record<string, any>[], matches: matches as unknown as Record<string, any>[], activities: activities as unknown as Record<string, any>[], tasks: tasks as unknown as Record<string, any>[], shares: shares as unknown as Record<string, any>[], deals: deals as unknown as Record<string, any>[] };
  });
}

export type ContactInput = {
  first_name: string | null; last_name: string | null; first_name_he: string | null; last_name_he: string | null; kinds: string[];
  phone: string | null; email: string | null; preferred_locale: string; aliyah_status: string | null; budget_max: number | null; notes: string | null;
  marketing_opt_in: boolean; source_id: string | null;
  profile: null | { transaction: "sale" | "rent"; city_ids: string[]; price_max: number | null; rooms_min: number | null; rooms_max: number | null; must_have: string[]; nice_to_have: string[] };
};

export class DuplicatePhoneError extends Error { constructor(public existingId: string) { super("duplicate_phone"); } }

export async function createContact(ctx: Ctx, i: ContactInput) {
  return db(ctx, async (tx) => {
    if (i.phone) {
      const [dup] = await tx`select id from public.contacts where phone_primary_e164 = ${i.phone} and deleted_at is null limit 1`;
      if (dup) throw new DuplicatePhoneError(dup.id);
    }
    const phones = i.phone ? [{ e164: i.phone, is_whatsapp: true }] : [];
    const emails = i.email ? [{ email: i.email }] : [];
    const consent = { granted: i.marketing_opt_in, at: new Date().toISOString(), channel: "crm_manual" };
    const [row] = await tx`
      insert into public.contacts (organization_id, kinds, first_name, last_name, first_name_he, last_name_he, phones, emails, preferred_locale, aliyah_status, budget_max, budget_currency, notes, marketing_consent, source_id)
      values (${ctx.orgId}, ${i.kinds}::public.contact_kind[], ${i.first_name}, ${i.last_name}, ${i.first_name_he}, ${i.last_name_he}, ${tx.json(phones)}, ${tx.json(emails)}, ${i.preferred_locale}, ${i.aliyah_status}, ${i.budget_max}, 'ILS', ${i.notes}, ${tx.json(consent)}, ${i.source_id})
      returning id`;
    if (i.profile) {
      const p = i.profile;
      await tx`insert into public.contact_search_profiles (organization_id, contact_id, transaction, city_ids, price_max, rooms_min, rooms_max, must_have, nice_to_have)
               values (${ctx.orgId}, ${row!.id}, ${p.transaction}, ${p.city_ids}::uuid[], ${p.price_max}, ${p.rooms_min}, ${p.rooms_max}, ${p.must_have}, ${p.nice_to_have})`;
    }
    await tx`insert into public.activities (organization_id, kind, contact_id, summary) values (${ctx.orgId}, 'system', ${row!.id}, 'created')`;
    return row!.id as string;
  });
}

export async function updateContactCore(ctx: Ctx, id: string, i: Omit<ContactInput, "profile" | "marketing_opt_in" | "source_id">) {
  return db(ctx, async (tx) => {
    if (i.phone) {
      const [dup] = await tx`select id from public.contacts where phone_primary_e164 = ${i.phone} and deleted_at is null and id <> ${id} limit 1`;
      if (dup) throw new DuplicatePhoneError(dup.id);
    }
    const phones = i.phone ? [{ e164: i.phone, is_whatsapp: true }] : [];
    const emails = i.email ? [{ email: i.email }] : [];
    const rows = await tx`update public.contacts set first_name = ${i.first_name}, last_name = ${i.last_name}, first_name_he = ${i.first_name_he}, last_name_he = ${i.last_name_he},
      kinds = ${i.kinds}::public.contact_kind[], phones = ${tx.json(phones)}, emails = ${tx.json(emails)}, preferred_locale = ${i.preferred_locale}, aliyah_status = ${i.aliyah_status},
      budget_max = ${i.budget_max}, notes = ${i.notes} where id = ${id} returning id`;
    return rows.length > 0;
  });
}

export async function addNote(ctx: Ctx, contactId: string, text: string) {
  return db(ctx, async (tx) => (await tx`insert into public.activities (organization_id, kind, contact_id, summary) select ${ctx.orgId}, 'note', c.id, ${text} from public.contacts c where c.id = ${contactId} returning id`).length > 0);
}

export async function listSources(ctx: Ctx) {
  return (await db(ctx, (tx) => tx`select id, name from public.lead_sources order by position`)) as unknown as { id: string; name: { fr: string; he: string; en: string } }[];
}
