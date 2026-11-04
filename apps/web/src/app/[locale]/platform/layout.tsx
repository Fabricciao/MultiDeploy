import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";
import { requirePlatformAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export default async function PlatformLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const admin = await requirePlatformAdmin(locale);
  const t = await getTranslations("platform");
  return (
    <div className="main">
      <header className="top"><span className="badge" style={{ background: "#111", color: "#fff" }}>{t("badge")}</span><Link href="/platform" style={{ fontWeight: 600 }}>{t("agencies")}</Link><div className="sp row" style={{ gap: 12 }}><span className="note">{admin.fullName}</span><LocaleSwitcher /></div></header>
      <main className="page" style={{ maxWidth: 1200, width: "100%", margin: "0 auto" }}>{children}</main>
    </div>
  );
}
