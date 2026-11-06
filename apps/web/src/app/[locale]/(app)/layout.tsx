import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Sidebar } from "@/components/sidebar";
import { DevUserSwitcher } from "@/components/dev-user-switcher";
import { Crumbs, HelpButton, MobileNav, NewMenu, Shortcuts, ThemeToggle } from "@/components/shell";
import { listViews } from "@/lib/data/views";
import { cookies } from "next/headers";
import { CommandPalette, PaletteButton } from "@/components/command-palette";
import { getCtx, db } from "@/lib/session";
import { pickName } from "@/lib/data/types";
import { getBrandKit } from "@/lib/data/brand";
import { avatarSrc } from "@/lib/data/profile-input";
import { themeCss } from "@/lib/theme";
import { stopImpersonation } from "../platform/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations();
  const counts = await db(ctx, async (tx) => {
    const [r] = await tx`select (select count(*) from public.properties where deleted_at is null) as p, (select count(*) from public.contacts where deleted_at is null) as c, (select avatar_url from public.profiles where id = ${ctx.userId}) as avatar`;
    return { properties: Number(r!.p), clients: Number(r!.c), avatar: (r!.avatar as string | null) ?? null };
  });
  const brand = await getBrandKit(ctx);
  const [vp, vc] = await Promise.all([listViews(ctx, "properties"), listViews(ctx, "contacts")]);
  const views = [...vp.map((v) => ({ id: v.id, name: v.name, href: `/properties?${v.qs}` })), ...vc.map((v) => ({ id: v.id, name: v.name, href: `/clients?${v.qs}` }))];
  const mini = (await cookies()).get("rail")?.value === "mini";
  return (
    <div className="app">
      <style dangerouslySetInnerHTML={{ __html: themeCss(brand.colors.primary, brand.style.radius, brand.style.density) }} />
      <Sidebar orgName={pickName(ctx.orgName, locale) || "—"} logoUrl={brand.logo_path ? `/api/files/${brand.logo_path}` : null} userName={ctx.fullName} avatarUrl={avatarSrc(counts.avatar)} roleLabel={t(`roles.${ctx.role}`)} counts={{ properties: counts.properties, clients: counts.clients }} views={views} mini={mini} />
      <div className="main">
        {ctx.impersonating && (
          <form action={stopImpersonation} role="status" className="banner bad" style={{ borderRadius: 0, gap: 12, fontWeight: 500 }}>
            <input type="hidden" name="locale" value={locale} />{t("support.banner", { name: pickName(ctx.orgName, locale) })}<button className="btn sm sp" >{t("support.exit")}</button>
          </form>
        )}
        <header className="top">
          <Crumbs />
          <PaletteButton label={t("common.search")} />
          <DevUserSwitcher current={ctx.userId} />
          <HelpButton label={t("common.help")} />
          <ThemeToggle />
          <LocaleSwitcher />
          <NewMenu />
        </header>
        <main className="page">{children}</main>
        <CommandPalette />
        <Shortcuts />
        <MobileNav />
      </div>
    </div>
  );
}
