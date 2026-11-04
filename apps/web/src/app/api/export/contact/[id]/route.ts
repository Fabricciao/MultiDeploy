import { NextResponse, type NextRequest } from "next/server";
import { getCtx } from "@/lib/session";
import { exportContact } from "@/lib/data/export";

export const dynamic = "force-dynamic";
export async function GET(_r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCtx();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !ctx.caps.has("contacts.write")) return new NextResponse("Not found", { status: 404 });
  const data = await exportContact(ctx, id);
  if (!data) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(JSON.stringify(data, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="contact-${id}.json"`, "Cache-Control": "no-store" } });
}
