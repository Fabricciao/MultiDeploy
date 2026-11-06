import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCtx } from "@/lib/session";
import { getProfile } from "@/lib/data/profile";
import { avatarSrc } from "@/lib/data/profile-input";
import { initials } from "@/lib/format";
import { Avatar, PageHeader } from "@/components/ui";
import { SettingsNav } from "@/components/settings-nav";
import { saveProfileAction } from "./actions";

const ERRORS = ["name_required", "phone_invalid", "avatar_too_large", "avatar_invalid", "forbidden"];

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ err?: string; ok?: string }> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("profile");
  const p = await getProfile(ctx);
  const src = avatarSrc(p.avatarUrl);
  const readOnly = ctx.impersonating;
  return (
    <>
      <PageHeader title={t("title")} sub={t("sub")} />
      <SettingsNav active="profile" caps={[...ctx.caps]} />
      {sp.err && <div role="alert" className="card card-b err" style={{ marginBottom: 12 }}>{t(`errors.${ERRORS.includes(sp.err) ? sp.err : "forbidden"}`)}</div>}
      {sp.ok && <div role="status" className="card card-b" style={{ marginBottom: 12, color: "var(--ok)" }}>{t("saved")}</div>}
      <form action={saveProfileAction} className="card" style={{ maxWidth: 560 }}>
        <input type="hidden" name="locale" value={locale} />
        <div className="card-b col" style={{ gap: 16 }}>
          <div className="row" style={{ gap: 16, alignItems: "center" }}>
            <Avatar cls="xl" text={initials(p.fullName || p.email || "?")} src={src} />
            <div className="col" style={{ gap: 6 }}>
              <label className="note" htmlFor="avatar">{t("photo")}</label>
              <input id="avatar" name="avatar" type="file" accept="image/png,image/jpeg,image/webp" disabled={readOnly} />
              {src && <label className="row note" style={{ gap: 6 }}><input type="checkbox" name="remove_avatar" disabled={readOnly} />{t("removePhoto")}</label>}
              <span className="note">{t("photoHint")}</span>
            </div>
          </div>
          <div className="col" style={{ gap: 6 }}>
            <label className="note" htmlFor="full_name">{t("name")}</label>
            <input id="full_name" name="full_name" required maxLength={120} defaultValue={p.fullName} autoComplete="name" className="input" disabled={readOnly} />
          </div>
          <div className="col" style={{ gap: 6 }}>
            <label className="note" htmlFor="phone">{t("phone")}</label>
            <input id="phone" name="phone" type="tel" dir="ltr" maxLength={25} defaultValue={p.phone} autoComplete="tel" className="input" placeholder="+972 54 123 4567" disabled={readOnly} />
          </div>
          <div className="col" style={{ gap: 6 }}>
            <label className="note" htmlFor="email">{t("email")}</label>
            <input id="email" dir="ltr" value={p.email} readOnly disabled className="input" />
            <span className="note">{t("emailHint")}</span>
          </div>
          <div><button className="btn pri" disabled={readOnly}>{t("save")}</button></div>
        </div>
      </form>
    </>
  );
}
