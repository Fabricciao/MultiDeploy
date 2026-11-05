import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCtx } from "@/lib/session";
import { ImportWizard } from "@/components/import-wizard";
import { PageHeader } from "@/components/ui";

export default async function ImportPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ target?: string }> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  await getCtx(locale);
  const t = await getTranslations("import");
  return (<><PageHeader title={t("title")} sub={t("sub")} /><ImportWizard defaultTarget={sp.target === "properties" ? "properties" : "contacts"} /></>);
}
