import "server-only";
import { zipSync, strToU8 } from "fflate";
import { db, type Ctx } from "../session";

/** CSV sûr : guillemets doublés + neutralisation des formules (=, +, -, @) pour éviter l'injection dans Excel/Sheets. */
export const csvCell = (v: unknown): string => {
  let s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) && !/^\+\d[\d\s-]+$/.test(s)) s = `'${s}`;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows: Record<string, unknown>[]): string => {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]!);
  return "﻿" + [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\r\n"); // BOM : Excel lit l'hébreu en UTF-8
};

/** Export complet de l'agence (portabilité) : un ZIP de CSV. Lecture sous RLS de l'utilisateur (un agent n'exporte que ce qu'il voit). */
export async function exportOrganization(ctx: Ctx): Promise<Uint8Array> {
  const q = async <T,>(f: (tx: any) => Promise<T>) => db(ctx, f as never) as Promise<T>;
  const properties = await q((tx) => tx`select reference, transaction, property_type, status, price, currency, rooms, area_built, floor, floors_total, street, house_number, mamad, parking_count, elevator, sukkah_balcony, storage, ac, arnona_monthly, vaad_bayit_monthly, registration_type, mandate, created_at from public.properties where deleted_at is null order by created_at`);
  const contacts = await q((tx) => tx`select id, kinds::text[] as kinds, first_name, last_name, first_name_he, last_name_he, phones, emails, preferred_locale, aliyah_status, budget_max, tags, marketing_consent, notes, created_at from public.contacts where deleted_at is null order by created_at`);
  const profiles = await q((tx) => tx`select contact_id, transaction, city_ids, price_max, rooms_min, rooms_max, must_have, nice_to_have, active from public.contact_search_profiles`);
  const deals = await q((tx) => tx`select d.id, d.contact_id, d.property_id, s.name->>'fr' as stage, d.value, d.currency, d.commission_pct, d.expected_close, d.created_at from public.deals d join public.pipeline_stages s on s.id = d.stage_id where d.deleted_at is null`);
  const activities = await q((tx) => tx`select kind, contact_id, property_id, summary, occurred_at from public.activities order by occurred_at`);
  const tasks = await q((tx) => tx`select title, due_at, done_at, contact_id from public.tasks`);
  const files: Record<string, Uint8Array> = { "properties.csv": strToU8(toCsv(properties as never)), "contacts.csv": strToU8(toCsv(contacts as never)), "search_profiles.csv": strToU8(toCsv(profiles as never)), "deals.csv": strToU8(toCsv(deals as never)), "activities.csv": strToU8(toCsv(activities as never)), "tasks.csv": strToU8(toCsv(tasks as never)), "README.txt": strToU8(`Export MultiDeploy — ${new Date().toISOString()}\nUTF-8 (BOM). Les photos ne sont pas incluses : demandez un export complet des médias au support.\n`) };
  return zipSync(files, { level: 6 });
}

/** Droit d'accès : toutes les données d'un contact, en JSON. */
export async function exportContact(ctx: Ctx, id: string) {
  return db(ctx, async (tx) => {
    const [c] = await tx`select * from public.contacts where id = ${id}`;
    if (!c) return null;
    return { contact: c, search_profiles: await tx`select * from public.contact_search_profiles where contact_id = ${id}`, activities: await tx`select kind, summary, occurred_at from public.activities where contact_id = ${id} order by occurred_at`, shares: await tx`select channel, status, sent_at, opened_at, property_ids from public.shares where contact_id = ${id}`, tasks: await tx`select title, due_at, done_at from public.tasks where contact_id = ${id}`, deals: await tx`select value, currency, created_at from public.deals where contact_id = ${id}` };
  });
}
