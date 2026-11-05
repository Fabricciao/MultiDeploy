"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { IMPERSONATE_COOKIE, requirePlatformAdmin } from "@/lib/session";
import { setBilling, createAgency, grantCredits, logImpersonation, purgeAgency, setOverrides, setPlan, setStatus } from "@/lib/platform";

const loc = (fd: FormData) => (["fr", "he", "en"].includes(String(fd.get("locale"))) ? String(fd.get("locale")) : "fr");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const s = (fd: FormData, k: string, n = 120) => String(fd.get(k) ?? "").trim().slice(0, n);

export async function createAgencyAction(fd: FormData) {
  const locale = loc(fd); const admin = await requirePlatformAdmin(locale);
  const h = await headers();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const r = await createAgency(admin.userId, { name_fr: s(fd, "name_fr"), name_he: s(fd, "name_he"), name_en: s(fd, "name_en"), slug: s(fd, "slug", 32), locale: s(fd, "default_locale", 2), plan: s(fd, "plan", 20), ownerEmail: s(fd, "owner_email", 160) }, site);
  revalidatePath(`/${locale}/platform`);
  redirect(r.orgId ? `/${locale}/platform/${r.orgId}?ok=created` : `/${locale}/platform?err=${r.error}`);
}
export async function orgAction(orgId: string, fd: FormData) {
  const locale = loc(fd); const admin = await requirePlatformAdmin(locale);
  if (!uuid.test(orgId)) redirect(`/${locale}/platform`);
  const op = s(fd, "op", 30);
  let err = "";
  if (op === "suspend") await setStatus(admin.userId, orgId, "suspended");
  else if (op === "activate") await setStatus(admin.userId, orgId, "active");
  else if (op === "plan") { if (!(await setPlan(admin.userId, orgId, s(fd, "plan", 20)))) err = "invalid_plan"; }
  else if (op === "billing") { if (!(await setBilling(admin.userId, orgId, s(fd, "paid_until", 10) || null, s(fd, "billing_note", 300) || null))) err = "invalid_date"; }
  else if (op === "credits") { if (!(await grantCredits(admin.userId, orgId, Number(fd.get("amount")), s(fd, "reason", 60) || "support"))) err = "invalid_amount"; }
  else if (op === "overrides") await setOverrides(admin.userId, orgId, { seats: Number(fd.get("seats")) || null, storage: Number(fd.get("storage")) || null, features: Object.fromEntries(["custom_domain", "white_label", "whatsapp_api", "api", "creative_posters"].map((k) => [k, fd.get(`f_${k}`) === "on"])) });
  else if (op === "purge") { if (!(await purgeAgency(admin.userId, orgId, s(fd, "confirm", 40)))) err = "confirm_mismatch"; else redirect(`/${locale}/platform?ok=purged`); }
  revalidatePath(`/${locale}/platform/${orgId}`);
  redirect(`/${locale}/platform/${orgId}${err ? `?err=${err}` : "?ok=saved"}`);
}
export async function startImpersonation(orgId: string, fd: FormData) {
  const locale = loc(fd); const admin = await requirePlatformAdmin(locale);
  if (!uuid.test(orgId)) redirect(`/${locale}/platform`);
  await logImpersonation(admin.userId, orgId, "start");
  (await cookies()).set(IMPERSONATE_COOKIE, orgId, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 1800 }); // session de support : 30 min
  redirect(`/${locale}`);
}
export async function stopImpersonation(fd: FormData) {
  const locale = loc(fd); const admin = await requirePlatformAdmin(locale);
  const store = await cookies(); const org = store.get(IMPERSONATE_COOKIE)?.value;
  if (org && uuid.test(org)) await logImpersonation(admin.userId, org, "stop");
  store.delete(IMPERSONATE_COOKIE);
  redirect(`/${locale}/platform`);
}
