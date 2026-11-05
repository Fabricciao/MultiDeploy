"use server";
import { redirect } from "next/navigation";
import { getCtx } from "@/lib/session";
import { deleteView, saveView } from "@/lib/data/views";

const loc = (fd: FormData) => (["fr", "he", "en"].includes(String(fd.get("locale"))) ? String(fd.get("locale")) : "fr");
export async function saveViewAction(fd: FormData) {
  const locale = loc(fd); const ctx = await getCtx(locale);
  const scope = fd.get("scope") === "contacts" ? "contacts" : "properties";
  await saveView(ctx, scope, String(fd.get("name") ?? ""), String(fd.get("qs") ?? ""), fd.get("shared") === "on");
  redirect(`/${locale}/${scope === "contacts" ? "clients" : "properties"}?${String(fd.get("qs") ?? "").replace(/^\?/, "")}`);
}
export async function deleteViewAction(id: string, fd: FormData) {
  const locale = loc(fd); const ctx = await getCtx(locale);
  const scope = fd.get("scope") === "contacts" ? "clients" : "properties";
  if (/^[0-9a-f-]{36}$/i.test(id)) await deleteView(ctx, id);
  redirect(`/${locale}/${scope}`);
}
