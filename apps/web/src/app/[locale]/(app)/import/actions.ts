"use server";
import { getCtx } from "@/lib/session";
import { CONTACT_FIELDS, PROPERTY_FIELDS, guessMapping, mapRows, parseCsv } from "@/lib/import/csv";
import { importContacts, importProperties, type ImportReport } from "@/lib/import/apply";
import { listCitiesWithAliases } from "@/lib/data/geo";

export type PreviewState = { error?: "no_file" | "too_large" | "empty" | "forbidden"; target?: "contacts" | "properties"; headers?: string[]; mapping?: string[]; sample?: string[][]; total?: number; csv?: string; truncated?: boolean; report?: ImportReport } | null;
const MAX_BYTES = 1_500_000;
const loc = (fd: FormData) => (["fr", "he", "en"].includes(String(fd.get("locale"))) ? String(fd.get("locale")) : "fr");

export async function previewImport(_p: PreviewState, fd: FormData): Promise<PreviewState> {
  const ctx = await getCtx(loc(fd));
  const target = fd.get("target") === "properties" ? "properties" : "contacts";
  if (!ctx.caps.has(target === "contacts" ? "contacts.write" : "properties.write") || ctx.impersonating) return { error: "forbidden" };
  const f = fd.get("file");
  if (!(f instanceof File) || f.size === 0) return { error: "no_file" };
  if (f.size > MAX_BYTES) return { error: "too_large" };
  const csv = new TextDecoder("utf-8").decode(await f.arrayBuffer());
  const { headers, rows, truncated } = parseCsv(csv, 1000);
  if (!headers.length || !rows.length) return { error: "empty" };
  return { target, headers, mapping: guessMapping(headers, target === "contacts" ? CONTACT_FIELDS : PROPERTY_FIELDS), sample: rows.slice(0, 5), total: rows.length, csv, truncated };
}

export async function runImport(_p: PreviewState, fd: FormData): Promise<PreviewState> {
  const locale = loc(fd); const ctx = await getCtx(locale);
  const target = fd.get("target") === "properties" ? "properties" : "contacts";
  if (!ctx.caps.has(target === "contacts" ? "contacts.write" : "properties.write") || ctx.impersonating) return { error: "forbidden" };
  const csv = String(fd.get("csv") ?? ""); if (csv.length > MAX_BYTES) return { error: "too_large" };
  const allowed: readonly string[] = target === "contacts" ? CONTACT_FIELDS : PROPERTY_FIELDS;
  const { headers, rows } = parseCsv(csv, 1000);
  const mapping = headers.map((_, i) => { const m = String(fd.get(`map_${i}`) ?? "ignore"); return allowed.includes(m) ? m : "ignore"; });
  const mapped = mapRows(rows, mapping);
  const report = target === "contacts" ? await importContacts(ctx, mapped) : await importProperties(ctx, mapped, await listCitiesWithAliases(ctx), locale);
  return { target, report };
}
