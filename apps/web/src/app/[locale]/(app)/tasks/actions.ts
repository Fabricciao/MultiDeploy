"use server";
import { revalidatePath } from "next/cache";
import { getCtx, db } from "@/lib/session";
import { createTask, deleteTask, toggleTask } from "@/lib/data/today";
import { parseDue } from "@/lib/calendar/due";
import { getUserTokens, saveUserTokens } from "@/lib/data/connections";

const loc = (fd: FormData) => (["fr", "he", "en"].includes(String(fd.get("locale"))) ? String(fd.get("locale")) : "fr");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const id = (fd: FormData, k: string) => { const v = String(fd.get(k) ?? ""); return uuid.test(v) ? v : null; };

/** Création d'une tâche depuis n'importe quel écran (Aujourd'hui, Tâches, fiche client, fiche bien, menu Nouveau). */
export async function addTaskFormAction(fd: FormData) {
  const locale = loc(fd);
  const ctx = await getCtx(locale);
  const title = String(fd.get("title") ?? "").trim().slice(0, 200);
  if (!title || !ctx.caps.has("tasks.write")) return;
  const { at, timed } = parseDue(String(fd.get("due") ?? ""), String(fd.get("time") ?? ""));
  const contactId = id(fd, "contact"), propertyId = id(fd, "property");
  const taskId = await createTask(ctx, title, at?.toISOString() ?? null, contactId, { propertyId, assigneeId: id(fd, "assignee"), dealId: id(fd, "deal") });
  // Agenda Google personnel (si connecté et heure précisée) : copie « au mieux », un échec n'empêche jamais la tâche d'exister.
  if (taskId && at && timed && fd.get("calendar") !== "off") {
    try {
      const tokens = await getUserTokens(ctx.userId, "google_calendar");
      if (tokens) {
        const { freshTokens, insertEvent } = await import("@/lib/integrations/google");
        const t2 = await freshTokens(tokens); if (t2.access_token !== tokens.access_token) await saveUserTokens(ctx.userId, "google_calendar", t2);
        const [c] = contactId ? await db(ctx, (tx) => tx`select coalesce(nullif(concat_ws(' ', first_name, last_name), ''), concat_ws(' ', first_name_he, last_name_he)) as n from public.contacts where id = ${contactId}`) : [];
        await insertEvent(t2, { summary: `${title}${c?.n ? ` · ${c.n}` : ""}`, start: at, end: new Date(at.getTime() + 30 * 60_000) });
      }
    } catch { /* connexion Google expirée ou indisponible */ }
  }
  revalidatePath(`/${locale}`, "layout");
}

export async function toggleTaskFormAction(taskId: string, done: boolean, fd: FormData) {
  const locale = loc(fd);
  const ctx = await getCtx(locale);
  if (uuid.test(taskId)) await toggleTask(ctx, taskId, done);
  revalidatePath(`/${locale}`, "layout");
}

export async function deleteTaskFormAction(taskId: string, fd: FormData) {
  const locale = loc(fd);
  const ctx = await getCtx(locale);
  if (uuid.test(taskId)) await deleteTask(ctx, taskId);
  revalidatePath(`/${locale}`, "layout");
}
