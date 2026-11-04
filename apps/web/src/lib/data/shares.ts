import "server-only";
import { db, type Ctx } from "../session";
import { sql } from "../db";
import { sendEmail } from "../email";
import { renderShareEmail, type EmailLocale } from "../email-templates";
import { formatPhone } from "../phone";

export type ShareChannel = "email" | "whatsapp_link";
export type ShareResult = { contactId: string; status: "sent" | "dry_run" | "failed" | "blocked_consent" | "blocked_no_contact_info" | "link"; waUrl?: string; error?: string };

const loc = (l: string): EmailLocale => (l === "he" || l === "en" ? l : "fr");
const pick = (l: EmailLocale, r: Record<string, any>, k: string) => (l === "he" ? r[`${k}_he`] : l === "en" ? r[`${k}_en`] : r[`${k}_fr`]) ?? r[`${k}_fr`] ?? "";
const nameOf = (c: Record<string, any>, l: EmailLocale) => {
  const lat = [c.first_name, c.last_name].filter(Boolean).join(" "), he = [c.first_name_he, c.last_name_he].filter(Boolean).join(" ");
  return (l === "he" ? he || lat : lat || he) || "";
};

export async function sendShares(ctx: Ctx, input: { contactIds: string[]; propertyIds: string[]; channel: ShareChannel; message?: string }, siteUrl: string): Promise<ShareResult[]> {
  // 1) lecture + création des envois sous RLS (contacts/biens visibles par l'utilisateur uniquement)
  const prepared = await db(ctx, async (tx) => {
    const contacts = await tx`select id, first_name, last_name, first_name_he, last_name_he, preferred_locale, emails, phones, do_not_contact, marketing_consent from public.contacts where id = any(${input.contactIds}::uuid[]) and deleted_at is null`;
    const props = await tx`
      select p.id, p.reference, p.price, p.currency, p.rooms, p.area_built, p.street, p.house_number, p.address_visibility, p.public_token,
        g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en,
        coalesce((select jsonb_object_agg(t.locale, t.title) from public.property_translations t where t.property_id = p.id), '{}') as titles
      from public.properties p left join public.geo_places g on g.id = p.city_id where p.id = any(${input.propertyIds}::uuid[]) and p.status in ('active','under_offer') and p.deleted_at is null`;
    const [agent] = await tx`select full_name, phone from public.profiles where id = ${ctx.userId}`;
    const [org] = await tx`select o.name_fr, o.name_he, o.name_en, b.colors from public.organizations o left join public.brand_kits b on b.organization_id = o.id where o.id = ${ctx.orgId}`;
    const out: { contact: Record<string, any>; shareId: string | null; token: string | null; result?: ShareResult }[] = [];
    for (const c of contacts) {
      const consent = (c.marketing_consent as { granted?: boolean } | null)?.granted === true;
      const email = (c.emails as { email?: string }[])[0]?.email;
      const phone = (c.phones as { e164?: string }[])[0]?.e164;
      if (c.do_not_contact || (input.channel === "email" && !consent)) { out.push({ contact: c, shareId: null, token: null, result: { contactId: c.id, status: "blocked_consent" } }); continue; }
      if ((input.channel === "email" && !email) || (input.channel === "whatsapp_link" && !phone)) { out.push({ contact: c, shareId: null, token: null, result: { contactId: c.id, status: "blocked_no_contact_info" } }); continue; }
      const l = loc(c.preferred_locale);
      const [s] = await tx`insert into public.shares (organization_id, contact_id, sender_id, channel, property_ids, locale, message, status)
        values (${ctx.orgId}, ${c.id}, ${ctx.userId}, ${input.channel}, ${props.map((p) => p.id)}::uuid[], ${l}, ${input.message ?? null}, 'queued') returning id, token`;
      out.push({ contact: c, shareId: s!.id, token: s!.token });
    }
    return { out, props, agent, org };
  });

  // 2) envoi hors transaction (réseau)
  const results: ShareResult[] = [];
  const accent = (prepared.org?.colors as { primary?: string } | undefined)?.primary;
  for (const item of prepared.out) {
    if (item.result) { results.push(item.result); continue; }
    const c = item.contact, l = loc(c.preferred_locale), orgName = pick(l, prepared.org ?? {}, "name") || "Agence";
    const selectionUrl = `${siteUrl}/${l}/p/${item.token}`;
    const fmt = new Intl.NumberFormat(l === "he" ? "he-IL" : l === "en" ? "en-IL" : "fr-FR", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });
    const properties = prepared.props.map((p) => ({
      title: (p.titles as Record<string, string>)[l] || (p.titles as Record<string, string>).fr || p.reference,
      place: [p.address_visibility === "hidden" ? null : p.street, pick(l, p, "city")].filter(Boolean).join(", "),
      price: p.price ? fmt.format(Number(p.price)) : "",
      specs: [p.rooms ? `${p.rooms} ${l === "he" ? "חדרים" : l === "en" ? "rooms" : "pièces"}` : null, p.area_built ? `${Math.round(Number(p.area_built))} ${l === "he" ? "מ״ר" : "m²"}` : null].filter(Boolean).join(" · "),
      url: selectionUrl,
    }));
    let status: ShareResult["status"] = "link", waUrl: string | undefined, providerId: string | undefined, error: string | undefined;
    if (input.channel === "email") {
      const mail = renderShareEmail({ locale: l, orgName, contactName: nameOf(c, l), agentName: prepared.agent?.full_name ?? "", agentPhone: prepared.agent?.phone, message: input.message, properties, selectionUrl, unsubscribeUrl: `${siteUrl}/${l}/unsubscribe/${item.token}`, accent });
      const to = (c.emails as { email: string }[])[0]!.email;
      const r = await sendEmail({ to, ...mail });
      status = r.status; providerId = r.providerId; error = r.error;
    } else {
      const digits = ((c.phones as { e164: string }[])[0]!.e164).replace(/\D/g, "");
      const hello = l === "he" ? `שלום ${nameOf(c, l)}, ` : l === "en" ? `Hello ${nameOf(c, l)}, ` : `Bonjour ${nameOf(c, l)}, `;
      const text = `${hello}${input.message?.trim() || (l === "he" ? "הנה בחירת נכסים עבורך:" : l === "en" ? "here is a selection for you:" : "voici une sélection pour vous :")} ${selectionUrl}`;
      waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
      status = "link";
    }
    await db(ctx, async (tx) => {
      await tx`update public.shares set status = ${status === "link" ? "sent" : status}, provider_id = ${providerId ?? null}, error = ${error ?? null}, sent_at = ${status === "failed" ? null : tx`now()`} where id = ${item.shareId!}`;
      await tx`insert into public.activities (organization_id, kind, contact_id, summary, payload) values (${ctx.orgId}, 'share', ${c.id}, ${input.channel}, ${tx.json({ share_id: item.shareId, properties: prepared.props.length, status })})`;
    });
    results.push({ contactId: c.id, status, waUrl, error });
  }
  return results;
}

