import { redirect } from "next/navigation";
import { getCtx } from "@/lib/session";
/** Première rubrique accessible : la charte pour ceux qui la gèrent, sinon « Connexions » (personnelles, ouvertes à tous). */
export default async function SettingsIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; const ctx = await getCtx(locale);
  redirect(`/${locale}/settings/${ctx.caps.has("brand.manage") ? "brand" : "connections"}`);
}
