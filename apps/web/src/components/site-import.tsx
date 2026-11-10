"use client";
import { useActionState, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ExternalLink, Globe, Image as ImageIcon, TriangleAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { importSiteAction, scanSiteAction, type ScanState, type SiteImportState } from "@/app/[locale]/(app)/import/site-actions";
import type { SiteListing } from "@/lib/site-import/parse";

type Filter = "all" | "sale" | "rent" | "check";
/** Import des biens depuis le site internet de l'agence : analyse sans IA, aperçu, cases à cocher, puis création des fiches (brouillons). */
export function SiteImport({ cities }: { cities: Record<string, string> }) {
  const t = useTranslations("siteImport");
  const locale = useLocale();
  const [scan, scanAction, scanning] = useActionState<ScanState, FormData>(scanSiteAction, null);
  const [res, importAction, importing] = useActionState<SiteImportState, FormData>(importSiteAction, null);
  const [filter, setFilter] = useState<Filter>("all");
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [tx, setTx] = useState<Record<string, "sale" | "rent">>({});
  const listings = useMemo(() => (scan && "listings" in scan ? scan.listings : []), [scan]);
  const imported = useMemo(() => new Set(scan && "imported" in scan ? scan.imported : []), [scan]);
  const txOf = (l: SiteListing) => tx[l.url] ?? l.transaction;
  const checked = (l: SiteListing) => sel[l.url] ?? (!imported.has(l.url) && l.transaction !== null);
  const needsCheck = (l: SiteListing) => !txOf(l) || l.price === null || !l.city_id;
  const counts = { sale: listings.filter((l) => txOf(l) === "sale").length, rent: listings.filter((l) => txOf(l) === "rent").length, check: listings.filter(needsCheck).length };
  const shown = listings.filter((l) => filter === "all" || (filter === "check" ? needsCheck(l) : txOf(l) === filter));
  const chosen = listings.filter((l) => checked(l) && !imported.has(l.url));
  const nf = new Intl.NumberFormat(locale === "he" ? "he-IL" : locale === "en" ? "en-IL" : "fr-FR", { maximumFractionDigits: 0 });
  const setAll = (on: boolean) => setSel(Object.fromEntries(shown.filter((l) => !imported.has(l.url)).map((l) => [l.url, on])));

  if (res?.report) return (
    <section className="card"><div className="card-b col" style={{ gap: 10 }}>
      <div className="banner ok"><Check size={15} aria-hidden /><span>{t("done", { created: res.report.created, photos: res.report.photos })}</span></div>
      {res.report.skipped > 0 && <p className="note">{t("skipped", { n: res.report.skipped })}</p>}
      {res.report.failed > 0 && <p className="note err">{t("failed", { n: res.report.failed })}</p>}
      <p className="note">{t("drafts")}</p>
      <div><Link href="/properties?status=draft" className="btn pri">{t("seeDrafts")}</Link></div>
    </div></section>
  );

  return (
    <section className="card"><h2><Globe size={15} aria-hidden />{t("title")}<small>{t("sub")}</small></h2>
      <div className="card-b col" style={{ gap: 12 }}>
        <form action={scanAction} className="row wrap" style={{ gap: 8 }}>
          <input type="hidden" name="locale" value={locale} />
          <input name="url" className="input ltr" dir="ltr" inputMode="url" placeholder="www.mon-agence.co.il" required style={{ flex: "1 1 260px" }} aria-label={t("url")} />
          <button className="btn pri" disabled={scanning}>{scanning ? t("scanning") : t("scan")}</button>
        </form>
        {scanning && <p className="note">{t("scanningHint")}</p>}
        {scan && "error" in scan && scan.error && <div role="alert" className="banner"><TriangleAlert size={15} aria-hidden /><span>{t(`errors.${scan.error}`)}</span></div>}

        {listings.length > 0 && <>
          <div className="banner info"><Check size={15} aria-hidden /><span>{t("found", { n: listings.length, sale: counts.sale, rent: counts.rent, site: scan && "site" in scan ? scan.site : "" })}</span></div>
          <div className="row wrap" style={{ gap: 8 }}>
            <div className="seg" role="tablist">{(["all", "sale", "rent", "check"] as const).map((k) => <button key={k} type="button" role="tab" aria-selected={filter === k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{t(`f.${k}`)}{k !== "all" && ` · ${counts[k]}`}</button>)}</div>
            <span className="sp" />
            <button type="button" className="btn sm ghost" onClick={() => setAll(true)}>{t("checkAll")}</button>
            <button type="button" className="btn sm ghost" onClick={() => setAll(false)}>{t("uncheckAll")}</button>
          </div>
          <div style={{ overflowX: "auto" }}><table className="tbl">
            <thead><tr><th style={{ width: 36 }} aria-label={t("col.pick")}></th><th>{t("col.property")}</th><th>{t("col.tx")}</th><th className="n">{t("col.price")}</th><th className="n">{t("col.rooms")}</th><th className="n">{t("col.area")}</th><th>{t("col.city")}</th><th className="n">{t("col.photos")}</th></tr></thead>
            <tbody>{shown.map((l) => {
              const done = imported.has(l.url);
              return (
                <tr key={l.url} style={{ opacity: done ? 0.55 : 1 }}>
                  <td><input type="checkbox" className="ck" checked={!done && checked(l)} disabled={done} onChange={(e) => setSel((s) => ({ ...s, [l.url]: e.target.checked }))} aria-label={l.title} /></td>
                  <td><div className="row" style={{ gap: 10, minWidth: 220 }}>
                    <span className="thumb" style={{ width: 56, height: 40, borderRadius: 6, overflow: "hidden", flex: "none", background: "var(--surface-sunken)", display: "grid", placeItems: "center" }}>
                      {l.images[0] ? <img src={l.images[0]} alt="" loading="lazy" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={14} aria-hidden />}</span>
                    <div style={{ minWidth: 0 }}><b className="trunc" style={{ display: "block", fontWeight: 500 }} dir="auto">{l.title}</b>
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="note row" style={{ gap: 4 }}><ExternalLink size={11} aria-hidden /><span className="trunc ltr" style={{ maxWidth: 220 }}>{new URL(l.url).pathname}</span></a>
                      {done && <span className="badge">{t("already")}</span>}</div></div></td>
                  <td><select className="input" style={{ height: 30, minWidth: 110 }} value={txOf(l) ?? ""} disabled={done} onChange={(e) => { setTx((s) => ({ ...s, [l.url]: e.target.value as "sale" | "rent" })); setSel((s) => ({ ...s, [l.url]: true })); }} aria-label={t("col.tx")}>
                    {!txOf(l) && <option value="">{t("unknown")}</option>}<option value="sale">{t("sale")}</option><option value="rent">{t("rent")}</option></select></td>
                  <td className="n tab nowrap">{l.price !== null ? `${nf.format(l.price)} ${l.currency === "ILS" ? "₪" : l.currency === "EUR" ? "€" : "$"}` : <span className="note">—</span>}</td>
                  <td className="n tab">{l.rooms ?? "—"}</td>
                  <td className="n tab">{l.area_built ? `${l.area_built} m²` : "—"}</td>
                  <td>{l.city_id ? cities[l.city_id] : <span className="badge warn">{l.city_text ? t("cityUnknown", { city: l.city_text }) : t("noCity")}</span>}</td>
                  <td className="n tab">{l.images.length}</td>
                </tr>);
            })}</tbody>
          </table></div>
          <form action={importAction} className="row wrap" style={{ gap: 10 }}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="items" value={JSON.stringify(chosen.map((l) => ({ ...l, transaction: txOf(l) ?? "sale" })))} />
            <button className="btn pri" disabled={importing || chosen.length === 0}>{importing ? t("importing") : t("import", { n: chosen.length })}</button>
            <span className="note">{importing ? t("importingHint") : t("importHint")}</span>
            {res?.error && <span role="alert" className="err note">{t(`errors.${res.error}`)}</span>}
          </form>
        </>}
      </div>
    </section>
  );
}
