import { getTranslations } from "next-intl/server";
import { ChevronDown, House, Mic, Plus, ScanLine, UserPlus } from "lucide-react";
import { Link } from "@/i18n/navigation";

export async function NewMenu() {
  const t = await getTranslations("common");
  return (
    <details className="pop">
      <summary className="btn pri"><Plus size={15} aria-hidden />{t("new")}<ChevronDown size={13} aria-hidden /></summary>
      <div className="pop-body" style={{ minWidth: 200, padding: 6, insetInlineStart: "auto", insetInlineEnd: 0 }}>
        <Link href="/intake?mode=voice&target=contact" className="nav" style={{ fontWeight: 500 }}><Mic size={16} aria-hidden />{t("dictate")}</Link>
        <Link href="/intake?mode=scan&target=contact" className="nav"><ScanLine size={16} aria-hidden />{t("scan")}</Link>
        <Link href="/clients/new" className="nav"><UserPlus size={16} aria-hidden />{t("newClient")}</Link>
        <Link href="/properties/new" className="nav"><House size={16} aria-hidden />{t("newProperty")}</Link>
      </div>
    </details>
  );
}
