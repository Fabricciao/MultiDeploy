import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function TodayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("today");
  const blocks = ["tasks", "visits", "followups", "mandates"] as const;
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-1 text-muted">{t("subtitle")}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {blocks.map((b) => (
          <section key={b} className="rounded-ui border border-line bg-surface">
            <h2 className="border-b border-line px-4 py-2.5 text-[13px] font-medium">{t(`${b}.title`)}</h2>
            <p className="px-4 py-8 text-muted">{t(`${b}.empty`)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
