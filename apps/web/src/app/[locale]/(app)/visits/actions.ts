"use server";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getCtx } from "@/lib/session";
import { saveDebrief, type Interest } from "@/lib/data/visits";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type DebriefState = { ok?: boolean; moved?: boolean; error?: string } | null;

export async function saveDebriefAction(visitId: string, name: string, _p: DebriefState, fd: FormData): Promise<DebriefState> {
  const l = String(fd.get("locale")); const locale = ["fr", "he", "en"].includes(l) ? l : "fr";
  if (!uuid.test(visitId)) return { error: "invalid" };
  const ctx = await getCtx(locale);
  const t = await getTranslations({ locale, namespace: "debrief" });
  let audio: { data: Buffer; ext: "webm" | "m4a" } | null = null;
  const f = fd.get("audio");
  if (f instanceof File && f.size > 0) {
    if (f.size > 10 * 1024 * 1024 || !/^audio\/(webm|mp4|x-m4a)/.test(f.type)) return { error: "audio" };
    audio = { data: Buffer.from(await f.arrayBuffer()), ext: f.type.includes("webm") ? "webm" : "m4a" };
  }
  const who = name.slice(0, 80);
  const r = await saveDebrief(ctx, visitId, { rating: Number(fd.get("rating")), interest: String(fd.get("interest")) as Interest, note: String(fd.get("note") ?? "").trim() || null, audio,
    titles: { followUp: t("task.followUp", { name: who }), otherProps: t("task.otherProps", { name: who }) } });
  if (!r.ok) return { error: r.error };
  for (const p of ["", "/agenda", "/deals", "/tasks"]) revalidatePath(`/${locale}${p}`);
  return { ok: true, moved: r.moved };
}
