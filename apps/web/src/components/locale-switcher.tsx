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
    <div role="group" aria-label={t("language")} className="seg">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === locale}
          onClick={() => router.replace(pathname, { locale: l })}
          className={l === locale ? "on" : ""}
        >
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
