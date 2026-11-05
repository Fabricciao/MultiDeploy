import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { sql } from "@/lib/db";
import { verifyToken } from "@/lib/crypto";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";
/** URL publique à durée limitée (jeton signé) : Meta doit pouvoir télécharger l'image. Instagram exige du JPEG. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tok = verifyToken<{ p: string }>(req.nextUrl.searchParams.get("t") ?? "");
  if (!tok || tok.p !== id) return new NextResponse("Not found", { status: 404 });
  const [row] = await sql`select output_path from public.poster_generations where id = ${id}`;
  if (!row) return new NextResponse("Not found", { status: 404 });
  const f = await storage.get(row.output_path);
  if (!f) return new NextResponse("Not found", { status: 404 });
  const jpg = await sharp(f.data).flatten({ background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer();
  return new NextResponse(new Uint8Array(jpg), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=600", "X-Content-Type-Options": "nosniff" } });
}
