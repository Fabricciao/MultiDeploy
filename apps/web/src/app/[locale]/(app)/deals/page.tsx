import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCtx } from "@/lib/session";
import { getBoard } from "@/lib/data/deals";
import { contactName } from "@/lib/data/contacts";
import { cityName } from "@/lib/data/geo";
import { pickName } from "@/lib/data/types";
import { initials, money } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { DealBoard } from "@/components/deal-board";

export default async function DealsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("deals");
  const { stages, deals } = await getBoard(ctx);
  const open = stages.filter((s) => s.kind === "open");
  const weighted = deals.reduce((a, d) => a + Number(d.value ?? 0) * ((stages.find((s) => s.id === d.stage_id)?.probability ?? 0) / 100), 0);
  const won = deals.filter((d) => stages.find((s) => s.id === d.stage_id)?.kind === "won");
  return (
    <>
      <PageHeader title={t("title")} sub={t("sub", { count: deals.filter((d) => open.some((s) => s.id === d.stage_id)).length, weighted: money(locale, weighted) })} />
      <DealBoard canMove={ctx.caps.has("deals.write")}
        stages={stages.filter((s) => s.kind !== "lost").map((s) => ({ id: s.id, name: pickName(s.name, locale), kind: s.kind, probability: s.probability }))}
        deals={deals.filter((d) => stages.find((s) => s.id === d.stage_id)?.kind !== "lost").map((d) => ({
          id: d.id, stageId: d.stage_id, contactId: d.contact_id, client: contactName(d, locale), value: d.value ? Number(d.value) : null, agent: initials(d.agent_name ?? ""),
          sub: d.reference ? `${d.reference} · ${cityName({ name_fr: d.city_fr, name_he: d.city_he, name_en: d.city_en }, locale)}` : t("noProperty"),
        }))} />
      {won.length > 0 && <p className="note" style={{ marginTop: 12 }}>{t("wonLine", { count: won.length, value: money(locale, won.reduce((a, d) => a + Number(d.value ?? 0), 0)) })}</p>}
    </>
  );
}
