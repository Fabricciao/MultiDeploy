import { NextResponse } from "next/server";
import { getCtx } from "@/lib/session";
import { listVisits } from "@/lib/data/visits";
import { buildIcs } from "@/lib/calendar/ics";

export const dynamic = "force-dynamic";
export async function GET() {
  const ctx = await getCtx();
  const from = new Date(Date.now() - 7 * 86_400_000), to = new Date(Date.now() + 90 * 86_400_000);
  const mine = (await listVisits(ctx, from, to)).filter((v) => v.agent_id === ctx.userId && v.status === "planned");
  const ics = buildIcs(mine.map((v) => ({ uid: v.id, start: v.starts_at, end: v.ends_at ?? new Date(v.starts_at.getTime() + 30 * 60_000), summary: `Visite — ${v.title ?? v.street ?? v.reference}`, location: [v.street, v.city_fr].filter(Boolean).join(", ") })), `MultiDeploy — ${ctx.fullName}`);
  return new NextResponse(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="agenda.ics"', "Cache-Control": "no-store" } });
}
