"use client";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Sparkles } from "lucide-react";
import { generatePosterAction, type PosterState } from "@/app/[locale]/(app)/properties/[id]/poster/actions";

export type PosterHistory = { id: string; key: string; format: string; locale: string; level: string; width: number; height: number; when: string };

export function PosterForm({ propertyId, balance, available, costs, hasLegal, hasPhoto, history }: { propertyId: string; balance: number; available: Record<string, boolean>; costs: Record<string, number>; hasLegal: boolean; hasPhoto: boolean; history: PosterHistory[] }) {
  const t = useTranslations("poster");
  const locale = useLocale();
  const [state, action, pending] = useActionState<PosterState, FormData>(generatePosterAction.bind(null, propertyId), null);
  const ok = (state?.results ?? []).filter((r) => r.ok) as Extract<NonNullable<NonNullable<PosterState>["results"]>[number], { ok: true }>[];
  const failed = (state?.results ?? []).find((r) => !r.ok) as { error: string } | undefined;
  const tog = (name: string, label: string, def = true) => <label className="row" style={{ gap: 8 }}><input type="checkbox" className="ck" name={name} defaultChecked={def} />{label}</label>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "360px minmax(0,1fr)", gap: 20, alignItems: "start" }} className="split">
      <form action={action} className="card"><div className="card-b col" style={{ gap: 16 }}>
        <input type="hidden" name="locale" value={locale} />
        {!hasLegal && <div role="alert" className="err">{t("errors.no_legal")}</div>}
        {!hasPhoto && <div className="note" style={{ color: "var(--warn)" }}>{t("noPhotoNote")}</div>}
        <div><div className="lbl">{t("formats")}</div><div className="col" style={{ gap: 6 }}>
          {([["square", "Instagram · 1:1", "1080×1080", false], ["portrait", "Instagram · 4:5", "1080×1350", true], ["story", "Story / Reel · 9:16", "1080×1920", false], ["facebook", t("facebook"), "1200×630", false], ["a4", t("a4"), "1240×1754", false]] as const).map(([k, name, size, on]) => (
            <label key={k} className="row sel-row" style={{ gap: 8, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 8 }}><input type="checkbox" className="ck" name="format" value={k} defaultChecked={on} /><span className="grow">{name}</span><span className="note ltr tab">{size}</span></label>
          ))}</div><p className="note" style={{ marginTop: 4 }}>{t("formatsHint")}</p></div>
        <div className="row" style={{ gap: 10 }}>
          <div className="grow"><div className="lbl">{t("language")}</div><select name="poster_locale" className="input" defaultValue={locale}><option value="fr">Français</option><option value="he">עברית</option><option value="en">English</option></select></div>
          <div className="grow"><div className="lbl">{t("layout")}</div><select name="variant" className="input"><option value="A">{t("layouts.A")}</option><option value="B">{t("layouts.B")}</option><option value="C">{t("layouts.C")}</option></select></div>
        </div>
        <div><div className="lbl">{t("level")}</div><div className="col" style={{ gap: 6 }}>
          {(["faithful", "enhanced", "creative"] as const).map((l) => (
            <label key={l} className="row" style={{ gap: 8, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, opacity: available[l] ? 1 : 0.5 }}>
              <input type="radio" name="level" value={l} defaultChecked={l === "faithful"} disabled={!available[l]} />
              <div className="grow"><b style={{ fontWeight: 500 }}>{t(`levels.${l}`)}</b><div className="note">{available[l] ? t(`levelsHint.${l}`) : t("providerMissing")}</div></div>
              <span className={`badge ${costs[l] === 0 ? "ok" : ""}`}>{costs[l] === 0 ? t("free") : t("credits", { n: costs[l]! })}</span>
            </label>))}</div></div>
        <div><div className="lbl">{t("headline")}</div><input name="headline" className="input" maxLength={90} placeholder={t("headlinePlaceholder")} /></div>
        <div className="col" style={{ gap: 8 }}>{tog("show_price", t("showPrice"))}{tog("show_address", t("showAddress"))}{tog("show_contact", t("showContact"))}{tog("show_qr", t("showQr"))}</div>
        <div className="row note"><span className="grow">{t("balance", { n: balance })}</span></div>
        <button className="btn pri" style={{ height: 38 }} disabled={pending || !hasLegal}><Sparkles size={15} aria-hidden />{pending ? t("generating") : t("generate")}</button>
        {failed && <div role="alert" className="err">{t(`errors.${failed.error}`)}</div>}
        {state?.error && <div role="alert" className="err">{t(`errors.${state.error}`)}</div>}
      </div></form>

      <div className="col" style={{ gap: 16 }}>
        {ok.length > 0 && <div className="card"><h2>{t("result")}</h2><div className="card-b" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
          {ok.map((r) => <div key={r.id} className="col" style={{ gap: 8 }}><img src={`/api/files/${r.key}`} alt="" style={{ width: "100%", height: "auto", borderRadius: 6, border: "1px solid var(--line)" }} /><a className="btn sm" href={`/api/files/${r.key}`} download={`affiche-${r.format}.png`}><Download size={14} aria-hidden />{t("download")} {r.format}</a></div>)}
        </div></div>}
        <div className="card"><h2>{t("history")}<span className="badge">{history.length}</span></h2>
          {history.length === 0 ? <p className="muted card-b">{t("historyEmpty")}</p> : <div className="card-b" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 12 }}>
            {history.map((h) => <a key={h.id} href={`/api/files/${h.key}`} download className="col" style={{ gap: 4 }}><img src={`/api/files/${h.key}`} alt="" loading="lazy" style={{ width: "100%", borderRadius: 6, border: "1px solid var(--line)" }} /><span className="note">{h.format} · {h.locale.toUpperCase()} · {h.when}</span></a>)}</div>}
        </div>
      </div>
    </div>
  );
}
