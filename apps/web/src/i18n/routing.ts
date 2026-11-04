import { defineRouting } from "next-intl/routing";

export const locales = ["fr", "he", "en"] as const;
export type Locale = (typeof locales)[number];
export const rtlLocales: readonly Locale[] = ["he"];
export const isRtl = (l: string) => (rtlLocales as readonly string[]).includes(l);

export const routing = defineRouting({ locales, defaultLocale: "fr", localePrefix: "always" });
