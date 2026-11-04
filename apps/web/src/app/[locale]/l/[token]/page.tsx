import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getPublicListing } from "@/lib/data/shares";
import { PublicView } from "@/components/public-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function PublicListingPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const data = await getPublicListing(token);
  if (!data) notFound();
  return <PublicView locale={locale} token={token} data={data} />;
}
