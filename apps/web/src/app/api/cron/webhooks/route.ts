import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { deliverDue } from "@/lib/webhooks";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const s = process.env.CRON_SECRET, h = req.headers.get("authorization") ?? "";
  const a = Buffer.from(h), b = Buffer.from(`Bearer ${s ?? ""}`);
  if (!s || a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await deliverDue(100));
}
