"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCtx } from "@/lib/session";
import { RULES, runAutomationsNow, setAutomation, type Rule } from "@/lib/data/automations";

const loc = (fd: FormData) => (["fr", "he", "en"].includes(String(fd.get("locale"))) ? String(fd.get("locale")) : "fr");

export async function toggleAutomationAction(fd: FormData) {
  const locale = loc(fd);
  const ctx = await getCtx(locale);
  const rule = String(fd.get("rule")) as Rule;
  if (ctx.caps.has("org.manage") && !ctx.impersonating && (RULES as readonly string[]).includes(rule)) await setAutomation(ctx, rule, fd.get("on") === "1");
  revalidatePath(`/${locale}/automations`);
  redirect(`/${locale}/automations`);
}

export async function runAutomationsAction(fd: FormData) {
  const locale = loc(fd);
  const ctx = await getCtx(locale);
  const n = await runAutomationsNow(ctx);
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/automations?ran=${n}`);
}
