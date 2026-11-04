import type { ExtractKind } from "../ai/providers";
import { findCities, type CityRef, type ExtractResult, type FieldMeta } from "./extract";
import { normalizePhone } from "../phone";

/** Normalise la sortie d'un LLM (non fiable) vers le même format que l'extracteur à règles : valeurs validées, villes résolues, rien d'inventé. */
export function normalizeLlm(kind: ExtractKind, raw: Record<string, any>, cities: CityRef[]): ExtractResult {
  const fields: Record<string, any> = {}, meta: Record<string, FieldMeta> = {};
  const ev = (raw.evidence ?? {}) as Record<string, string>;
  const set = (k: string, v: unknown, fk = k) => { if (v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length)) return; fields[k] = v; meta[k] = { confidence: ev[fk] ? 0.8 : 0.5, evidence: ev[fk] }; };
  const num = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null);
  const oneOf = (v: unknown, allowed: string[]) => (typeof v === "string" && allowed.includes(v) ? v : null);
  const str = (v: unknown, n = 80) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);
  const feats = (Array.isArray(raw.must_have) ? raw.must_have : Array.isArray(raw.features) ? raw.features : []).filter((x: unknown) => typeof x === "string" && ["mamad", "parking", "elevator", "sukkah_balcony", "storage", "ac"].includes(x));
  if (kind === "contact") {
    for (const k of ["first_name", "last_name", "first_name_he", "last_name_he"]) set(k, str(raw[k]));
    const p = typeof raw.phone === "string" ? normalizePhone(raw.phone) : null; set("phone", p);
    const e = typeof raw.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.email) ? raw.email : null; set("email", e);
    set("preferred_locale", oneOf(raw.preferred_locale, ["fr", "he", "en"])); set("aliyah_status", oneOf(raw.aliyah_status, ["pre_aliyah", "recent", "resident", "none"]));
    fields.kinds = (Array.isArray(raw.kinds) ? raw.kinds : []).filter((x: unknown) => typeof x === "string" && ["buyer", "seller", "landlord", "tenant", "investor", "other"].includes(x)); if (!fields.kinds.length) fields.kinds = ["buyer"];
    set("transaction", oneOf(raw.transaction, ["sale", "rent"]));
    const found = findCities((Array.isArray(raw.cities) ? raw.cities : []).join(" , "), cities); fields.city_ids = found.map((c) => c.id); if (found.length) meta.city_ids = { confidence: ev.cities ? 0.8 : 0.5, evidence: ev.cities };
    set("budget_max", num(raw.budget_max, 1000, 500_000_000)); set("rooms_min", num(raw.rooms_min, 0.5, 30)); set("rooms_max", num(raw.rooms_max, 0.5, 30)); set("must_have", feats);
    set("notes", str(raw.notes, 500));
    const missing: string[] = []; if (!fields.first_name && !fields.last_name && !fields.first_name_he && !fields.last_name_he) missing.push("first_name"); if (!fields.phone) missing.push("phone");
    return { fields, meta, missing };
  }
  set("transaction", oneOf(raw.transaction, ["sale", "rent"])); set("property_type", oneOf(raw.property_type, ["apartment", "garden_apt", "duplex", "penthouse", "house", "cottage", "land", "office", "shop"]));
  const c = typeof raw.city === "string" ? findCities(raw.city, cities)[0] : null; if (c) { fields.city_id = c.id; meta.city_id = { confidence: ev.city ? 0.8 : 0.5, evidence: ev.city }; }
  set("street", str(raw.street)); set("house_number", str(raw.house_number, 10)); set("price", num(raw.price, 500, 500_000_000)); set("rooms", num(raw.rooms, 0.5, 30)); set("area_built", num(raw.area_built, 5, 20000));
  set("floor", num(raw.floor, -5, 120)); set("floors_total", num(raw.floors_total, 1, 120)); set("notes", str(raw.notes, 500));
  for (const k of feats) { if (k === "parking") fields.parking_count = 1; else fields[k] = true; meta[k] = { confidence: ev[k] ? 0.8 : 0.5, evidence: ev[k] }; }
  const missing: string[] = []; if (!fields.price) missing.push("price"); if (!fields.city_id) missing.push("city_id");
  return { fields, meta, missing };
}

