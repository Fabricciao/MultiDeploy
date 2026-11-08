import { z } from "zod";

export type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const list = (v: string | string[] | undefined) => (v === undefined ? [] : (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean));
const num = (v: string | string[] | undefined) => {
  const s = first(v);
  if (s === undefined || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};
const uuid = z.string().uuid();

export const PAGE_SIZE = 40;
export const MUST_HAVE = ["mamad", "parking", "elevator", "sukkah_balcony", "storage", "ac"] as const;
export const MANDATE_FILTERS = ["exclusive", "expiring", "own", "partner", "co_broke"] as const;
export type Mandate = (typeof MANDATE_FILTERS)[number];
export const SORTS = ["recent", "price_asc", "price_desc", "mandate"] as const;
export const STATUSES = ["draft", "active", "under_offer", "sold", "rented", "withdrawn", "expired"] as const;

export type PropertyFilters = {
  q?: string; transaction?: "sale" | "rent"; status: string[]; cityIds: string[];
  roomsMin?: number; roomsMax?: number; priceMin?: number; priceMax?: number;
  has: string[]; agent?: string; mandate?: Mandate; sort: (typeof SORTS)[number]; page: number;
};

export function parsePropertyFilters(sp: SP): PropertyFilters {
  const sort = first(sp.sort) as (typeof SORTS)[number];
  const tr = first(sp.tx);
  return {
    q: first(sp.q)?.trim().slice(0, 80) || undefined,
    transaction: tr === "sale" || tr === "rent" ? tr : undefined,
    status: list(sp.status).filter((s) => (STATUSES as readonly string[]).includes(s)),
    cityIds: list(sp.city).filter((s) => uuid.safeParse(s).success),
    roomsMin: num(sp.rmin), roomsMax: num(sp.rmax), priceMin: num(sp.pmin), priceMax: num(sp.pmax),
    has: list(sp.has).filter((s) => (MUST_HAVE as readonly string[]).includes(s)),
    agent: uuid.safeParse(first(sp.agent)).success ? first(sp.agent) : undefined,
    mandate: (MANDATE_FILTERS as readonly string[]).includes(first(sp.mandate) ?? "") ? (first(sp.mandate) as Mandate) : undefined,
    sort: (SORTS as readonly string[]).includes(sort ?? "") ? sort : "recent",
    page: Math.max(1, Math.floor(num(sp.page) ?? 1)),
  };
}

export type ContactFilters = { q?: string; kind?: string; owner?: string; page: number };
export const KINDS = ["buyer", "seller", "landlord", "tenant", "investor", "lawyer", "partner", "other"] as const;
export function parseContactFilters(sp: SP): ContactFilters {
  const kind = first(sp.kind);
  return {
    q: first(sp.q)?.trim().slice(0, 80) || undefined,
    kind: (KINDS as readonly string[]).includes(kind ?? "") ? kind : undefined,
    owner: uuid.safeParse(first(sp.owner)).success ? first(sp.owner) : undefined,
    page: Math.max(1, Math.floor(num(sp.page) ?? 1)),
  };
}

/** Reconstruit une query string à partir des filtres (liens de pagination, tri…). */
export function toQuery(params: Record<string, string | number | string[] | undefined | null>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) continue;
    u.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}
