import { aiConfig } from "@/lib/ai/config";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCtx } from "@/lib/session";
import { listCities, cityName } from "@/lib/data/geo";
import { PropertyForm } from "@/components/property-form";
import { PageHeader } from "@/components/ui";
import { saveProperty } from "../actions";

export default async function NewPropertyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("props");
  const cities = (await listCities(ctx)).map((c) => ({ id: c.id, label: cityName(c, locale) }));
  return (<><PageHeader title={t("newTitle")} /><PropertyForm canTranslate={!!aiConfig().extract && ctx.caps.has("ai.use")} action={saveProperty.bind(null, null)} cities={cities} /></>);
}
