import { normalizePhone } from "../phone";
import type { PropertyInput } from "./properties";
import type { ContactInput } from "./contacts";

export type FormErrors = Record<string, string>;
type Parsed<T> = { ok: true; data: T } | { ok: false; errors: FormErrors };

const str = (fd: FormData, k: string) => { const v = fd.get(k); return typeof v === "string" && v.trim() ? v.trim() : null; };
const numOrNull = (fd: FormData, k: string, errors: FormErrors, opts: { min?: number; max?: number; int?: boolean } = {}) => {
  const s = str(fd, k);
  if (s === null) return null;
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n) || (opts.min !== undefined && n < opts.min) || (opts.max !== undefined && n > opts.max) || (opts.int && !Number.isInteger(n))) { errors[k] = "invalid_number"; return null; }
  return n;
};
const bool = (fd: FormData, k: string) => fd.get(k) === "on";
const oneOf = <T extends string>(v: string | null, allowed: readonly T[], fallback: T): T => (v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback);
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PROPERTY_TYPES = ["apartment", "garden_apt", "duplex", "penthouse", "house", "cottage", "land", "office", "shop"] as const;

export function parsePropertyForm(fd: FormData): Parsed<PropertyInput> {
  const errors: FormErrors = {};
  const transaction = oneOf(str(fd, "transaction"), ["sale", "rent"] as const, "sale");
  const property_type = oneOf(str(fd, "property_type"), PROPERTY_TYPES, "apartment");
  const city = str(fd, "city_id");
  const price = numOrNull(fd, "price", errors, { min: 0, max: 500_000_000 });
  const rooms = numOrNull(fd, "rooms", errors, { min: 0.5, max: 30 });
  if (rooms !== null && (rooms * 2) % 1 !== 0) errors.rooms = "half_rooms";
  const data: PropertyInput = {
    transaction, property_type, status: oneOf(str(fd, "status"), ["draft", "active", "under_offer", "sold", "rented", "withdrawn"] as const, "draft"),
    city_id: city && uuidRe.test(city) ? city : null, street: str(fd, "street"), house_number: str(fd, "house_number"),
    address_visibility: oneOf(str(fd, "address_visibility"), ["hidden", "neighborhood", "street", "exact"] as const, "street"),
    price, currency: oneOf(str(fd, "currency"), ["ILS", "USD", "EUR"] as const, "ILS"), rooms,
    area_built: numOrNull(fd, "area_built", errors, { min: 5, max: 20000 }), floor: numOrNull(fd, "floor", errors, { min: -5, max: 120, int: true }), floors_total: numOrNull(fd, "floors_total", errors, { min: 1, max: 120, int: true }),
    mamad: bool(fd, "mamad"), parking_count: numOrNull(fd, "parking_count", errors, { min: 0, max: 20, int: true }) ?? 0, elevator: bool(fd, "elevator"), sukkah_balcony: bool(fd, "sukkah_balcony"), storage: bool(fd, "storage"), ac: bool(fd, "ac"),
    arnona_monthly: numOrNull(fd, "arnona_monthly", errors, { min: 0 }), vaad_bayit_monthly: numOrNull(fd, "vaad_bayit_monthly", errors, { min: 0 }),
    registration_type: str(fd, "registration_type") && ["tabu", "minhal", "company", "other"].includes(str(fd, "registration_type")!) ? str(fd, "registration_type") : null,
    mandate_type: oneOf(str(fd, "mandate_type"), ["exclusive", "non_exclusive"] as const, "non_exclusive"), mandate_end: str(fd, "mandate_end"),
    mandate_origin: oneOf(str(fd, "mandate_origin"), ["own", "partner"] as const, "own"), mandate_partner: str(fd, "mandate_partner")?.slice(0, 120) ?? null, mandate_co_broke: bool(fd, "mandate_co_broke"),
    commission_pct: numOrNull(fd, "commission_pct", errors, { min: 0, max: 20 }),
    internal_notes: str(fd, "internal_notes"),
    titles: { fr: str(fd, "title_fr") ?? "", he: str(fd, "title_he") ?? "", en: str(fd, "title_en") ?? "" },
    descriptions: { fr: str(fd, "desc_fr") ?? "", he: str(fd, "desc_he") ?? "", en: str(fd, "desc_en") ?? "" },
    agent_id: null,
  };
  if (data.mandate_end && Number.isNaN(Date.parse(data.mandate_end))) errors.mandate_end = "invalid_date";
  if (data.status === "active" && (data.price === null || !data.city_id)) errors.status = "active_needs_price_city";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}

export function parseContactForm(fd: FormData): Parsed<ContactInput> {
  const errors: FormErrors = {};
  const first_name = str(fd, "first_name"), last_name = str(fd, "last_name"), first_name_he = str(fd, "first_name_he"), last_name_he = str(fd, "last_name_he");
  if (!first_name && !last_name && !first_name_he && !last_name_he) errors.first_name = "name_required";
  const rawPhone = str(fd, "phone");
  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  if (rawPhone && !phone) errors.phone = "invalid_phone";
  const email = str(fd, "email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "invalid_email";
  const kinds = fd.getAll("kinds").filter((k): k is string => typeof k === "string" && ["buyer", "seller", "landlord", "tenant", "investor", "lawyer", "partner", "other"].includes(k));
  const wantsProfile = bool(fd, "with_profile");
  const cities = fd.getAll("city_ids").filter((c): c is string => typeof c === "string" && uuidRe.test(c));
  const budget_max = numOrNull(fd, "budget_max", errors, { min: 0, max: 500_000_000 });
  const rooms_min = numOrNull(fd, "rooms_min", errors, { min: 0.5, max: 30 }), rooms_max = numOrNull(fd, "rooms_max", errors, { min: 0.5, max: 30 });
  if (rooms_min !== null && rooms_max !== null && rooms_min > rooms_max) errors.rooms_max = "rooms_range";
  const must = fd.getAll("must_have").filter((k): k is string => typeof k === "string" && ["mamad", "parking", "elevator", "sukkah_balcony", "storage", "ac"].includes(k));
  const src = str(fd, "source_id");
  const data: ContactInput = {
    first_name, last_name, first_name_he, last_name_he, kinds: kinds.length ? kinds : ["buyer"], phone, email,
    preferred_locale: oneOf(str(fd, "preferred_locale"), ["fr", "he", "en"] as const, "fr"),
    aliyah_status: str(fd, "aliyah_status") && ["pre_aliyah", "recent", "resident", "none"].includes(str(fd, "aliyah_status")!) ? str(fd, "aliyah_status") : null,
    budget_max, notes: str(fd, "notes"), commission_pct: numOrNull(fd, "commission_pct", errors, { min: 0, max: 20 }), co_broke: bool(fd, "co_broke"), marketing_opt_in: bool(fd, "marketing_opt_in"), source_id: src && uuidRe.test(src) ? src : null,
    profile: wantsProfile ? { transaction: oneOf(str(fd, "transaction"), ["sale", "rent"] as const, "sale"), city_ids: cities, price_max: budget_max, rooms_min, rooms_max, must_have: must, nice_to_have: [] } : null,
  };
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}
