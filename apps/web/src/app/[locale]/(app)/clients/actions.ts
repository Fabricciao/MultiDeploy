"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/session";
import { parseContactForm, type FormErrors } from "@/lib/data/forms";
import { addNote, createContact, DuplicatePhoneError, updateContactCore } from "@/lib/data/contacts";
import { createDeal } from "@/lib/data/deals";
import { createTask, toggleTask } from "@/lib/data/today";

export type ContactFormState = { errors?: FormErrors; error?: string; duplicateId?: string } | null;
const loc = (fd: FormData) => (["fr", "he", "en"].includes(String(fd.get("locale"))) ? String(fd.get("locale")) : "fr");

export async function saveContact(id: string | null, _prev: ContactFormState, fd: FormData): Promise<ContactFormState> {
  const locale = loc(fd);
  const ctx = await getCtx(locale);
  if (!ctx.caps.has("contacts.write")) return { error: "forbidden" };
  const parsed = parseContactForm(fd);
  if (!parsed.ok) return { errors: parsed.errors };
  let target = id;
  try {
    if (id) {
      const { profile: _p, marketing_opt_in: _m, source_id: _s, ...core } = parsed.data;
      if (!(await updateContactCore(ctx, id, core))) return { error: "forbidden" };
    } else target = await createContact(ctx, parsed.data);
  } catch (e) {
    if (e instanceof DuplicatePhoneError) return { errors: { phone: "duplicate_phone" }, duplicateId: e.existingId };
    throw e;
  }
  revalidatePath(`/${locale}/clients`);
  redirect(`/${locale}/clients/${target}`);
}

export async function addNoteAction(contactId: string, fd: FormData) {
  const locale = loc(fd);
  const ctx = await getCtx(locale);
  const text = String(fd.get("text") ?? "").trim().slice(0, 2000);
  if (text) await addNote(ctx, contactId, text);
  revalidatePath(`/${locale}/clients/${contactId}`);
}

export async function addTaskAction(contactId: string, fd: FormData) {
  const locale = loc(fd);
  const ctx = await getCtx(locale);
  const title = String(fd.get("title") ?? "").trim().slice(0, 200);
  const due = String(fd.get("due") ?? "");
  if (title && ctx.caps.has("tasks.write")) await createTask(ctx, title, due && !Number.isNaN(Date.parse(due)) ? new Date(`${due}T17:00:00`).toISOString() : null, contactId);
  revalidatePath(`/${locale}`, "layout");
}

export async function toggleTaskAction(taskId: string, done: boolean, fd: FormData) {
  const locale = loc(fd);
  const ctx = await getCtx(locale);
  await toggleTask(ctx, taskId, done);
  revalidatePath(`/${locale}`, "layout");
}

export async function openDealAction(contactId: string, fd: FormData) {
  const locale = loc(fd);
  const ctx = await getCtx(locale);
  if (!ctx.caps.has("deals.write")) redirect(`/${locale}/clients/${contactId}`);
  const prop = String(fd.get("property") ?? "");
  const value = Number(fd.get("value") ?? "");
  await createDeal(ctx, contactId, /^[0-9a-f-]{36}$/i.test(prop) ? prop : null, Number.isFinite(value) && value > 0 ? value : null);
  revalidatePath(`/${locale}/deals`);
  redirect(`/${locale}/deals`);
}

export async function anonymizeAction(contactId: string, fd: FormData) {
  const locale = loc(fd);
  const ctx = await getCtx(locale);
  if (!ctx.caps.has("contacts.delete") || ctx.impersonating || fd.get("confirm") !== "on" || !/^[0-9a-f-]{36}$/i.test(contactId)) redirect(`/${locale}/clients/${contactId}?err=erase`);
  const { db } = await import("@/lib/session");
  try { await db(ctx, (tx) => tx`select public.anonymize_contact(${contactId})`); } catch { redirect(`/${locale}/clients/${contactId}?err=erase`); }
  revalidatePath(`/${locale}/clients`);
  redirect(`/${locale}/clients`);
}
