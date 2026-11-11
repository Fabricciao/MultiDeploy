"use client";
import { useActionState, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Globe, Sparkles } from "lucide-react";
import { accentStep, brandScale, contrast } from "@/lib/theme";
import { Field } from "@/components/ui";
import { analyzeBrandAction, saveBrandAction, type AnalyzeState, type SaveBrandState } from "@/app/[locale]/(app)/settings/brand/actions";
import type { BrandKit } from "@/lib/data/brand";
import { FileInput } from "@/components/file-input";

export function BrandEditor({ initial, logoUrl }: { initial: BrandKit; logoUrl: string | null }) {
  const t = useTranslations("brand");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [colors, setColors] = useState(initial.colors);
  const [radius, setRadius] = useState(initial.style.radius);
  const [font, setFont] = useState(initial.fonts.latin ?? "");
  const [logoB64, setLogoB64] = useState("");
  const [source, setSource] = useState(initial.source_url ?? "");
  const [analysis, analyze, analyzing] = useActionState<AnalyzeState, FormData>(analyzeBrandAction, null);
  const [saved, save, saving] = useActionState<SaveBrandState, FormData>(saveBrandAction, null);

  useEffect(() => {
    if (analysis?.proposal) { setColors(analysis.proposal.colors); if (analysis.proposal.font) setFont(analysis.proposal.font); setLogoB64(analysis.proposal.logoB64 ?? ""); setSource(analysis.proposal.sourceUrl); }
  }, [analysis]);

  const scale = brandScale(colors.primary), step = accentStep(scale);
  const adjusted = scale[step]!.toLowerCase() !== colors.primary.toLowerCase();
  const ratio = contrast(scale[step]!, "#ffffff");
  const vars = { "--accent": scale[step], "--accent-soft": scale[100], "--accent-ink": scale[Math.min(step + 100, 900) as 900], "--radius": `${radius}px` } as React.CSSProperties;
  const colorField = (k: keyof typeof colors, label: string) => (
    <Field label={label}>
      <div className="row" style={{ gap: 8 }}>
        <input type="color" aria-label={label} value={colors[k]} onChange={(e) => setColors({ ...colors, [k]: e.target.value })} style={{ width: 44, height: 32, border: "1px solid var(--line-strong)", borderRadius: 6, padding: 2, background: "var(--surface)" }} />
        <input name={k} className="input ltr" dir="ltr" value={colors[k]} onChange={(e) => setColors({ ...colors, [k]: e.target.value })} pattern="#[0-9a-fA-F]{6}" style={{ width: 110 }} />
      </div>
    </Field>
  );
  const err = (e?: string) => (e ? t(`errors.${e}`) : null);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,420px)", gap: 20, alignItems: "start" }} className="split">
      <div className="col" style={{ gap: 16 }}>
        <form action={analyze} className="card"><h2><Globe size={15} aria-hidden />{t("analyzeTitle")}</h2>
          <div className="card-b col" style={{ gap: 10 }}>
            <input type="hidden" name="locale" value={locale} />
            <div className="row" style={{ gap: 8 }}><input name="url" className="input grow" dir="ltr" placeholder="https://eliezer.immo" defaultValue={initial.source_url ?? ""} aria-label={t("url")} /><button className="btn" disabled={analyzing}><Sparkles size={14} aria-hidden />{analyzing ? t("analyzing") : t("analyze")}</button></div>
            {analysis?.error && <div className="err" role="alert">{err(analysis.error)}</div>}
            {analysis?.proposal && <div className="row" style={{ gap: 8, color: "var(--ok)" }} role="status"><Check size={14} aria-hidden />{t("analyzed", { name: analysis.proposal.siteName ?? analysis.proposal.sourceUrl })}{analysis.proposal.hasLogo ? ` · ${t("logoFound")}` : ""}</div>}
            <p className="note">{t("analyzeHint")}</p>
          </div></form>

        <form action={save} className="col" style={{ gap: 16 }}>
          <input type="hidden" name="locale" value={locale} /><input type="hidden" name="source_url" value={source} /><input type="hidden" name="logo_b64" value={logoB64} />
          <section className="card"><h2>{t("colors")}</h2><div className="card-b col" style={{ gap: 14 }}>
            <div className="row wrap" style={{ gap: 18 }}>{colorField("primary", t("primary"))}{colorField("secondary", t("secondary"))}{colorField("accent", t("accent"))}</div>
            {adjusted && <div className="row" style={{ gap: 8, color: "var(--warn)" }} role="status">{t("adjusted", { color: scale[step]!, ratio: ratio.toFixed(1) })}</div>}
            <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
              <Field label={`${t("radius")} (${radius}px)`}><input type="range" name="radius" min={0} max={12} value={radius} onChange={(e) => setRadius(Number(e.target.value))} /></Field>
              <Field label={t("density")}><select name="density" className="input" defaultValue={initial.style.density}><option value="comfortable">{t("densities.comfortable")}</option><option value="standard">{t("densities.standard")}</option><option value="compact">{t("densities.compact")}</option></select></Field>
            </div>
          </div></section>

          <section className="card"><h2>{t("logoFonts")}</h2><div className="card-b" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            <Field label={t("logo")}>
              <div className="row" style={{ gap: 10 }}>
                {(logoB64 || logoUrl) && <img alt="" src={logoB64 ? `data:image/png;base64,${logoB64}` : logoUrl!} style={{ height: 40, maxWidth: 120, objectFit: "contain", border: "1px solid var(--line)", borderRadius: 6, padding: 4, background: "#fff" }} />}
                <FileInput name="logo" accept="image/png,image/jpeg,image/webp,image/svg+xml" />
              </div>
            </Field>
            <Field label={t("fontLatin")}><input name="font_latin" className="input" value={font} onChange={(e) => setFont(e.target.value)} /></Field>
            <Field label={t("fontHebrew")}><input name="font_hebrew" className="input" defaultValue={initial.fonts.hebrew} /></Field>
          </div></section>

          <section className="card"><h2>{t("legalContact")}</h2><div className="card-b col" style={{ gap: 12 }}>
            <p className="note">{t("legalHint")}</p>
            {(["fr", "he", "en"] as const).map((l) => <Field key={l} label={`${t("legal")} · ${l.toUpperCase()}`}><textarea name={`legal_${l}`} className="input" dir={l === "he" ? "rtl" : "ltr"} defaultValue={initial.legal_footer[l]} style={{ minHeight: 48 }} /></Field>)}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
              <Field label={t("phone")}><input name="phone" className="input" dir="ltr" defaultValue={initial.contact.phone} /></Field>
              <Field label="E-mail"><input name="email" className="input" dir="ltr" defaultValue={initial.contact.email} /></Field>
              <Field label={t("website")}><input name="website" className="input" dir="ltr" defaultValue={initial.contact.website} /></Field>
            </div>
          </div></section>
          <div className="row" style={{ gap: 12 }}>
            <button className="btn pri" disabled={saving}>{saving ? tc("saving") : t("apply")}</button>
            {saved?.ok && <span role="status" style={{ color: "var(--ok)" }}>{t("saved")}</span>}
            {saved?.error && <span role="alert" className="err">{err(saved.error)}</span>}
            <span className="note">{t("version", { v: initial.version })}</span>
          </div>
        </form>
      </div>

      <div className="col" style={{ gap: 12, position: "sticky", top: 70 }} aria-label={t("preview")}>
        <b style={{ fontSize: 14 }}>{t("preview")}</b>
        <div style={{ ...vars, border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "var(--bg)" }}>
          <div className="row" style={{ background: "#fff", padding: "10px 12px", borderBottom: "1px solid var(--line)", gap: 8 }}>
            <div className="mark" style={{ background: "var(--accent)", borderRadius: "var(--radius)" }}>{(analysis?.proposal?.siteName ?? "A")[0]}</div><b>{analysis?.proposal?.siteName ?? t("sampleAgency")}</b>
            <span className="sp btn pri sm" style={{ background: "var(--accent)", borderColor: "var(--accent)", borderRadius: "var(--radius)" }}>{t("sampleButton")}</span>
          </div>
          <div style={{ padding: 12 }} className="col">
            <div className="row" style={{ gap: 6, marginBottom: 10 }}>
              <span className="chip on" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>{t("sampleChip")}</span><span className="chip">{t("sampleChip2")}</span>
            </div>
            {[0, 1].map((k) => <div key={k} className="row" style={{ padding: "8px 0", borderTop: "1px solid var(--line)", gap: 10 }}><span style={{ fontWeight: 500 }} className="grow">{t("sampleRow", { n: k + 1 })}</span><span className="badge" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)", borderRadius: 99 }}>{t("sampleStatus")}</span></div>)}
          </div>
        </div>
        <div className="row" style={{ gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)" }}>{[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((s) => <div key={s} style={{ flex: 1, height: 28, background: scale[s] }} title={String(s)} />)}</div>
        <p className="note">{t("previewNote")}</p>
      </div>
    </div>
  );
}
