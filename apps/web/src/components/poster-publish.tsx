"use client";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { publishPosterAction, type PublishState } from "@/app/[locale]/(app)/properties/[id]/poster/publish-action";

export function PosterPublish({ posterId, target }: { posterId: string; target: "facebook" | "instagram" }) {
  const t = useTranslations("poster"); const locale = useLocale();
  const [s, action, pending] = useActionState<PublishState, FormData>(publishPosterAction.bind(null, posterId, target), null);
  return (
    <form action={action} className="col" style={{ gap: 4 }}>
      <input type="hidden" name="locale" value={locale} />
      <input name="caption" className="input" maxLength={2000} placeholder={t("captionPlaceholder")} aria-label={t("caption")} />
      <button className="btn sm" disabled={pending || s?.ok}>{pending ? t("publishing") : s?.ok ? t("published") : t(target === "facebook" ? "publishFacebook" : "publishInstagram")}</button>
      {s?.error && <span role="alert" className="err note">{t(`publishErrors.${s.error}`)}</span>}
    </form>
  );
}
