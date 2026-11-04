import "server-only";
import { sql } from "./db";
import { ensureUser } from "./auth-admin";
import { sendEmail } from "./email";
import { storage } from "./storage";

const RESERVED = new Set(["www", "app", "api", "platform", "admin", "mail", "status", "docs", "static", "cdn", "support", "billing", "login"]);
export const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,30})[a-z0-9]$/;
export type CreateAgencyError = "invalid_slug" | "reserved_slug" | "slug_taken" | "invalid_email" | "invalid_name" | "invalid_plan";

const audit = (adminId: string, action: string, orgId: string | null, details: object = {}) =>
  sql`insert into public.platform_audit_log (admin_id, action, organization_id, details) values (${adminId}, ${action}, ${orgId}, ${sql.json(details as never)})`;

export async function listOrgs() {
  return (await sql`
    select o.id, o.slug, o.name_fr, o.name_he, o.name_en, o.plan, o.status, o.created_at,
      (select count(*) from public.memberships m where m.organization_id = o.id and m.status = 'active')::int as seats,
      app.org_limit(o.id, 'seats') as seat_limit,
      (select count(*) from public.properties p where p.organization_id = o.id and p.deleted_at is null)::int as properties,
      (select count(*) from public.contacts c where c.organization_id = o.id and c.deleted_at is null)::int as contacts,
      coalesce((select sum(pm.bytes) from public.property_media pm where pm.organization_id = o.id), 0)::bigint as storage_bytes,
      app.org_limit(o.id, 'storage_mb') as storage_limit_mb,
      coalesce((select sum(l.delta) from public.ai_credit_ledger l where l.organization_id = o.id), 0)::float as credits,
      (select max(a.at) from public.audit_log a where a.organization_id = o.id) as last_activity,
      s.status as sub_status
    from public.organizations o left join public.subscriptions s on s.organization_id = o.id order by o.created_at desc`) as unknown as Record<string, any>[];
}

export async function getOrg(id: string) {
  const [o] = await sql`select o.*, s.status as sub_status, s.provider, s.current_period_end from public.organizations o left join public.subscriptions s on s.organization_id = o.id where o.id = ${id}`;
  if (!o) return null;
  const members = await sql`select m.user_id, m.role, m.status, p.full_name, u.email from public.memberships m join public.profiles p on p.id = m.user_id left join auth.users u on u.id = m.user_id where m.organization_id = ${id} order by (m.role = 'owner') desc`;
  const log = await sql`select action, details, at from public.platform_audit_log where organization_id = ${id} order by at desc limit 15`;
  const [usage] = await sql`select (select count(*) from public.properties where organization_id = ${id} and deleted_at is null)::int as properties, (select count(*) from public.contacts where organization_id = ${id} and deleted_at is null)::int as contacts,
    coalesce((select sum(bytes) from public.property_media where organization_id = ${id}), 0)::bigint as storage_bytes, coalesce((select sum(delta) from public.ai_credit_ledger where organization_id = ${id}), 0)::float as credits, app.org_limit(${id}::uuid, 'seats') as seat_limit, app.org_limit(${id}::uuid, 'storage_mb') as storage_limit_mb`;
  return { org: o as Record<string, any>, members: members as unknown as Record<string, any>[], log: log as unknown as Record<string, any>[], usage: usage as Record<string, any> };
}

