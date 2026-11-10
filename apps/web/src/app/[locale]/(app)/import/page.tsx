import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCtx } from "@/lib/session";
import { ImportWizard } from "@/components/import-wizard";
import { PageHeader } from "@/components/ui";
import { SiteImport } from "@/components/site-import";
import { listCities, cityName } from "@/lib/data/geo";

export default async function ImportPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ target?: string }> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const canSite = ctx.caps.has("properties.write") && !ctx.impersonating;
  const cities = canSite ? Object.fromEntries((await listCities(ctx)).map((c) => [c.id, cityName(c, locale)])) : {};
  const t = await getTranslations("import");
  return (<><PageHeader title={t("title")} sub={t("sub")} />{canSite && <div style={{ marginBlockEnd: 16 }}><SiteImport cities={cities} /></div>}<ImportWizard defaultTarget={sp.target === "properties" ? "properties" : "contacts"} /></>);
}
