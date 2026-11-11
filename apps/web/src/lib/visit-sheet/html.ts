import { esc, fontFaces, type PosterFonts } from "../poster/html";

export type Loc = "fr" | "he" | "en";
/**
 * Langues d'un document signé : l'hébreu est toujours présent (langue de la loi israélienne sur les courtiers en immobilier),
 * suivi de la traduction dans la langue de lecture du signataire quand elle est différente.
 */
export const docLocales = (l: Loc): Loc[] => (l === "he" ? ["he"] : ["he", l]);
export const asLoc = (l: string | null | undefined): Loc => (l === "he" || l === "en" ? l : "fr");

/**
 * Texte du bon de visite. MODÈLE À FAIRE VALIDER PAR UN JURISTE avant usage commercial (valeur juridique, clause d'exclusivité/commission,
 * mentions obligatoires de la loi israélienne sur les courtiers en immobilier). Une signature manuscrite sur écran est une signature
 * électronique « simple » : elle ne remplace pas une signature qualifiée.
 */
export const TEXT: Record<Loc, { title: string; property: string; date: string; agent: string; visitor: string; declare: string[]; signature: string; signedOn: string; fingerprint: string; translation: string }> = {
  fr: { title: "Bon de visite", property: "Bien visité", date: "Date et heure", agent: "Agent", visitor: "Visiteur", signature: "Signature", signedOn: "Signé le", fingerprint: "Empreinte du document", translation: "Traduction française",
    declare: ["Je confirme avoir visité le bien ci-dessus par l'intermédiaire de l'agence indiquée.", "Je m'engage à ne pas conclure de transaction portant sur ce bien sans passer par l'agence, sous réserve des dispositions légales applicables.", "Je reconnais avoir reçu les informations relatives au bien et à l'agence, y compris la rémunération applicable."] },
  he: { title: "טופס הזמנת ביקור בנכס", property: "הנכס שנסקר", date: "תאריך ושעה", agent: "סוכן", visitor: "המבקר", signature: "חתימה", signedOn: "נחתם בתאריך", fingerprint: "טביעת אצבע של המסמך", translation: "נוסח בעברית",
    declare: ["אני מאשר/ת כי ביקרתי בנכס הנ\"ל באמצעות הסוכנות המצוינת.", "אני מתחייב/ת שלא לבצע עסקה בנכס זה שלא באמצעות הסוכנות, בכפוף להוראות הדין.", "אני מאשר/ת כי קיבלתי מידע על הנכס ועל הסוכנות, לרבות דמי התיווך החלים."] },
  en: { title: "Viewing confirmation", property: "Property viewed", date: "Date and time", agent: "Agent", visitor: "Visitor", signature: "Signature", signedOn: "Signed on", fingerprint: "Document fingerprint", translation: "English translation",
    declare: ["I confirm that I viewed the property above through the agency named.", "I agree not to conclude a transaction on this property without going through the agency, subject to applicable law.", "I acknowledge receiving information about the property and the agency, including the applicable fee."] },
};

/** Une version linguistique du document : les valeurs qui dépendent de la langue (nom de l'agence, ville, dates). */
export type SheetPart = { locale: Loc; orgName: string; address: string; startsAt: string; signedAt: string };
export type SheetData = { parts: SheetPart[]; reference: string; agent: string; signer: string; signaturePng: string; fingerprint: string };

export function visitSheetHtml(d: SheetData, fonts: PosterFonts): string {
  const first = d.parts[0]!, two = d.parts.length > 1;
  const dir = (l: Loc) => (l === "he" ? "rtl" : "ltr");
  const part = (p: SheetPart, i: number) => { const t = TEXT[p.locale]; return `<section lang="${p.locale}" dir="${dir(p.locale)}" class="${i ? "tr" : ""}">
${i ? `<div class="trl">${esc(t.translation)}</div>` : ""}<h1>${esc(t.title)}</h1><div class="org">${esc(p.orgName)}</div>
<dl><dt>${esc(t.property)}</dt><dd><span class="ltr">${esc(d.reference)}</span> — <bdi>${esc(p.address)}</bdi></dd><dt>${esc(t.date)}</dt><dd>${esc(p.startsAt)}</dd><dt>${esc(t.agent)}</dt><dd><bdi>${esc(d.agent)}</bdi></dd><dt>${esc(t.visitor)}</dt><dd><bdi>${esc(d.signer)}</bdi></dd></dl>
<ul>${t.declare.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>`; };
  return `<!doctype html><html lang="${first.locale}" dir="${dir(first.locale)}"><head><meta charset="utf-8"><style>
${fontFaces(fonts)}
*{box-sizing:border-box}body{font:${two ? "12.5px/1.5" : "14px/1.55"} 'NH Sans',sans-serif;color:#112127;margin:0}
h1{font-family:'NH Display',Georgia,serif;font-weight:500;font-size:${two ? 22 : 26}px;margin:0 0 4px}.org{color:#525D62;margin-bottom:${two ? 12 : 24}px}
dl{display:grid;grid-template-columns:150px 1fr;gap:${two ? "4px" : "6px"} 16px;margin:0 0 ${two ? 12 : 22}px}dt{color:#525D62}dd{margin:0;font-weight:500}
ul{padding-inline-start:18px;margin:0 0 ${two ? 10 : 26}px}li{margin-bottom:${two ? 4 : 8}px}
section.tr{border-top:1px solid #CAC7BF;margin-top:14px;padding-top:12px}.trl{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#525D62;margin-bottom:6px}
.sigw{break-inside:avoid;margin-top:${two ? 16 : 0}px}.sigl{font-weight:600;margin-bottom:6px}
.sig{border:1px solid #CAC7BF;border-radius:8px;height:${two ? 120 : 140}px;display:flex;align-items:center;justify-content:center;background:#fff}.sig img{max-height:${two ? 110 : 130}px;max-width:90%}
.meta{margin-top:8px;color:#525D62;font-size:11.5px}.fp{font-family:ui-monospace,monospace;font-size:9.5px;color:#525D62;direction:ltr;unicode-bidi:isolate;word-break:break-all;margin-top:2px}.ltr{direction:ltr;unicode-bidi:isolate;display:inline-block}
</style></head><body>
${d.parts.map(part).join("\n")}
<div class="sigw"><div class="sigl">${d.parts.map((p) => `<bdi>${esc(TEXT[p.locale].signature)}</bdi>`).join(" / ")}</div><div class="sig"><img src="${esc(d.signaturePng)}" alt=""></div>
${d.parts.map((p) => `<div class="meta" lang="${p.locale}" dir="${dir(p.locale)}">${esc(TEXT[p.locale].signedOn)} ${esc(p.signedAt)}</div>`).join("")}
<div class="meta">${d.parts.map((p) => `<bdi>${esc(TEXT[p.locale].fingerprint)}</bdi>`).join(" / ")}</div><div class="fp">${esc(d.fingerprint)}</div></div>
</body></html>`;
}
