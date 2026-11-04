import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { sql, withUser, type Tx } from "./db";
import { supabaseEnv } from "./supabase/env";
import { createClient } from "./supabase/server";
import { classifyHost } from "./tenant";

export type Role = "owner" | "admin" | "agent" | "assistant" | "viewer";
export type Ctx = {
  userId: string; orgId: string; role: Role; fullName: string; orgName: { fr: string | null; he: string | null; en: string | null }; orgSlug: string; locale: string;
  caps: Set<string>; features: Set<string>; plan: string; impersonating: boolean; isPlatformAdmin: boolean;
};

export const DEV_USER_COOKIE = "dev_user";
export const IMPERSONATE_COOKIE = "imp_org";
export const devImpersonationEnabled = () => process.env.NODE_ENV !== "production" && !supabaseEnv();
const CAPS = ["contacts.read_all", "contacts.write", "contacts.write_all", "contacts.delete", "properties.write", "properties.write_all", "properties.delete", "members.manage", "org.manage", "brand.manage", "audit.read", "deals.write", "tasks.write", "shares.send", "ai.use", "posters.create", "api.manage", "billing.manage", "exports.run"];
const FEATURES = ["custom_domain", "white_label", "whatsapp_api", "api", "creative_posters"];

/** Identité authentifiée (sans notion d'agence). null si non connecté. */
export async function resolveUserId(): Promise<string | null> {
  if (supabaseEnv()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser(); // valide le JWT côté Auth (jamais getSession pour l'autorisation)
    return data.user?.id ?? null;
  }
  if (!devImpersonationEnabled()) return null;
  const store = await cookies();
  const wanted = store.get(DEV_USER_COOKIE)?.value;
  const [row] = wanted && /^[0-9a-f-]{36}$/i.test(wanted)
    ? await sql`select id from public.profiles where id = ${wanted}`
    : await sql`select p.id from public.profiles p join auth.users u on u.id = p.id join public.memberships m on m.user_id = p.id order by (m.role = 'owner') desc, u.email limit 1`;
  return row?.id ?? null;
}

export const isPlatformAdmin = cache(async (userId: string) => (await sql`select 1 from public.platform_admins where user_id = ${userId}`).length > 0);

async function tenantOrgId(): Promise<string | null> {
  const h = await headers();
  const hk = classifyHost(h.get("x-forwarded-host") ?? h.get("host"));
  if (hk.kind === "subdomain") return (await sql`select id from public.organizations where slug = ${hk.slug}`)[0]?.id ?? "unknown";
  if (hk.kind === "custom") return (await sql`select organization_id as id from public.org_domains where domain = ${hk.host} and verified`)[0]?.id ?? "unknown";
  return null;
}

export const getCtx = cache(async (locale = "fr"): Promise<Ctx> => {
  const userId = await resolveUserId();
  if (!userId) redirect(`/${locale}/login`);
  const platformAdmin = await isPlatformAdmin(userId);
  const store = await cookies();

  // Support : impersonation en LECTURE SEULE, réservée aux administrateurs de plateforme (revérifiée à chaque requête)
  const impOrg = store.get(IMPERSONATE_COOKIE)?.value;
  if (platformAdmin && impOrg && /^[0-9a-f-]{36}$/i.test(impOrg)) {
    const [o] = await sql`select id, slug, name_fr, name_he, name_en, plan from public.organizations where id = ${impOrg}`;
    if (o) return build({ userId, orgId: o.id, role: "viewer", fullName: "Support", o, locale, imp: true, platformAdmin });
  }

  const tenant = await tenantOrgId(); // sous-domaine / domaine personnalisé : l'agence est imposée par l'adresse
  if (tenant === "unknown") redirect(`/${locale}/login?error=unknown_tenant`);
  const [row] = await sql`
    select p.full_name, m.organization_id as org_id, m.role, o.slug, o.name_fr, o.name_he, o.name_en, o.plan
    from public.profiles p
    join public.memberships m on m.user_id = p.id and m.status = 'active'
      and (${tenant}::uuid is null or m.organization_id = ${tenant}::uuid)
      and m.organization_id = coalesce(case when ${tenant}::uuid is null then p.active_organization_id end, m.organization_id)
    join public.organizations o on o.id = m.organization_id and o.status = 'active'
    where p.id = ${userId} order by (m.organization_id = p.active_organization_id) desc limit 1`;
  if (!row) {
    if (platformAdmin) redirect(`/${locale}/platform`);
    redirect(`/${locale}/login?error=no_agency`);
  }
  return build({ userId, orgId: row.org_id, role: row.role, fullName: row.full_name ?? "", o: { id: row.org_id, slug: row.slug, name_fr: row.name_fr, name_he: row.name_he, name_en: row.name_en, plan: row.plan }, locale, imp: false, platformAdmin });
});

async function build(a: { userId: string; orgId: string; role: Role; fullName: string; o: Record<string, any>; locale: string; imp: boolean; platformAdmin: boolean }): Promise<Ctx> {
  const caps = await withUser({ userId: a.userId, orgId: a.orgId, imp: a.imp }, async (tx) =>
    (await tx`select c.cap from unnest(${CAPS}::text[]) c(cap) where app.has_capability(c.cap)`).map((r) => r.cap as string));
  const feats = (await sql`select f.k from unnest(${FEATURES}::text[]) f(k) where app.org_feature(${a.orgId}::uuid, f.k)`).map((r) => r.k as string);
  return { userId: a.userId, orgId: a.orgId, role: a.role, fullName: a.fullName, orgName: { fr: a.o.name_fr, he: a.o.name_he, en: a.o.name_en }, orgSlug: a.o.slug, locale: a.locale, caps: new Set(caps), features: new Set(feats), plan: a.o.plan, impersonating: a.imp, isPlatformAdmin: a.platformAdmin };
}

/** Exécute une requête sous l'identité (RLS) de l'utilisateur courant (lecture seule si impersonation). */
export async function db<T>(ctx: Ctx, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withUser({ userId: ctx.userId, orgId: ctx.orgId, imp: ctx.impersonating }, fn);
}

/** Contexte plateforme : administrateurs de plateforme uniquement (sans agence). */
export async function requirePlatformAdmin(locale = "fr") {
  const userId = await resolveUserId();
  if (!userId) redirect(`/${locale}/login`);
  if (!(await isPlatformAdmin(userId))) redirect(`/${locale}`);
  const [p] = await sql`select full_name from public.profiles where id = ${userId}`;
  return { userId, fullName: (p?.full_name as string) ?? "" };
}
