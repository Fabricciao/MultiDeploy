import "server-only";
import sharp, { type Metadata } from "sharp";

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const OK_FORMATS = new Set(["jpeg", "png", "webp"]);
export class ImageError extends Error { constructor(public code: "too_large" | "not_image" | "unsupported" | "too_small") { super(code); } }

/**
 * Valide le contenu réel (pas l'extension ni le MIME déclaré), applique l'orientation EXIF puis RETIRE toutes les métadonnées
 * (GPS inclus), borne la taille et produit une image principale + une vignette.
 */
export async function processImage(input: Buffer, opts: { max?: number; thumb?: number } = {}) {
  if (input.length > MAX_UPLOAD_BYTES) throw new ImageError("too_large");
  let meta: Metadata;
  try { meta = await sharp(input, { failOn: "error", limitInputPixels: 80_000_000 }).metadata(); } catch { throw new ImageError("not_image"); }
  if (!meta.format || !OK_FORMATS.has(meta.format)) throw new ImageError("unsupported");
  if ((meta.width ?? 0) < 200 || (meta.height ?? 0) < 150) throw new ImageError("too_small");
  const base = sharp(input).rotate(); // auto-orient ; sharp n'écrit aucune métadonnée par défaut
  const main = await base.clone().resize({ width: opts.max ?? 2000, height: opts.max ?? 2000, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  const thumb = await base.clone().resize({ width: opts.thumb ?? 480, height: opts.thumb ?? 480, fit: "inside" }).jpeg({ quality: 72 }).toBuffer();
  return { main: main.data, width: main.info.width, height: main.info.height, thumb };
}

export async function toPngDataUri(buf: Buffer, maxWidth = 1600) {
  const out = await sharp(buf).rotate().resize({ width: maxWidth, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  return `data:image/jpeg;base64,${out.toString("base64")}`;
}
