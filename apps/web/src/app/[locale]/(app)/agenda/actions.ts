"use server";
import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/session";
import { createVisit, setVisitStatus } from "@/lib/data/visits";
import { jerusalemToDate } from "@/lib/calendar/week";
import { quietReason } from "@/lib/calendar/jewish";

export type VisitState = { ok?: boolean; error?: string; warning?: { kind: string; key?: string } } | null;
const loc = (fd: FormData) => (["fr", "he", "en"].includes(String(fd.get("locale"))) ? String(fd.get("locale")) : "fr");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createVisitAction(_p: VisitState, fd: FormData): Promise<VisitState> {
  const locale = loc(fd); const ctx = await getCtx(locale);
  const property = String(fd.get("property")), contact = String(fd.get("contact") || "");
  const startsAt = jerusalemToDate(String(fd.get("starts_at") ?? ""));
  if (!uuid.test(property) || !startsAt || (contact && !uuid.test(contact))) return { error: "invalid" };
  const quiet = quietReason(startsAt);
  if (quiet && fd.get("force") !== "on") return { warning: quiet }; // Chabbat / fête / veille : confirmation explicite requise
  const r = await createVisit(ctx, { propertyId: property, contactId: contact || null, startsAt, minutes: Number(fd.get("minutes")) || 30 });
  if (r.error) return { error: r.error };
  revalidatePath(`/${locale}/agenda`); revalidatePath(`/${locale}`);
  return { ok: true };
}
export async function visitStatusAction(id: string, status: "done" | "cancelled" | "no_show" | "planned", fd: FormData) {
  const locale = loc(fd); const ctx = await getCtx(locale);
  if (uuid.test(id)) await setVisitStatus(ctx, id, status);
  revalidatePath(`/${locale}/agenda`);
}
