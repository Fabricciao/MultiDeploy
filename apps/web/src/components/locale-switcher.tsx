"use client";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales } from "@/i18n/routing";

const LABEL: Record<string, string> = { fr: "FR", he: "עב", en: "EN" };

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  return (
    <div role="group" aria-label={t("language")} className="inline-flex rounded-ui border border-line bg-surface p-0.5">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === locale}
          onClick={() => router.replace(pathname, { locale: l })}
          className={`h-7 min-w-9 rounded-[calc(var(--radius)-2px)] px-2 text-xs font-medium transition-colors ${
            l === locale ? "bg-accent text-white" : "text-muted hover:text-ink"
          }`}
        >
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