/* ───────── Pages publiques (sans session) : accès par jeton, champs limités ───────── */
export async function getPublicShare(token: string) {
  if (!/^[0-9a-f]{36}$/.test(token)) return null;
  const [s] = await sql`select s.id, s.locale, s.sender_id, s.organization_id, s.property_ids, s.contact_id, o.name_fr, o.name_he, o.name_en, b.colors, ag.full_name as agent_name, ag.phone as agent_phone
    from public.shares s join public.organizations o on o.id = s.organization_id and o.status = 'active' left join public.brand_kits b on b.organization_id = o.id join public.profiles ag on ag.id = s.sender_id where s.token = ${token}`;
  if (!s) return null;
  await sql`update public.shares set opened_at = coalesce(opened_at, now()) where id = ${s.id}`;
  const props = await sql`
    select p.id, p.reference, p.price, p.currency, p.rooms, p.area_built, p.floor, p.floors_total, p.mamad, p.parking_count, p.elevator, p.sukkah_balcony, p.storage, p.ac,
      p.arnona_monthly, p.vaad_bayit_monthly,
      case p.address_visibility when 'hidden' then null when 'neighborhood' then null else p.street end as street,
      case p.address_visibility when 'exact' then p.house_number else null end as house_number,
      g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en,
      coalesce((select jsonb_object_agg(t.locale, jsonb_build_object('title', t.title, 'description', t.description)) from public.property_translations t where t.property_id = p.id), '{}') as tr,
      coalesce((select jsonb_agg(pm.id order by pm.is_cover desc, pm.position) from public.property_media pm where pm.property_id = p.id and pm.kind = 'photo' and pm.visibility = 'public'), '[]') as photo_ids
    from public.properties p left join public.geo_places g on g.id = p.city_id
    where p.id = any(${s.property_ids}::uuid[]) and p.organization_id = ${s.organization_id} and p.deleted_at is null and p.status in ('active','under_offer')`;
  return { share: s as Record<string, any>, props: props as unknown as Record<string, any>[], agentPhone: s.agent_phone ? formatPhone(s.agent_phone) : null };
}

/** Désinscription publique : retire le consentement marketing du contact lié à l'envoi. */
export async function unsubscribeByToken(token: string) {
  if (!/^[0-9a-f]{36}$/.test(token)) return false;
  const rows = await sql`update public.contacts c set marketing_consent = coalesce(c.marketing_consent, '{}'::jsonb) || jsonb_build_object('granted', false, 'withdrawn_at', now())
    from public.shares s where s.token = ${token} and s.contact_id = c.id returning c.id, c.organization_id`;
  if (rows[0]) await sql`insert into public.activities (organization_id, kind, contact_id, summary) values (${rows[0].organization_id}, 'system', ${rows[0].id}, 'unsubscribed')`;
  return rows.length > 0;
}
