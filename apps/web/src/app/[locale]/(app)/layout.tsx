import { getTranslations, setRequestLocale } from "next-intl/server";
import { Search } from "lucide-react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Sidebar } from "@/components/sidebar";
import { DevUserSwitcher } from "@/components/dev-user-switcher";
import { NewMenu } from "@/components/new-menu";
import { getCtx, db } from "@/lib/session";
import { pickName } from "@/lib/data/types";
import { getBrandKit } from "@/lib/data/brand";
import { themeCss } from "@/lib/theme";
import { stopImpersonation } from "../platform/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations();
  const counts = await db(ctx, async (tx) => {
    const [r] = await tx`select (select count(*) from public.properties where deleted_at is null) as p, (select count(*) from public.contacts where deleted_at is null) as c`;
    return { properties: Number(r!.p), clients: Number(r!.c) };
  });
  const brand = await getBrandKit(ctx);
  return (
    <div className="app">
      <style dangerouslySetInnerHTML={{ __html: themeCss(brand.colors.primary, brand.style.radius, brand.style.density) }} />
      <Sidebar orgName={pickName(ctx.orgName, locale) || "—"} userName={ctx.fullName} roleLabel={t(`roles.${ctx.role}`)} counts={counts} />
      <div className="main">
        {ctx.impersonating && (
          <form action={stopImpersonation} role="status" className="row" style={{ background: "var(--bad)", color: "#fff", padding: "8px 20px", gap: 12, fontWeight: 500 }}>
            <input type="hidden" name="locale" value={locale} />{t("support.banner", { name: pickName(ctx.orgName, locale) })}<button className="btn sm sp" style={{ color: "var(--ink)" }}>{t("support.exit")}</button>
          </form>
        )}
        <header className="top">
          <form action={`/${locale}/properties`} className="search" role="search">
            <Search size={14} aria-hidden />
            <input name="q" placeholder={t("common.search")} aria-label={t("common.search")} className="grow" style={{ border: 0, outline: 0, background: "transparent", minWidth: 0 }} />
          </form>
          <div className="sp row" style={{ gap: 12 }}>
            <DevUserSwitcher current={ctx.userId} />
            <LocaleSwitcher />
            <NewMenu />
          </div>
        </header>
        <main className="page">{children}</main>
      </div>
    </div>
  );
}
