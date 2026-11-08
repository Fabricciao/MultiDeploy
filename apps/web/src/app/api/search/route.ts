import { NextResponse, type NextRequest } from "next/server";
import { getCtx, db, seesAllProperties } from "@/lib/session";
import { listCitiesWithAliases, cityName } from "@/lib/data/geo";
import { nlToPropertiesUrl } from "@/lib/search/nl";
import { contactName } from "@/lib/data/contacts";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
/** Recherche globale (⌘K) sous l'identité de l'utilisateur : la RLS limite les résultats à ce qu'il a le droit de voir. */
export async function GET(req: NextRequest) {
  const locale = ["fr", "he", "en"].includes(req.nextUrl.searchParams.get("l") ?? "") ? req.nextUrl.searchParams.get("l")! : "fr";
  const ctx = await getCtx(locale);
  if (!rateLimit(`search:${ctx.userId}`, 120, 60_000).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ properties: [], contacts: [], nl: null });
  const [props, contacts, cities] = await Promise.all([
    db(ctx, (tx) => tx`select p.id, p.reference, p.price, p.currency, p.rooms, p.street, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en,
      (select t.title from public.property_translations t where t.property_id = p.id order by (t.locale = ${locale}) desc limit 1) as title
      from public.properties p left join public.geo_places g on g.id = p.city_id where p.deleted_at is null and (${seesAllProperties(ctx)} or p.agent_id = ${ctx.userId}) and p.search_text like '%' || app.normalize_search(${q}) || '%' order by p.created_at desc limit 6`),
    db(ctx, (tx) => tx`select c.id, c.first_name, c.last_name, c.first_name_he, c.last_name_he, c.phones from public.contacts c where c.deleted_at is null and c.search_text like '%' || app.normalize_search(${q}) || '%' order by c.created_at desc limit 6`),
    listCitiesWithAliases(ctx),
  ]);
  const nl = nlToPropertiesUrl(q, cities);
  return NextResponse.json({
    properties: props.map((p) => ({ id: p.id, label: p.title ?? `${p.street ?? ""}`.trim() ?? p.reference, sub: [p.reference, cityName({ name_fr: p.city_fr, name_he: p.city_he, name_en: p.city_en }, locale)].filter(Boolean).join(" · ") })),
    contacts: contacts.map((c) => ({ id: c.id, label: contactName(c, locale), sub: (c.phones as { e164?: string }[])[0]?.e164 ?? "" })),
    nl,
  });
}
