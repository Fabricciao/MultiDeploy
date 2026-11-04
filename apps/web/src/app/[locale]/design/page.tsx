import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { STEPS } from "@/lib/theme";

/** Banc d'essai interne du design system (FR/HE/EN, RTL, bidi). Pas de lien dans la navigation. */
export default async function DesignPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("design");
  const loc = await getLocale();
  const price = new Intl.NumberFormat(loc, { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(3_450_000);
  const rows = [
    { ref: "P-2026-0001", city: t("sample.city1"), rooms: "4", area: 112, price: 3_450_000, status: "active" },
    { ref: "P-2026-0002", city: t("sample.city2"), rooms: "3.5", area: 86, price: 2_190_000, status: "underOffer" },
    { ref: "P-2026-0003", city: t("sample.city3"), rooms: "5", area: 140, price: 5_100_000, status: "draft" },
  ];
  const fmt = (n: number) => new Intl.NumberFormat(loc, { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);
  return (
    <main className="mx-auto max-w-4xl space-y-10 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <LocaleSwitcher />
      </header>

      <section>
        <h2 className="mb-3 text-[13px] font-medium text-muted">{t("palette")}</h2>
        <div className="flex overflow-hidden rounded-ui border border-line">
          {STEPS.map((s) => (
            <div key={s} className="h-12 flex-1" style={{ background: `var(--brand-${s})` }} title={`brand-${s}`} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[13px] font-medium text-muted">{t("actions")}</h2>
        <div className="flex flex-wrap gap-2">
          <button className="h-8 rounded-ui bg-accent px-3 text-[13px] font-medium text-white hover:bg-accent-hover">{t("primary")}</button>
          <button className="h-8 rounded-ui border border-line-strong bg-surface px-3 text-[13px] font-medium hover:bg-sunken">{t("secondary")}</button>
          <button className="h-8 rounded-ui px-3 text-[13px] font-medium text-danger hover:bg-sunken">{t("destructive")}</button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[13px] font-medium text-muted">{t("bidi")}</h2>
        <div className="rounded-ui border border-line bg-surface p-4">
          <p>{t("bidiSentence", { price })}</p>
          <p className="mt-2">{t("phone")} : <span className="ltr-iso tabular">+972 50-123-4567</span></p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[13px] font-medium text-muted">{t("table")}</h2>
        <div className="overflow-x-auto rounded-ui border border-line bg-surface">
          <table className="w-full text-[13px]">
            <thead className="border-b border-line bg-sunken text-start text-[12px] text-muted">
              <tr>{["ref", "city", "rooms", "area", "price", "status"].map((c) => <th key={c} className="h-8 px-3 text-start font-medium">{t(`cols.${c}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ref} className="h-9 border-b border-line last:border-0 hover:bg-sunken">
                  <td className="px-3"><span className="ltr-iso tabular">{r.ref}</span></td>
                  <td className="px-3">{r.city}</td>
                  <td className="tabular px-3">{r.rooms}</td>
                  <td className="tabular px-3">{r.area} m²</td>
                  <td className="tabular px-3">{fmt(r.price)}</td>
                  <td className="px-3"><span className="rounded-full bg-accent-soft px-2 py-0.5 text-[12px] text-accent-ink">{t(`status.${r.status}`)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
