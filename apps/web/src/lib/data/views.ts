import "server-only";
import { db, type Ctx } from "../session";

export type SavedView = { id: string; name: string; qs: string; shared: boolean; mine: boolean };
const ALLOWED = /^[\w%.,=&:\-+]*$/; // query string brute : uniquement des caractères d'URL sûrs (pas de schéma, pas de //)

export async function listViews(ctx: Ctx, scope: "properties" | "contacts"): Promise<SavedView[]> {
  const rows = await db(ctx, (tx) => tx`select id, name, filters->>'qs' as qs, shared, user_id = ${ctx.userId} as mine from public.saved_views where scope = ${scope} order by created_at`);
  return rows as unknown as SavedView[];
}
export async function saveView(ctx: Ctx, scope: "properties" | "contacts", name: string, qs: string, shared: boolean): Promise<boolean> {
  const clean = qs.replace(/^\?/, "");
  if (!name.trim() || !ALLOWED.test(clean) || clean.length > 500) return false;
  await db(ctx, (tx) => tx`insert into public.saved_views (organization_id, scope, name, filters, shared) values (${ctx.orgId}, ${scope}, ${name.trim().slice(0, 60)}, ${tx.json({ qs: clean })}, ${shared && ctx.caps.has("org.manage")})`);
  return true;
}
export const deleteView = (ctx: Ctx, id: string) => db(ctx, async (tx) => (await tx`delete from public.saved_views where id = ${id} returning id`).length > 0);
