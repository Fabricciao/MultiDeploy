import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql, withUser, type Tx } from "./db";
import { supabaseEnv } from "./supabase/env";
import { createClient } from "./supabase/server";

export type Role = "owner" | "admin" | "agent" | "assistant" | "viewer";
export type Ctx = { userId: string; orgId: string; role: Role; fullName: string; orgName: { fr: string | null; he: string | null; en: string | null }; orgSlug: string; locale: string; caps: Set<string> };

export const DEV_USER_COOKIE = "dev_user";
/** L'usurpation de développement n'existe QUE hors production et sans Supabase configuré. */
export const devImpersonationEnabled = () => process.env.NODE_ENV !== "production" && !supabaseEnv();

async function resolveUserId(): Promise<string | null> {
  if (supabaseEnv()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser(); // valide le JWT côté Auth (jamais getSession pour l'autorisation)
    return data.user?.id ?? null;
  }
  if (!devImpersonationEnabled()) return null;
  const store = await cookies();
  const wanted = store.get(DEV_USER_COOKIE)?.value;
  const [row] = wanted
    ? await sql`select id from public.profiles where id = ${wanted}`
    : await sql`select p.id from public.profiles p join auth.users u on u.id = p.id join public.memberships m on m.user_id = p.id order by (m.role = 'owner') desc, u.email limit 1`;
  return row?.id ?? null;
}

export const getCtx = cache(async (locale = "fr"): Promise<Ctx> => {
  const userId = await resolveUserId();
  if (!userId) redirect(`/${locale}/login`);
  const [row] = await sql`
    select p.full_name, m.organization_id as org_id, m.role, o.slug, o.name_fr, o.name_he, o.name_en
    from public.profiles p
    join public.memberships m on m.user_id = p.id and m.status = 'active'
      and m.organization_id = coalesce(p.active_organization_id, m.organization_id)
    join public.organizations o on o.id = m.organization_id and o.status = 'active'
    where p.id = ${userId} order by (m.organization_id = p.active_organization_id) desc limit 1`;
  if (!row) redirect(`/${locale}/login?error=no_agency`);
  const caps = await withUser({ userId, orgId: row.org_id }, async (tx) =>
    (await tx`select c.cap from unnest(array['contacts.read_all','contacts.write','contacts.write_all','contacts.delete','properties.write','properties.write_all','properties.delete','members.manage','org.manage','brand.manage','audit.read','deals.write','tasks.write','shares.send','ai.use']) c(cap) where app.has_capability(c.cap)`).map((r) => r.cap as string),
  );
  return { userId, orgId: row.org_id, role: row.role, fullName: row.full_name ?? "", orgName: { fr: row.name_fr, he: row.name_he, en: row.name_en }, orgSlug: row.slug, locale, caps: new Set(caps) };
});

/** Exécute une requête sous l'identité (RLS) de l'utilisateur courant. */
export async function db<T>(ctx: Ctx, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withUser({ userId: ctx.userId, orgId: ctx.orgId }, fn);
}
