import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCtx } from "@/lib/session";
import { getProperty } from "@/lib/data/properties";
import { getBrandKit } from "@/lib/data/brand";
import { listMedia } from "@/lib/data/media";
import { aiBalance, levelAvailable, levelCost, listPosters } from "@/lib/data/posters";
import { dateShort } from "@/lib/format";
import { listConnections } from "@/lib/data/connections";
import { PageHeader } from "@/components/ui";
import { PosterForm } from "@/components/poster-form";

export default async function PosterPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("poster");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getProperty(ctx, id);
  if (!data) notFound();
  const [brand, media, history, balance] = await Promise.all([getBrandKit(ctx), listMedia(ctx, id), listPosters(ctx, id), aiBalance(ctx).catch(() => 0)]);
  const conns = ctx.caps.has("posters.create") && !ctx.impersonating ? await listConnections(ctx).catch(() => []) : [];
  const social = { facebook: conns.some((c) => c.provider === "facebook" && c.status === "connected"), instagram: conns.some((c) => c.provider === "instagram" && c.status === "connected") };
  const title = data.translations.find((x) => x.locale === locale)?.title ?? data.translations[0]?.title ?? data.p.reference;
  return (
    <>
      <PageHeader title={t("title")} sub={`${title} · ${data.p.reference}`} />
      <PosterForm social={social} propertyId={id} balance={balance} hasLegal={!!brand.legal_footer.fr || !!brand.legal_footer.he || !!brand.legal_footer.en} hasPhoto={media.length > 0}
        available={{ faithful: true, enhanced: levelAvailable("enhanced"), creative: levelAvailable("creative") }} costs={{ faithful: levelCost("faithful"), enhanced: levelCost("enhanced"), creative: levelCost("creative") }}
        history={history.map((h) => ({ id: h.id, key: h.output_path, format: h.format, locale: h.locale, level: h.level, width: h.width, height: h.height, when: dateShort(locale, h.created_at) }))} />
    </>
  );
}
