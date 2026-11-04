import { setRequestLocale, getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center gap-3 border-b border-line bg-surface px-4">
          <button type="button" disabled className="flex h-8 w-full max-w-sm items-center gap-2 rounded-ui border border-line bg-bg px-2.5 text-start text-[13px] text-muted">
            <Search size={14} aria-hidden /> <span className="flex-1">{t("search")}</span>
            <kbd className="ltr-iso rounded border border-line px-1 text-[11px]">Ctrl K</kbd>
          </button>
          <div className="ms-auto"><LocaleSwitcher /></div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
