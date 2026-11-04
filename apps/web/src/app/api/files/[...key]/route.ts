import { NextResponse, type NextRequest } from "next/server";
import { getCtx } from "@/lib/session";
import { isValidKey, orgOfKey, storage } from "@/lib/storage";

/** Fichiers privés de l'agence : session requise ET clé dans le préfixe de l'agence active. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!isValidKey(key)) return new NextResponse("Not found", { status: 404 });
  const ctx = await getCtx();
  if (orgOfKey(key) !== ctx.orgId) return new NextResponse("Not found", { status: 404 });
  const f = await storage.get(key);
  if (!f) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(f.data), { headers: { "Content-Type": f.mime, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" } });
}
