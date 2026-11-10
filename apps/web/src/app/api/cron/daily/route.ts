import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";
import { deliverDue } from "@/lib/webhooks";

export const dynamic = "force-dynamic";
const authorized = (req: NextRequest) => { const s = process.env.CRON_SECRET, h = req.headers.get("authorization") ?? ""; if (!s) return false; const a = Buffer.from(h), b = Buffer.from(`Bearer ${s}`); return a.length === b.length && timingSafeEqual(a, b); };

/** Tâches quotidiennes (Vercel Cron / planificateur externe) : crédits mensuels, purge de la corbeille (30 j), livraisons webhook, automatisations (tâches). */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [g] = await sql`select public.grant_monthly_credits() as n`;
  const [p] = await sql`select public.purge_trash() as n`;
  const hooks = await deliverDue(100);
  const [a] = await sql`select public.run_automations() as n`.catch(() => [{ n: null }]);
  return NextResponse.json({ monthly_grants: g!.n, purged: p!.n, webhooks: hooks, automation_tasks: a?.n ?? null });
}
