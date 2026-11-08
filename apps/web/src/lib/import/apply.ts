import "server-only";
import type { Ctx } from "../session";
import { normalizePhone } from "../phone";
import { csvNumber, csvYes, type MappedRow } from "./csv";
import { createContact, DuplicatePhoneError, type ContactInput } from "../data/contacts";
import { createProperty, type PropertyInput } from "../data/properties";
import { findCities, type CityRef } from "../intake/extract";

export type ImportReport = { created: number; duplicates: number; errors: { line: number; code: string }[] };
const LOC: Record<string, string> = { fr: "fr", français: "fr", francais: "fr", french: "fr", צרפתית: "fr", he: "he", hébreu: "he", hebreu: "he", hebrew: "he", עברית: "he", en: "en", anglais: "en", english: "en", אנגלית: "en" };
const KIND: Record<string, string> = { acheteur: "buyer", buyer: "buyer", קונה: "buyer", vendeur: "seller", seller: "seller", מוכר: "seller", locataire: "tenant", tenant: "tenant", שוכר: "tenant", bailleur: "landlord", landlord: "landlord", משכיר: "landlord", investisseur: "investor", investor: "investor", משקיע: "investor" };
const TYPE: [RegExp, string][] = [[/penthouse|פנטהאוז/i, "penthouse"], [/duplex|דופלקס/i, "duplex"], [/jardin|garden|גינה/i, "garden_apt"], [/maison|villa|house|בית פרטי|קוטג/i, "house"], [/terrain|land|קרקע/i, "land"], [/bureau|office|משרד/i, "office"], [/commerce|shop|חנות/i, "shop"], [/appartement|apartment|דירה|flat/i, "apartment"]];

export async function importContacts(ctx: Ctx, rows: MappedRow<string>[]): Promise<ImportReport> {
  const rep: ImportReport = { created: 0, duplicates: 0, errors: [] };
  for (const { values: v, line } of rows.slice(0, 1000)) {
    if (!v.first_name && !v.last_name && !v.first_name_he && !v.last_name_he && !v.phone && !v.email) { rep.errors.push({ line, code: "empty" }); continue; }
    const phone = v.phone ? normalizePhone(v.phone) : null; if (v.phone && !phone) { rep.errors.push({ line, code: "invalid_phone" }); continue; }
    if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) { rep.errors.push({ line, code: "invalid_email" }); continue; }
    const input: ContactInput = { first_name: v.first_name ?? null, last_name: v.last_name ?? null, first_name_he: v.first_name_he ?? null, last_name_he: v.last_name_he ?? null, kinds: [KIND[(v.kind ?? "").toLowerCase()] ?? "buyer"], phone, email: v.email ?? null,
      preferred_locale: LOC[(v.preferred_locale ?? "").toLowerCase()] ?? "fr", aliyah_status: null, budget_max: v.budget_max ? csvNumber(v.budget_max) : null, notes: v.notes?.slice(0, 2000) ?? null, marketing_opt_in: false, source_id: null, profile: null };
    try { await createContact(ctx, input); rep.created++; } catch (e) { if (e instanceof DuplicatePhoneError) rep.duplicates++; else rep.errors.push({ line, code: "failed" }); }
  }
  return rep;
}

export async function importProperties(ctx: Ctx, rows: MappedRow<string>[], cities: CityRef[], locale: string): Promise<ImportReport> {
  const rep: ImportReport = { created: 0, duplicates: 0, errors: [] };
  for (const { values: v, line } of rows.slice(0, 1000)) {
    const price = v.price ? csvNumber(v.price) : null; if (price === null || price <= 0) { rep.errors.push({ line, code: "price_required" }); continue; }
    const city = v.city ? findCities(v.city, cities)[0] : null; if (!city) { rep.errors.push({ line, code: "city_unknown" }); continue; }
    const rooms = v.rooms ? csvNumber(v.rooms) : null; if (rooms !== null && (rooms < 0.5 || rooms > 30 || (rooms * 2) % 1 !== 0)) { rep.errors.push({ line, code: "invalid_rooms" }); continue; }
    const rent = /louer|location|rent|השכר|שכיר/i.test(v.transaction ?? "");
    const type = TYPE.find(([re]) => re.test(v.property_type ?? ""))?.[1] ?? "apartment";
    const input: PropertyInput = { transaction: rent ? "rent" : "sale", property_type: type, status: "draft", city_id: city.id, street: v.street ?? null, house_number: v.house_number ?? null, address_visibility: "street", price, currency: "ILS", rooms,
      area_built: v.area_built ? csvNumber(v.area_built) : null, floor: v.floor ? csvNumber(v.floor) : null, floors_total: v.floors_total ? csvNumber(v.floors_total) : null, mamad: v.mamad ? csvYes(v.mamad) : false, parking_count: v.parking_count ? Math.max(0, Math.min(20, csvNumber(v.parking_count) ?? 0)) : 0, elevator: v.elevator ? csvYes(v.elevator) : false, sukkah_balcony: false, storage: false, ac: false,
      arnona_monthly: null, vaad_bayit_monthly: null, registration_type: null, mandate_type: "non_exclusive", mandate_end: null, mandate_origin: "own", mandate_partner: null, mandate_co_broke: false, internal_notes: null, titles: { [locale]: v.title ?? "" } as Record<string, string>, descriptions: { [locale]: v.description ?? "" } as Record<string, string> };
    try { await createProperty(ctx, input, locale); rep.created++; } catch { rep.errors.push({ line, code: "failed" }); }
  }
  return rep;
}
