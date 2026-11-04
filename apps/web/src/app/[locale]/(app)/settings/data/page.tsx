import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download } from "lucide-react";
import { getCtx } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { SettingsNav } from "@/components/settings-nav";

export default async function DataPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("data");
  if (!ctx.caps.has("exports.run")) return (<><PageHeader title={t("title")} /><SettingsNav active="data" caps={[...ctx.caps]} /><p className="muted">{t("forbidden")}</p></>);
  return (
    <>
      <PageHeader title={t("title")} sub={t("sub")} /><SettingsNav active="data" caps={[...ctx.caps]} />
      <div className="card" style={{ maxWidth: 640 }}><div className="card-b col" style={{ gap: 12 }}>
        <p>{t("exportText")}</p>
        <a className="btn pri" href="/api/export" style={{ alignSelf: "flex-start" }}><Download size={15} aria-hidden />{t("exportBtn")}</a>
        <p className="note">{t("rights")}</p>
      </div></div>
    </>
  );
}
