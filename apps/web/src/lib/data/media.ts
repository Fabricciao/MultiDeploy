import "server-only";
import { randomUUID } from "node:crypto";
import { db, type Ctx } from "../session";
import { storage } from "../storage";
import { ImageError, processImage } from "../images";

export const MAX_PHOTOS = 25;
export type MediaRow = { id: string; storage_path: string; thumb_path: string | null; width: number | null; height: number | null; is_cover: boolean; position: number };

export async function listMedia(ctx: Ctx, propertyId: string) {
  return (await db(ctx, (tx) => tx`select id, storage_path, thumb_path, width, height, is_cover, position from public.property_media where property_id = ${propertyId} and kind = 'photo' order by is_cover desc, position, id`)) as unknown as MediaRow[];
}

/** Garde-fou d'édition : la RLS d'UPDATE de properties n'autorise que l'agent responsable (ou write_all). */
const canEdit = async (tx: any, id: string) => (await tx`update public.properties set updated_at = now() where id = ${id} and deleted_at is null returning id`).length > 0;

export type UploadResult = { added: number; errors: { name: string; code: string }[] };
export async function addPhotos(ctx: Ctx, propertyId: string, files: File[]): Promise<UploadResult | null> {
  const prep = await db(ctx, async (tx) => {
    if (!ctx.caps.has("properties.write") || !(await canEdit(tx, propertyId))) return null;
    const [c] = await tx`select count(*)::int n, bool_or(is_cover) as has_cover, coalesce(max(position), -1) as maxpos from public.property_media where property_id = ${propertyId} and kind = 'photo'`;
    return { n: c!.n as number, hasCover: !!c!.has_cover, pos: Number(c!.maxpos) };
  });
  if (!prep) return null;
  let { n, hasCover, pos } = prep;
  const res: UploadResult = { added: 0, errors: [] };
  for (const f of files) {
    if (n >= MAX_PHOTOS) { res.errors.push({ name: f.name, code: "limit" }); continue; }
    try {
      const out = await processImage(Buffer.from(await f.arrayBuffer()));
      const id = randomUUID(), base = `org/${ctx.orgId}/property_photo`;
      const key = `${base}/${id}.jpg`, tkey = `${base}/${randomUUID()}.jpg`;
      await storage.put(key, out.main, "image/jpeg"); await storage.put(tkey, out.thumb, "image/jpeg");
      pos += 1;
      await db(ctx, (tx) => tx`insert into public.property_media (id, organization_id, property_id, kind, storage_path, thumb_path, width, height, position, is_cover)
        values (${id}, ${ctx.orgId}, ${propertyId}, 'photo', ${key}, ${tkey}, ${out.width}, ${out.height}, ${pos}, ${!hasCover})`);
      hasCover = true; n += 1; res.added += 1;
    } catch (e) { res.errors.push({ name: f.name, code: e instanceof ImageError ? e.code : "failed" }); }
  }
  return res;
}

export async function setCover(ctx: Ctx, propertyId: string, mediaId: string) {
  return db(ctx, async (tx) => {
    if (!(await canEdit(tx, propertyId))) return false;
    await tx`update public.property_media set is_cover = false where property_id = ${propertyId} and is_cover`;
    return (await tx`update public.property_media set is_cover = true where id = ${mediaId} and property_id = ${propertyId} returning id`).length > 0;
  });
}

export async function deletePhoto(ctx: Ctx, propertyId: string, mediaId: string) {
  const row = await db(ctx, async (tx) => {
    if (!(await canEdit(tx, propertyId))) return null;
    const [r] = await tx`delete from public.property_media where id = ${mediaId} and property_id = ${propertyId} returning storage_path, thumb_path, is_cover`;
    if (r?.is_cover) await tx`update public.property_media set is_cover = true where id = (select id from public.property_media where property_id = ${propertyId} order by position limit 1)`;
    return r ?? null;
  });
  if (!row) return false;
  await storage.remove(row.storage_path); if (row.thumb_path) await storage.remove(row.thumb_path);
  return true;
}

/** Octets de la photo de couverture (pour les affiches). */
export async function coverBytes(ctx: Ctx, propertyId: string): Promise<Buffer | null> {
  const [m] = await db(ctx, (tx) => tx`select storage_path from public.property_media where property_id = ${propertyId} and kind = 'photo' order by is_cover desc, position limit 1`);
  return m ? ((await storage.get(m.storage_path))?.data ?? null) : null;
}
