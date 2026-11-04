import { redirect } from "next/navigation";
export default async function SettingsIndex({ params }: { params: Promise<{ locale: string }> }) { redirect(`/${(await params).locale}/settings/brand`); }
