import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";

export type StoredFile = { data: Buffer; mime: string };
export interface Storage {
  put(key: string, data: Buffer, mime: string): Promise<void>;
  get(key: string): Promise<StoredFile | null>;
  remove(key: string): Promise<void>;
}

/** Clés : org/<orgId>/<kind>/<uuid>.<ext>. Tout autre format est refusé (anti path traversal). */
const KEY = /^org\/[0-9a-f-]{36}\/[a-z_]+\/[0-9a-f-]{36}(?:\.[a-z0-9]{2,5})?$/i;
export const isValidKey = (k: string) => KEY.test(k) && !k.includes("..");
export const orgOfKey = (k: string) => k.split("/")[1] ?? "";
const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf", webm: "audio/webm", m4a: "audio/mp4" };
const mimeOf = (k: string) => MIME[k.split(".").pop() ?? ""] ?? "application/octet-stream";

class LocalStorage implements Storage {
  private root = resolve(process.env.STORAGE_DIR ?? join(process.cwd(), ".data", "storage"));
  private path(key: string) {
    const p = resolve(this.root, key);
    if (!p.startsWith(this.root + sep)) throw new Error("invalid storage key");
    return p;
  }
  async put(key: string, data: Buffer) { if (!isValidKey(key)) throw new Error("invalid key"); const p = this.path(key); await mkdir(dirname(p), { recursive: true }); await writeFile(p, data); }
  async get(key: string) { if (!isValidKey(key)) return null; try { return { data: await readFile(this.path(key)), mime: mimeOf(key) }; } catch { return null; } }
  async remove(key: string) { if (isValidKey(key)) await rm(this.path(key), { force: true }); }
}

/** Supabase Storage (bucket privé) via l'API REST et la clé service — côté serveur uniquement. NON TESTÉ ici (pas de projet Supabase). */
class SupabaseStorage implements Storage {
  constructor(private url: string, private key: string, private bucket: string) {}
  private h = () => ({ Authorization: `Bearer ${this.key}`, apikey: this.key });
  async put(key: string, data: Buffer, mime: string) {
    if (!isValidKey(key)) throw new Error("invalid key");
    const r = await fetch(`${this.url}/storage/v1/object/${this.bucket}/${key}`, { method: "POST", headers: { ...this.h(), "Content-Type": mime, "x-upsert": "true" }, body: new Uint8Array(data) });
    if (!r.ok) throw new Error(`storage put failed: ${r.status}`);
  }
  async get(key: string) {
    if (!isValidKey(key)) return null;
    const r = await fetch(`${this.url}/storage/v1/object/${this.bucket}/${key}`, { headers: this.h() });
    return r.ok ? { data: Buffer.from(await r.arrayBuffer()), mime: r.headers.get("content-type") ?? mimeOf(key) } : null;
  }
  async remove(key: string) { if (isValidKey(key)) await fetch(`${this.url}/storage/v1/object/${this.bucket}/${key}`, { method: "DELETE", headers: this.h() }); }
}

declare global { var __storage: Storage | undefined }
// STORAGE_DRIVER=local force le disque local même si la clé de service Supabase est présente (pile minimale : Auth + Postgres sans le service Storage).
export const storage: Storage = (globalThis.__storage ??= process.env.STORAGE_DRIVER !== "local" && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new SupabaseStorage(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.STORAGE_BUCKET ?? "agency-files")
  : new LocalStorage());
