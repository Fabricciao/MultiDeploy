"use client";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Upload } from "lucide-react";
import { previewImport, runImport, type PreviewState } from "@/app/[locale]/(app)/import/actions";
import { CONTACT_FIELDS, PROPERTY_FIELDS } from "@/lib/import/csv";
import { FileInput } from "@/components/file-input";

export function ImportWizard({ defaultTarget }: { defaultTarget: "contacts" | "properties" }) {
  const t = useTranslations("import");
  const locale = useLocale();
  const [prev, previewAction, previewing] = useActionState<PreviewState, FormData>(previewImport, null);
  const [done, runAction, running] = useActionState<PreviewState, FormData>(runImport, null);
  const fields = prev?.target === "properties" ? PROPERTY_FIELDS : CONTACT_FIELDS;
  const rep = done?.report;
  return (
    <div className="col" style={{ gap: 16, maxWidth: 980 }}>
      <form action={previewAction} className="card"><div className="card-b row wrap" style={{ gap: 12 }}>
        <input type="hidden" name="locale" value={locale} />
        <select name="target" className="input" style={{ width: 180 }} defaultValue={defaultTarget} aria-label={t("target")}><option value="contacts">{t("contacts")}</option><option value="properties">{t("properties")}</option></select>
        <div className="grow"><FileInput name="file" accept=".csv,text/csv,text/plain" label={t("file")} /></div>
        <button className="btn pri" disabled={previewing}><Upload size={15} aria-hidden />{previewing ? t("reading") : t("preview")}</button>
        <p className="note" style={{ flexBasis: "100%" }}>{t("hint")}</p>
        {prev?.error && <div role="alert" className="err" style={{ flexBasis: "100%" }}>{t(`errors.${prev.error}`)}</div>}
      </div></form>
      {prev?.headers && !rep && (
        <form action={runAction} className="card"><h2>{t("mapping")}<span className="badge">{t("rows", { count: prev.total ?? 0 })}</span></h2><div className="card-b col" style={{ gap: 12 }}>
          <input type="hidden" name="locale" value={locale} /><input type="hidden" name="target" value={prev.target} /><input type="hidden" name="csv" value={prev.csv} />
          {prev.truncated && <div className="note" style={{ color: "var(--warn)" }}>{t("truncated")}</div>}
          <div style={{ overflowX: "auto" }}><table className="tbl"><thead><tr>{prev.headers.map((h, i) => <th key={i}><div>{h}</div><select name={`map_${i}`} defaultValue={prev.mapping![i]} className="input" style={{ height: 28, marginTop: 4, minWidth: 130 }} aria-label={h}><option value="ignore">{t("ignore")}</option>{fields.map((f) => <option key={f} value={f}>{t(`fields.${f}`)}</option>)}</select></th>)}</tr></thead>
            <tbody>{prev.sample!.map((r, i) => <tr key={i}>{prev.headers!.map((_, c) => <td key={c} className="muted" style={{ height: 34 }}>{r[c]}</td>)}</tr>)}</tbody></table></div>
          <button className="btn pri" style={{ alignSelf: "flex-start" }} disabled={running}>{running ? t("importing") : t("run", { count: prev.total ?? 0 })}</button>
          {done?.error && <div role="alert" className="err">{t(`errors.${done.error}`)}</div>}
        </div></form>
      )}
      {rep && (
        <div className="card" role="status"><h2>{t("report")}</h2><div className="card-b col" style={{ gap: 8 }}>
          <div className="row" style={{ gap: 8 }}><span className="badge ok">{t("created", { count: rep.created })}</span><span className="badge warn">{t("duplicates", { count: rep.duplicates })}</span><span className={`badge ${rep.errors.length ? "bad" : ""}`}>{t("errorsCount", { count: rep.errors.length })}</span></div>
          {rep.errors.slice(0, 30).map((e) => <div key={e.line} className="note">{t("line", { n: e.line })} — {t(`rowErrors.${e.code}`)}</div>)}
        </div></div>
      )}
    </div>
  );
}
