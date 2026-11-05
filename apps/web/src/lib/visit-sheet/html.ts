import { esc } from "../poster/html";

export type Loc = "fr" | "he" | "en";
/**
 * Texte du bon de visite. MODÈLE À FAIRE VALIDER PAR UN JURISTE avant usage commercial (valeur juridique, clause d'exclusivité/commission,
 * mentions obligatoires de la loi israélienne sur les courtiers en immobilier). Une signature manuscrite sur écran est une signature
 * électronique « simple » : elle ne remplace pas une signature qualifiée.
 */
export const TEXT: Record<Loc, { title: string; property: string; date: string; agent: string; visitor: string; declare: string[]; signature: string; signedOn: string; fingerprint: string }> = {
  fr: { title: "Bon de visite", property: "Bien visité", date: "Date et heure", agent: "Agent", visitor: "Visiteur", signature: "Signature", signedOn: "Signé le", fingerprint: "Empreinte du document",
    declare: ["Je confirme avoir visité le bien ci-dessus par l'intermédiaire de l'agence indiquée.", "Je m'engage à ne pas conclure de transaction portant sur ce bien sans passer par l'agence, sous réserve des dispositions légales applicables.", "Je reconnais avoir reçu les informations relatives au bien et à l'agence, y compris la rémunération applicable."] },
  he: { title: "טופס הזמנת ביקור בנכס", property: "הנכס שנסקר", date: "תאריך ושעה", agent: "סוכן", visitor: "המבקר", signature: "חתימה", signedOn: "נחתם בתאריך", fingerprint: "טביעת אצבע של המסמך",
    declare: ["אני מאשר/ת כי ביקרתי בנכס הנ\"ל באמצעות הסוכנות המצוינת.", "אני מתחייב/ת שלא לבצע עסקה בנכס זה שלא באמצעות הסוכנות, בכפוף להוראות הדין.", "אני מאשר/ת כי קיבלתי מידע על הנכס ועל הסוכנות, לרבות דמי התיווך החלים."] },
  en: { title: "Viewing confirmation", property: "Property viewed", date: "Date and time", agent: "Agent", visitor: "Visitor", signature: "Signature", signedOn: "Signed on", fingerprint: "Document fingerprint",
    declare: ["I confirm that I viewed the property above through the agency named.", "I agree not to conclude a transaction on this property without going through the agency, subject to applicable law.", "I acknowledge receiving information about the property and the agency, including the applicable fee."] },
};

export type SheetData = { locale: Loc; orgName: string; reference: string; address: string; startsAt: string; agent: string; signer: string; signaturePng: string; signedAt: string; fingerprint: string };

export function visitSheetHtml(d: SheetData, fonts: { inter: string; heeboHe: string; heeboLatin: string }): string {
  const t = TEXT[d.locale], rtl = d.locale === "he";
  return `<!doctype html><html lang="${d.locale}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;src:url(${fonts.inter});font-weight:100 900}
@font-face{font-family:Heebo;src:url(${fonts.heeboHe});unicode-range:U+0590-05FF;font-weight:100 900}
@font-face{font-family:Heebo;src:url(${fonts.heeboLatin});font-weight:100 900}
*{box-sizing:border-box}body{font:14px/1.55 ${rtl ? "Heebo" : "Inter"},Heebo,sans-serif;color:#15171a;margin:0}
h1{font-size:24px;margin:0 0 4px}.org{color:#555;margin-bottom:24px}
dl{display:grid;grid-template-columns:150px 1fr;gap:6px 16px;margin:0 0 22px}dt{color:#666}dd{margin:0;font-weight:500}
ul{padding-inline-start:18px;margin:0 0 26px}li{margin-bottom:8px}
.sig{border:1px solid #cfd3d8;border-radius:8px;height:140px;display:flex;align-items:center;justify-content:center;background:#fff}.sig img{max-height:130px;max-width:90%}
.meta{margin-top:10px;color:#666;font-size:12px}.fp{font-family:ui-monospace,monospace;direction:ltr;unicode-bidi:isolate}
</style></head><body>
<h1>${esc(t.title)}</h1><div class="org">${esc(d.orgName)}</div>
<dl><dt>${esc(t.property)}</dt><dd>${esc(d.reference)} — ${esc(d.address)}</dd><dt>${esc(t.date)}</dt><dd>${esc(d.startsAt)}</dd><dt>${esc(t.agent)}</dt><dd>${esc(d.agent)}</dd><dt>${esc(t.visitor)}</dt><dd>${esc(d.signer)}</dd></dl>
<ul>${t.declare.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
<div class="sig"><img src="${esc(d.signaturePng)}" alt=""></div>
<div class="meta">${esc(t.signedOn)} ${esc(d.signedAt)} · ${esc(t.fingerprint)}: <span class="fp">${esc(d.fingerprint)}</span></div>
</body></html>`;
}
