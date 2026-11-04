import "server-only";
import { z } from "zod";
import { sql } from "../db";
import { normalizePhone } from "../phone";

export const leadSchema = z.object({
  first_name: z.string().trim().max(80).optional(), last_name: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(40).optional(), email: z.string().trim().email().max(160).optional(),
  message: z.string().trim().max(2000).optional(), locale: z.enum(["fr", "he", "en"]).optional(),
  property_id: z.string().uuid().optional(), consent: z.boolean().optional(), source: z.string().max(60).optional(),
}).refine((v) => v.phone || v.email, { message: "phone_or_email_required" }).refine((v) => v.first_name || v.last_name || v.phone || v.email, { message: "empty" });
export type LeadInput = z.infer<typeof leadSchema>;

/** Crée un lead (ou rattache le message à la fiche existante : dédoublonnage par téléphone/e-mail). Requêtes bornées par organization_id. */
export async function ingestLead(orgId: string, i: LeadInput): Promise<{ id: string; duplicate: boolean } | { error: "invalid_phone" }> {
  const phone = i.phone ? normalizePhone(i.phone) : null;
  if (i.phone && !phone) return { error: "invalid_phone" };
  const email = i.email?.toLowerCase() ?? null;
  const [dup] = await sql`select id from public.contacts where organization_id = ${orgId} and deleted_at is null and ((${phone}::text is not null and phone_primary_e164 = ${phone}) or (${email}::text is not null and emails @> ${sql.json([{ email }])}::jsonb)) limit 1`;
  let id: string, duplicate = !!dup;
  if (dup) id = dup.id;
  else {
    const [src] = await sql`select id from public.lead_sources where organization_id = ${orgId} and name->>'fr' = 'Site web' limit 1`;
    const consent = i.consent === true ? { granted: true, at: new Date().toISOString(), channel: "website_form" } : { granted: false, channel: "website_form" };
    const [c] = await sql`insert into public.contacts (organization_id, kinds, first_name, last_name, phones, emails, preferred_locale, marketing_consent, source_id, owner_id)
      values (${orgId}, '{buyer}', ${i.first_name ?? null}, ${i.last_name ?? null}, ${sql.json(phone ? [{ e164: phone, is_whatsapp: true }] : [])}, ${sql.json(email ? [{ email }] : [])}, ${i.locale ?? "fr"}, ${sql.json(consent)}, ${src?.id ?? null}, null) returning id`;
    id = c!.id;
  }
  await sql`insert into public.activities (organization_id, kind, contact_id, property_id, summary, payload)
    values (${orgId}, 'note', ${id}, ${i.property_id && (await sql`select 1 from public.properties where id = ${i.property_id} and organization_id = ${orgId}`).length ? i.property_id : null}, ${(i.message ? `Formulaire du site : ${i.message}` : "Formulaire du site")}, ${sql.json({ source: i.source ?? "api", duplicate })})`;
  return { id, duplicate };
}
