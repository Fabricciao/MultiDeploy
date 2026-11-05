import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const TABS = [
  { key: "brand", href: "/settings/brand", cap: "brand.manage" },
  { key: "team", href: "/settings/team", cap: "members.manage" },
  { key: "plan", href: "/settings/plan", cap: "billing.manage" },
  { key: "integrations", href: "/settings/integrations", cap: "api.manage" },
  { key: "connections", href: "/settings/connections", cap: "org.manage" },
  { key: "audit", href: "/settings/audit", cap: "audit.read" },
  { key: "data", href: "/settings/data", cap: "exports.run" },
] as const;

export async function SettingsNav({ active, caps }: { active: string; caps: string[] }) {
  const t = await getTranslations("settings");
  return (
    <div className="tabs" role="navigation" aria-label={t("title")}>
      {TABS.filter((x) => caps.includes(x.cap)).map((x) => <Link key={x.key} href={x.href} className={active === x.key ? "on" : ""} aria-current={active === x.key ? "page" : undefined}>{t(`tabs.${x.key}`)}</Link>)}
    </div>
  );
}
