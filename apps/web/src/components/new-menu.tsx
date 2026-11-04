import { getTranslations } from "next-intl/server";
import { ChevronDown, House, Plus, UserPlus } from "lucide-react";
import { Link } from "@/i18n/navigation";

export async function NewMenu() {
  const t = await getTranslations("common");
  return (
    <details className="pop">
      <summary className="btn pri"><Plus size={15} aria-hidden />{t("new")}<ChevronDown size={13} aria-hidden /></summary>
      <div className="pop-body" style={{ minWidth: 200, padding: 6, insetInlineStart: "auto", insetInlineEnd: 0 }}>
        <Link href="/clients/new" className="nav"><UserPlus size={16} aria-hidden />{t("newClient")}</Link>
        <Link href="/properties/new" className="nav"><House size={16} aria-hidden />{t("newProperty")}</Link>
      </div>
    </details>
  );
}
