import { extractContact, type CityRef } from "../intake/extract";
import { toQuery } from "../data/filters";

/** Recherche en langage naturel → URL de filtres de la liste des biens : « 4 pièces Raanana moins de 3,5 M mamad ». Déterministe. */
export function nlToPropertiesUrl(q: string, cities: CityRef[]): { href: string; summary: string[] } | null {
  const r = extractContact(q.replace(/(moins de|sous|<|less than|מתחת ל|under)\s*/gi, "budget "), cities);
  const f = r.fields;
  const params = { tx: /\b(louer|location|rent|להשכרה|לשכור)\b/i.test(q) ? "rent" : /\b(acheter|vente|sale|buy|למכירה)\b/i.test(q) ? "sale" : undefined, city: f.city_ids as string[], rmin: f.rooms_min, rmax: f.rooms_max, pmax: f.budget_max, has: f.must_have as string[] };
  const summary = [params.tx && "tx", params.city?.length && "city", params.rmin !== undefined && "rooms", params.pmax !== undefined && "price", params.has?.length && "features"].filter(Boolean) as string[];
  if (!summary.length) return null;
  return { href: `/properties${toQuery(params)}`, summary };
}
