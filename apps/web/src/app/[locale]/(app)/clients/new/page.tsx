import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCtx } from "@/lib/session";
import { listCities, cityName } from "@/lib/data/geo";
import { listSources } from "@/lib/data/contacts";
import { pickName } from "@/lib/data/types";
import { ContactForm } from "@/components/contact-form";
import { PageHeader } from "@/components/ui";
import { saveContact } from "../actions";

export default async function NewClientPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("clients");
  const [cities, sources] = await Promise.all([listCities(ctx), listSources(ctx)]);
  return (<><PageHeader title={t("newTitle")} /><ContactForm action={saveContact.bind(null, null)} cities={cities.map((c) => ({ id: c.id, label: cityName(c, locale) }))} sources={sources.map((s) => ({ id: s.id, label: pickName(s.name, locale) }))} /></>);
}