export async function createAgency(adminId: string, i: { name_fr: string; name_he: string; name_en: string; slug: string; locale: string; plan: string; ownerEmail: string }, siteUrl: string): Promise<{ orgId?: string; error?: CreateAgencyError }> {
  const slug = i.slug.trim().toLowerCase(), email = i.ownerEmail.trim().toLowerCase();
  if (!SLUG.test(slug)) return { error: "invalid_slug" };
  if (RESERVED.has(slug)) return { error: "reserved_slug" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "invalid_email" };
  if (!i.name_fr.trim() && !i.name_he.trim() && !i.name_en.trim()) return { error: "invalid_name" };
  if (!(await sql`select 1 from public.plans where key = ${i.plan}`).length) return { error: "invalid_plan" };
  if ((await sql`select 1 from public.organizations where slug = ${slug}`).length) return { error: "slug_taken" };
  const ownerId = await ensureUser(email);
  const locale = ["fr", "he", "en"].includes(i.locale) ? i.locale : "fr";
  const [r] = await sql`select public.provision_organization(${slug}, ${i.name_fr.trim() || null}, ${i.name_he.trim() || null}, ${i.name_en.trim() || null}, ${locale}, ${ownerId}) as id`;
  const orgId = r!.id as string;
  await sql`update public.organizations set plan = ${i.plan} where id = ${orgId}`;
  await sql`update public.subscriptions set plan = ${i.plan} where organization_id = ${orgId}`;
  const dom = (process.env.APP_DOMAINS ?? "").split(",")[0]?.trim();
  if (dom) await sql`insert into public.org_domains (domain, organization_id, kind, verified) values (${`${slug}.${dom}`}, ${orgId}, 'subdomain', true) on conflict do nothing`;
  await audit(adminId, "create_agency", orgId, { slug, plan: i.plan, owner: email });
  const name = i.name_fr || i.name_he || i.name_en;
  const login = dom ? `https://${slug}.${dom}/${locale}/login` : `${siteUrl}/${locale}/login`;
  await sendEmail({ to: email, subject: `Votre espace ${name} est prêt`, text: `Votre agence ${name} a été créée sur MultiDeploy. Connectez-vous : ${login}`, html: `<p>Votre agence <b>${name.replace(/[<>&]/g, "")}</b> a été créée sur MultiDeploy.</p><p><a href="${login}">Se connecter</a></p>` });
  return { orgId };
}

export async function setStatus(adminId: string, id: string, status: "active" | "suspended") { await sql`update public.organizations set status = ${status} where id = ${id}`; await audit(adminId, `set_status_${status}`, id); }
export async function setPlan(adminId: string, id: string, plan: string): Promise<boolean> {
  if (!(await sql`select 1 from public.plans where key = ${plan}`).length) return false;
  await sql`update public.organizations set plan = ${plan} where id = ${id}`; await sql`update public.subscriptions set plan = ${plan} where organization_id = ${id}`; await audit(adminId, "set_plan", id, { plan }); return true;
}
export async function grantCredits(adminId: string, id: string, amount: number, reason: string) {
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 100000) return false;
  await sql`select public.ai_grant(${id}::uuid, ${amount}::numeric, ${("manual:" + reason).slice(0, 80)})`; await audit(adminId, "grant_credits", id, { amount, reason }); return true;
}
export async function setOverrides(adminId: string, id: string, o: { seats?: number | null; storage?: number | null; features?: Record<string, boolean> }) {
  await sql`update public.organizations set settings = settings
    || ${sql.json({ ...(o.seats ? { seats_override: o.seats } : {}), ...(o.storage ? { storage_override: o.storage } : {}) } as never)}::jsonb
    || jsonb_build_object('features', coalesce(settings->'features', '{}'::jsonb) || ${sql.json((o.features ?? {}) as never)}::jsonb) where id = ${id}`;
  await audit(adminId, "set_overrides", id, o);
}
export async function logImpersonation(adminId: string, id: string, action: "start" | "stop") { await audit(adminId, `impersonate_${action}`, id); await sql`insert into public.audit_log (organization_id, actor_id, action, entity) values (${id}, ${adminId}, ${"SUPPORT_" + action.toUpperCase()}, 'support_session')`; }

export async function purgeAgency(adminId: string, id: string, confirmSlug: string): Promise<boolean> {
  const [o] = await sql`select slug from public.organizations where id = ${id}`;
  if (!o || o.slug !== confirmSlug) return false;
  const files = await sql`select storage_path, thumb_path from public.property_media where organization_id = ${id}`;
  const posters = await sql`select output_path from public.poster_generations where organization_id = ${id}`;
  await sql`select public.purge_organization(${id}::uuid, ${adminId}::uuid)`;
  for (const f of files) { await storage.remove(f.storage_path); if (f.thumb_path) await storage.remove(f.thumb_path); }
  for (const p of posters) await storage.remove(p.output_path);
  return true;
}
