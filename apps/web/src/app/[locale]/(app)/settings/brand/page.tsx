import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCtx } from "@/lib/session";
import { getBrandKit } from "@/lib/data/brand";
import { BrandEditor } from "@/components/brand-editor";
import { PageHeader } from "@/components/ui";
import { SettingsNav } from "@/components/settings-nav";

export default async function BrandPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("brand");
  if (!ctx.caps.has("brand.manage")) return (<><PageHeader title={t("title")} /><SettingsNav active="brand" caps={[...ctx.caps]} /><p className="muted">{t("forbidden")}</p></>);
  const kit = await getBrandKit(ctx);
  return (<><PageHeader title={t("title")} sub={t("sub")} /><SettingsNav active="brand" caps={[...ctx.caps]} /><BrandEditor initial={kit} logoUrl={kit.logo_path ? `/api/files/${kit.logo_path}` : null} /></>);
}
