import { NextResponse } from "next/server";
import { getCtx } from "@/lib/session";
import { exportOrganization } from "@/lib/data/export";
import { db } from "@/lib/session";

export const dynamic = "force-dynamic";
export async function GET() {
  const ctx = await getCtx();
  if (!ctx.caps.has("exports.run")) return new NextResponse("Forbidden", { status: 403 });
  const zip = await exportOrganization(ctx);
  await db(ctx, (tx) => tx`insert into public.activities (organization_id, kind, summary) values (${ctx.orgId}, 'system', 'export_organization')`).catch(() => {});
  return new NextResponse(new Uint8Array(zip), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${ctx.orgSlug}-export-${new Date().toISOString().slice(0, 10)}.zip"`, "Cache-Control": "no-store" } });
}
