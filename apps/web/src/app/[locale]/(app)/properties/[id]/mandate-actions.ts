"use server";
import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/session";
import { cancelMandate, createMandate, sendMandateEmail, type MandateError } from "@/lib/data/mandates";
import { siteBase } from "@/lib/data/slips";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const loc = (fd: FormData) => { const l = String(fd.get("locale")); return ["fr", "he", "en"].includes(l) ? l : "fr"; };
export type MandateFormState = { ok?: boolean; error?: MandateError } | null;
export type MandateEmailState = { status: "sent" | "dry_run" | "failed" | "no_email" | "forbidden" } | null;

export async function createMandateAction(propertyId: string, _p: MandateFormState, fd: FormData): Promise<MandateFormState> {
  const locale = loc(fd); if (!uuid.test(propertyId)) return { error: "invalid" };
  const ctx = await getCtx(locale);
  const contact = String(fd.get("contact") ?? ""), price = String(fd.get("price") ?? "").trim();
  const r = await createMandate(ctx, { propertyId, contactId: uuid.test(contact) ? contact : null, ownerName: String(fd.get("owner_name") ?? ""), license: String(fd.get("license") ?? "") || null,
    startsOn: String(fd.get("starts_on") ?? ""), endsOn: String(fd.get("ends_on") ?? ""), price: price ? Number(price) : null, commission: Number(String(fd.get("commission") ?? "").replace(",", ".")), actions: fd.getAll("actions").map(String) });
  if ("error" in r) return { error: r.error };
  revalidatePath(`/${locale}/properties/${propertyId}`);
  return { ok: true };
}
export async function cancelMandateAction(propertyId: string, id: string, fd: FormData) {
  const locale = loc(fd);
  if (uuid.test(id)) await cancelMandate(await getCtx(locale), id);
  revalidatePath(`/${locale}/properties/${propertyId}`);
}
export async function sendMandateEmailAction(id: string, _p: MandateEmailState, fd: FormData): Promise<MandateEmailState> {
  const locale = loc(fd); if (!uuid.test(id)) return { status: "forbidden" };
  const status = await sendMandateEmail(await getCtx(locale), id, await siteBase());
  return { status };
}
