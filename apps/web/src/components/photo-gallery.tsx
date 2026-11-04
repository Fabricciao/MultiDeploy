"use client";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Star, Trash2, Upload } from "lucide-react";
import { Photo } from "@/components/ui";
import { deletePhotoAction, setCoverAction, uploadPhotos, type UploadState } from "@/app/[locale]/(app)/properties/media-actions";

export type GalleryItem = { id: string; url: string; isCover: boolean };

export function PhotoGallery({ propertyId, items, canEdit, seed }: { propertyId: string; items: GalleryItem[]; canEdit: boolean; seed: string }) {
  const t = useTranslations("media");
  const locale = useLocale();
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadPhotos.bind(null, propertyId), null);
  const main = items[0];
  const rest = items.slice(1, 5);
  return (
    <div className="card" style={{ padding: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: rest.length ? "2fr 1fr 1fr" : "1fr", gridTemplateRows: rest.length ? "140px 140px" : "260px", gap: 6, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ gridRow: rest.length ? "span 2" : undefined }}>{main ? <img src={main.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <Photo seed={seed} />}</div>
        {rest.map((p) => <div key={p.id}><img src={p.url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div>)}
      </div>
      {items.length === 0 && <p className="note" style={{ padding: "8px 6px 2px" }}>{t("empty")}</p>}
      {canEdit && (
        <div className="col" style={{ gap: 8, padding: "10px 6px 4px" }}>
          {items.length > 0 && (
            <div className="row wrap" style={{ gap: 8 }}>
              {items.map((p) => (
                <div key={p.id} style={{ position: "relative", width: 72, height: 54, borderRadius: 6, overflow: "hidden", outline: p.isCover ? "2px solid var(--accent)" : "1px solid var(--line)" }}>
                  <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: "auto 0 0 0", display: "flex", justifyContent: "space-between", background: "rgb(0 0 0/.5)" }}>
                    <form action={setCoverAction.bind(null, propertyId, p.id)}><input type="hidden" name="locale" value={locale} /><button title={t("cover")} aria-label={t("cover")} style={{ color: p.isCover ? "#ffd24a" : "#fff", padding: 2, cursor: "pointer" }}><Star size={13} fill={p.isCover ? "#ffd24a" : "none"} /></button></form>
                    <form action={deletePhotoAction.bind(null, propertyId, p.id)}><input type="hidden" name="locale" value={locale} /><button title={t("delete")} aria-label={t("delete")} style={{ color: "#fff", padding: 2, cursor: "pointer" }}><Trash2 size={13} /></button></form>
                  </div>
                </div>
              ))}
            </div>
          )}
          <form action={action} className="row wrap" style={{ gap: 8 }}>
            <input type="hidden" name="locale" value={locale} />
            <input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple className="input" style={{ maxWidth: 340, height: "auto", padding: 5 }} aria-label={t("choose")} />
            <button className="btn sm" disabled={pending}><Upload size={14} aria-hidden />{pending ? t("uploading") : t("upload")}</button>
          </form>
          {state && (state.errors?.length || state.ok === false) && !pending ? <div className="err" role="alert">{state.errors?.length ? state.errors.map((e) => `${e.name}: ${t(`errors.${e.code}`)}`).join(" · ") : t("errors.none")}</div> : null}
          {state?.ok && <div className="note" role="status">{t("added", { count: state.added ?? 0 })}</div>}
          <p className="note">{t("hint")}</p>
        </div>
      )}
    </div>
  );
}
