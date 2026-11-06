import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isRtl, routing } from "@/i18n/routing";
import { themeCss } from "@/lib/theme";
import { SwRegister } from "@/components/sw-register";
import "../globals.css";

export const viewport: Viewport = { themeColor: "#0A2430", width: "device-width", initialScale: 1 };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: { default: t("title"), template: `%s · ${t("title")}` }, description: t("description"), robots: { index: false }, manifest: "/manifest.webmanifest", icons: { icon: [{ url: "/icons/favicon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" }, appleWebApp: { capable: true, title: "NadlanHub", statusBarStyle: "default" } };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const css = themeCss(null, 6);
  const saved = (await cookies()).get("theme")?.value;
  const theme = saved === "dark" || saved === "light" ? saved : undefined;
  return (
    <html lang={locale} dir={isRtl(locale) ? "rtl" : "ltr"} data-theme={theme}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <SwRegister />
      </body>
    </html>
  );
}
