import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db, type Ctx } from "../session";
import { sql, withUser } from "../db";
import { sendEmail } from "../email";

export type Member = { user_id: string; role: string; status: string; full_name: string | null; email: string | null; created_at: Date };
export type TeamError = "seat_limit" | "last_owner" | "forbidden" | "invalid_email" | "already_member" | "unknown";
const mapErr = (e: unknown): TeamError => { const m = String((e as Error)?.message ?? e); return m.includes("seat_limit") ? "seat_limit" : m.includes("last_owner") ? "last_owner" : /row-level security|permission/.test(m) ? "forbidden" : "unknown"; };

export async function listTeam(ctx: Ctx) {
  // e-mails (auth.users) : lecture privilégiée mais strictement bornée à l'agence active et réservée à members.manage
  if (!ctx.caps.has("members.manage")) return { members: [] as Member[], invitations: [], seats: { used: 0, limit: 0 } };
  const members = (await sql`select m.user_id, m.role, m.status, p.full_name, u.email, m.created_at from public.memberships m join public.profiles p on p.id = m.user_id left join auth.users u on u.id = m.user_id where m.organization_id = ${ctx.orgId} order by (m.role = 'owner') desc, p.full_name`) as unknown as Member[];
  const invitations = await db(ctx, (tx) => tx`select id, email, role, expires_at, created_at from public.invitations where accepted_at is null order by created_at desc`);
  const [lim] = await sql`select app.org_limit(${ctx.orgId}::uuid, 'seats') as l`;
  return { members, invitations: invitations as unknown as { id: string; email: string; role: string; expires_at: Date; created_at: Date }[], seats: { used: members.filter((m) => m.status === "active").length, limit: Number(lim!.l) } };
}

export async function changeMember(ctx: Ctx, userId: string, patch: { role?: string; status?: "active" | "disabled" }): Promise<TeamError | null> {
  try {
    const rows = await db(ctx, (tx) => tx`update public.memberships set role = coalesce(${patch.role ?? null}::public.member_role, role), status = coalesce(${patch.status ?? null}, status) where organization_id = ${ctx.orgId} and user_id = ${userId} returning user_id`);
    return rows.length ? null : "forbidden";
  } catch (e) { return mapErr(e); }
}

export async function inviteMember(ctx: Ctx, email: string, role: string, siteUrl: string, locale: string): Promise<{ error?: TeamError }> {
  const mail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return { error: "invalid_email" };
  const token = randomBytes(24).toString("hex"), hash = createHash("sha256").update(token).digest("hex");
  try {
    const [seat] = await sql`select (select count(*) from public.memberships where organization_id = ${ctx.orgId} and status = 'active')::int as used, app.org_limit(${ctx.orgId}::uuid, 'seats') as lim`;
    if (seat!.used >= seat!.lim) return { error: "seat_limit" };
    const dup = await sql`select 1 from public.memberships m join auth.users u on u.id = m.user_id where m.organization_id = ${ctx.orgId} and m.status = 'active' and lower(u.email) = ${mail}`;
    if (dup.length) return { error: "already_member" };
    await db(ctx, (tx) => tx`insert into public.invitations (organization_id, email, role, token_hash, created_by) values (${ctx.orgId}, ${mail}, ${role}::public.member_role, ${hash}, ${ctx.userId})`);
  } catch (e) { return { error: mapErr(e) }; }
  const [o] = await sql`select name_fr, name_he, name_en from public.organizations where id = ${ctx.orgId}`;
  const name = (locale === "he" ? o!.name_he : locale === "en" ? o!.name_en : o!.name_fr) ?? o!.name_fr;
  const link = `${siteUrl}/${locale}/invite/${token}`;
  const T = { fr: [`Invitation à rejoindre ${name}`, `Vous êtes invité(e) à rejoindre ${name} sur NadlanHub.`, "Accepter l'invitation"], he: [`הזמנה להצטרף ל-${name}`, `הוזמנת להצטרף ל-${name} ב-MultiDeploy.`, "אישור ההזמנה"], en: [`Invitation to join ${name}`, `You have been invited to join ${name} on MultiDeploy.`, "Accept the invitation"] }[locale as "fr" | "he" | "en"] ?? ["", "", ""];
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  await sendEmail({ to: mail, subject: T[0]!, text: `${T[1]}\n${link}`, html: `<div dir="${locale === "he" ? "rtl" : "ltr"}" style="font-family:Arial,sans-serif"><p>${esc(T[1]!)}</p><p><a href="${esc(link)}" style="display:inline-block;background:#1f4fd8;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">${esc(T[2]!)}</a></p></div>` });
  return {};
}

export async function revokeInvitation(ctx: Ctx, id: string) { return db(ctx, async (tx) => (await tx`delete from public.invitations where id = ${id} returning id`).length > 0); }

export async function previewInvitation(token: string) {
  if (!/^[0-9a-f]{48}$/.test(token)) return null;
  const [r] = await sql`select i.email, i.role, o.name_fr, o.name_he, o.name_en from public.invitations i join public.organizations o on o.id = i.organization_id where i.token_hash = ${createHash("sha256").update(token).digest("hex")} and i.accepted_at is null and i.expires_at > now()`;
  return (r ?? null) as null | { email: string; role: string; name_fr: string; name_he: string; name_en: string };
}

export async function acceptInvitation(userId: string, token: string): Promise<{ orgId?: string; error?: "invalid" | "wrong_account" | "seat_limit" }> {
  try {
    const [r] = await withUser({ userId, orgId: null }, (tx) => tx`select public.accept_invitation(${token}) as org`);
    return { orgId: r!.org };
  } catch (e) { const m = String((e as Error).message); return { error: m.includes("wrong_account") ? "wrong_account" : m.includes("seat_limit") ? "seat_limit" : "invalid" }; }
}

/** Ce que voient les agents de l'agence (surcharge des droits par défaut). */
export const AGENT_SCOPES = ["properties.read_all", "contacts.read_all", "reports.read_all"] as const;
export async function getAgentScopes(ctx: Ctx) {
  const rows = await db(ctx, (tx) => tx`select distinct on (capability) capability, granted from public.role_capabilities
    where role = 'agent' and capability = any(${[...AGENT_SCOPES]}) and (organization_id = ${ctx.orgId} or organization_id is null) order by capability, organization_id nulls last`);
  const m = new Map(rows.map((r) => [r.capability as string, r.granted as boolean]));
  return Object.fromEntries(AGENT_SCOPES.map((c) => [c, m.get(c) ?? false])) as Record<(typeof AGENT_SCOPES)[number], boolean>;
}
export async function setAgentScopes(ctx: Ctx, values: Record<string, boolean>) {
  if (!ctx.caps.has("org.manage")) return false;
  await db(ctx, async (tx) => {
    for (const c of AGENT_SCOPES) {
      await tx`delete from public.role_capabilities where organization_id = ${ctx.orgId} and role = 'agent' and capability = ${c}`;
      await tx`insert into public.role_capabilities (organization_id, role, capability, granted) values (${ctx.orgId}, 'agent', ${c}, ${!!values[c]})`;
    }
  });
  return true;
}
