"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/session";
import { AGENT_SCOPES, changeMember, inviteMember, revokeInvitation, setAgentScopes } from "@/lib/data/team";

const loc = (fd: FormData) => (["fr", "he", "en"].includes(String(fd.get("locale"))) ? String(fd.get("locale")) : "fr");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES = ["owner", "admin", "agent", "assistant", "viewer"];
const back = (locale: string, err?: string, ok?: string) => redirect(`/${locale}/settings/team${err ? `?err=${err}` : ok ? `?ok=${ok}` : ""}`);

export async function inviteAction(fd: FormData) {
  const locale = loc(fd); const ctx = await getCtx(locale);
  if (!ctx.caps.has("members.manage")) return back(locale, "forbidden");
  const role = String(fd.get("role")); if (!ROLES.includes(role) || role === "owner") return back(locale, "forbidden");
  const h = await headers();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const r = await inviteMember(ctx, String(fd.get("email") ?? ""), role, site, locale);
  revalidatePath(`/${locale}/settings/team`);
  back(locale, r.error, r.error ? undefined : "invited");
}
export async function changeMemberAction(userId: string, fd: FormData) {
  const locale = loc(fd); const ctx = await getCtx(locale);
  if (!uuid.test(userId) || !ctx.caps.has("members.manage")) return back(locale, "forbidden");
  const role = fd.get("role") ? String(fd.get("role")) : undefined; const status = fd.get("status") === "disabled" ? "disabled" : fd.get("status") === "active" ? "active" : undefined;
  if (role && !ROLES.includes(role)) return back(locale, "forbidden");
  const err = await changeMember(ctx, userId, { role, status });
  revalidatePath(`/${locale}/settings/team`);
  back(locale, err ?? undefined, err ? undefined : "saved");
}
export async function revokeAction(id: string, fd: FormData) {
  const locale = loc(fd); const ctx = await getCtx(locale);
  if (uuid.test(id) && ctx.caps.has("members.manage")) await revokeInvitation(ctx, id);
  revalidatePath(`/${locale}/settings/team`);
  back(locale);
}

export async function agentScopesAction(fd: FormData) {
  const locale = loc(fd); const ctx = await getCtx(locale);
  if (!ctx.caps.has("org.manage") || ctx.impersonating) return back(locale, "forbidden");
  await setAgentScopes(ctx, Object.fromEntries(AGENT_SCOPES.map((c) => [c, fd.get(c) === "on"])));
  revalidatePath(`/${locale}`, "layout");
  return back(locale, undefined, "saved");
}
