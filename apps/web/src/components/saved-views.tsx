import { getTranslations } from "next-intl/server";
import { Bookmark, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { saveViewAction, deleteViewAction } from "@/app/[locale]/(app)/views-actions";
import type { SavedView } from "@/lib/data/views";

export async function SavedViews({ scope, views, currentQs, locale, canShare }: { scope: "properties" | "contacts"; views: SavedView[]; currentQs: string; locale: string; canShare: boolean }) {
  const t = await getTranslations("views");
  const base = scope === "contacts" ? "/clients" : "/properties";
  return (
    <div className="row wrap" style={{ gap: 8, marginBottom: 10 }}>
      {views.map((v) => (
        <span key={v.id} className="chip" style={{ gap: 4 }}><Link href={`${base}?${v.qs}`}><Bookmark size={12} aria-hidden /> {v.name}{v.shared ? " ·" : ""}</Link>
          {v.mine && <form action={deleteViewAction.bind(null, v.id)} style={{ display: "inline" }}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="scope" value={scope} /><button aria-label={t("delete")} style={{ cursor: "pointer", opacity: 0.6 }}><X size={12} /></button></form>}</span>))}
      {currentQs && (
        <details className="pop"><summary className="chip dash"><Bookmark size={12} aria-hidden />{t("save")}</summary>
          <form action={saveViewAction} className="pop-body col" style={{ gap: 8 }}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="scope" value={scope} /><input type="hidden" name="qs" value={currentQs} />
            <input name="name" className="input" placeholder={t("name")} required maxLength={60} aria-label={t("name")} />
            {canShare && <label className="row" style={{ gap: 8 }}><input type="checkbox" className="ck" name="shared" />{t("share")}</label>}<button className="btn pri sm">{t("save")}</button></form></details>)}
    </div>
  );
}
