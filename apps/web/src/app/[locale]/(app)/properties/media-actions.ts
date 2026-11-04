"use server";
import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/session";
import { addPhotos, deletePhoto, setCover, type UploadResult } from "@/lib/data/media";

export type UploadState = ({ ok: boolean } & Partial<UploadResult>) | null;
const loc = (fd: FormData) => (["fr", "he", "en"].includes(String(fd.get("locale"))) ? String(fd.get("locale")) : "fr");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function uploadPhotos(propertyId: string, _prev: UploadState, fd: FormData): Promise<UploadState> {
  const locale = loc(fd);
  if (!uuid.test(propertyId)) return { ok: false };
  const ctx = await getCtx(locale);
  const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 15);
  if (!files.length) return { ok: false, added: 0, errors: [] };
  const r = await addPhotos(ctx, propertyId, files);
  if (!r) return { ok: false };
  revalidatePath(`/${locale}/properties/${propertyId}`);
  return { ok: r.added > 0, ...r };
}
export async function setCoverAction(propertyId: string, mediaId: string, fd: FormData) {
  const locale = loc(fd); const ctx = await getCtx(locale);
  if (uuid.test(propertyId) && uuid.test(mediaId)) await setCover(ctx, propertyId, mediaId);
  revalidatePath(`/${locale}/properties/${propertyId}`);
}
export async function deletePhotoAction(propertyId: string, mediaId: string, fd: FormData) {
  const locale = loc(fd); const ctx = await getCtx(locale);
  if (uuid.test(propertyId) && uuid.test(mediaId)) await deletePhoto(ctx, propertyId, mediaId);
  revalidatePath(`/${locale}/properties/${propertyId}`);
}
