import { NextResponse, type NextRequest } from "next/server";
import { getCtx, db } from "@/lib/session";
import { buildIcs } from "@/lib/calendar/ics";

export const dynamic = "force-dynamic";
export async function GET(_r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const ctx = await getCtx();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const [v] = await db(ctx, (tx) => tx`select v.id, v.starts_at, v.ends_at, p.reference, p.street, g.name_fr as city, (select t.title from public.property_translations t where t.property_id = p.id order by (t.locale = ${ctx.locale}) desc limit 1) as title from public.visits v join public.properties p on p.id = v.property_id left join public.geo_places g on g.id = p.city_id where v.id = ${id}`);
  if (!v) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(buildIcs([{ uid: v.id, start: v.starts_at, end: v.ends_at ?? new Date(v.starts_at.getTime() + 30 * 60_000), summary: `Visite — ${v.title ?? v.street ?? v.reference}`, location: [v.street, v.city].filter(Boolean).join(", ") }]), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="visite-${v.reference}.ics"`, "Cache-Control": "no-store" } });
}
