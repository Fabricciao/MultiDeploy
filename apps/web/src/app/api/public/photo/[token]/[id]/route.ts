import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { storage } from "@/lib/storage";

/** Photo d'une sélection envoyée : accessible par jeton, uniquement si le bien fait partie de l'envoi. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  if (!/^(?:[0-9a-f]{36}|[0-9a-f]{24})$/.test(token) || !/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const thumb = req.nextUrl.searchParams.get("w") === "thumb";
  const [m] = token.length === 24 ? await sql`select pm.storage_path, pm.thumb_path from public.property_media pm join public.properties p on p.id = pm.property_id and p.public_token = ${token} and p.deleted_at is null and p.status = 'active' where pm.id = ${id} and pm.visibility = 'public' and pm.kind = 'photo'` : await sql`select pm.storage_path, pm.thumb_path from public.shares s join public.property_media pm on pm.property_id = any(s.property_ids) and pm.organization_id = s.organization_id
    join public.properties p on p.id = pm.property_id and p.deleted_at is null and p.status in ('active','under_offer')
    where s.token = ${token} and pm.id = ${id} and pm.visibility = 'public' and pm.kind = 'photo'`;
  if (!m) return new NextResponse("Not found", { status: 404 });
  const f = await storage.get(thumb && m.thumb_path ? m.thumb_path : m.storage_path);
  if (!f) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(f.data), { headers: { "Content-Type": f.mime, "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" } });
}
