"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/session";
import { closeJob, processIntake, type IntakeOutcome } from "@/lib/intake/process";
import { parseContactForm, parsePropertyForm } from "@/lib/data/forms";
import { createContact, DuplicatePhoneError } from "@/lib/data/contacts";
import { createProperty } from "@/lib/data/properties";
import type { ContactFormState } from "../clients/actions";
import type { FormState } from "../properties/actions";

export type IntakeState = { error?: Extract<IntakeOutcome, { ok: false }>["error"] } | null;
const loc = (fd: FormData) => (["fr", "he", "en"].includes(String(fd.get("locale"))) ? String(fd.get("locale")) : "fr");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function startIntake(_prev: IntakeState, fd: FormData): Promise<IntakeState> {
  const locale = loc(fd);
  const ctx = await getCtx(locale);
  const mode = (["voice", "scan", "text"] as const).find((m) => m === fd.get("mode")) ?? "text";
  const target = fd.get("target") === "property" ? "property" : "contact";
  const audio = fd.get("audio"), image = fd.get("image");
  const out = await processIntake(ctx, {
    mode, target, locale, text: String(fd.get("text") ?? "").slice(0, 8000),
    audio: audio instanceof File && audio.size > 0 ? { data: Buffer.from(await audio.arrayBuffer()), mime: audio.type || "audio/webm" } : undefined,
    image: image instanceof File && image.size > 0 ? Buffer.from(await image.arrayBuffer()) : undefined,
  });
  if (!out.ok) return { error: out.error };
  redirect(`/${locale}/intake/${out.jobId}`);
}

export async function finishContactIntake(jobId: string, _p: ContactFormState, fd: FormData): Promise<ContactFormState> {
  const locale = loc(fd); const ctx = await getCtx(locale);
  if (!uuid.test(jobId) || !ctx.caps.has("contacts.write")) return { error: "forbidden" };
  const parsed = parseContactForm(fd);
  if (!parsed.ok) return { errors: parsed.errors };
  let id: string;
  try { id = await createContact(ctx, parsed.data); } catch (e) { if (e instanceof DuplicatePhoneError) return { errors: { phone: "duplicate_phone" }, duplicateId: e.existingId }; throw e; }
  await closeJob(ctx, jobId, "done", id);
  revalidatePath(`/${locale}/clients`);
  redirect(`/${locale}/clients/${id}`);
}

export async function finishPropertyIntake(jobId: string, _p: FormState, fd: FormData): Promise<FormState> {
  const locale = loc(fd); const ctx = await getCtx(locale);
  if (!uuid.test(jobId) || !ctx.caps.has("properties.write")) return { error: "forbidden" };
  const parsed = parsePropertyForm(fd);
  if (!parsed.ok) return { errors: parsed.errors };
  const id = await createProperty(ctx, parsed.data, locale);
  await closeJob(ctx, jobId, "done", id);
  revalidatePath(`/${locale}/properties`);
  redirect(`/${locale}/properties/${id}`);
}

export async function discardIntake(jobId: string, fd: FormData) {
  const locale = loc(fd); const ctx = await getCtx(locale);
  if (uuid.test(jobId)) await closeJob(ctx, jobId, "discarded");
  redirect(`/${locale}/intake`);
}
