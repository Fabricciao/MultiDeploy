import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCtx } from "@/lib/session";
import { listCities, cityName } from "@/lib/data/geo";
import { getProperty } from "@/lib/data/properties";
import { PropertyForm } from "@/components/property-form";
import { PageHeader } from "@/components/ui";
import { saveProperty } from "../../actions";

export default async function EditPropertyPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("props");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getProperty(ctx, id);
  if (!data) notFound();
  const cities = (await listCities(ctx)).map((c) => ({ id: c.id, label: cityName(c, locale) }));
  const translations = Object.fromEntries(data.translations.map((x) => [x.locale, x]));
  return (<><PageHeader title={t("editTitle")} /><PropertyForm action={saveProperty.bind(null, id)} cities={cities} d={{ ...data.p, translations }} /></>);
}
