import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
/** Sonde de santé pour l'hébergeur / la supervision. Ne renvoie aucune information sensible. */
export async function GET() {
  const t0 = Date.now();
  let db = false;
  try { await sql`select 1`; db = true; } catch { /* base indisponible */ }
  return NextResponse.json({ ok: db, db, ms: Date.now() - t0 }, { status: db ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
