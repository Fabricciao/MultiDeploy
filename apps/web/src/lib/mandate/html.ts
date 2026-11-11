import { esc, fontFaces, type PosterFonts } from "../poster/html";
import { TEXT, type Loc } from "../visit-sheet/html";

/**
 * Mandat d'exclusivité (הזמנת שירותי תיווך בבלעדיות). MODÈLE À FAIRE VALIDER PAR UN JURISTE avant usage commercial :
 * loi sur les courtiers en immobilier 5756-1996 (exclusivité d'un logement limitée à 6 mois, mentions obligatoires)
 * et règlement sur les actions de commercialisation 5757-1997 (au moins deux actions). Signature électronique « simple ».
 */
import { ACTIONS, type MandateAction } from "./actions";
export { ACTIONS, type MandateAction };

type Txt = { title: string; agency: string; broker: string; license: string; owner: string; idNumber: string; address: string; property: string; price: string; period: string; from: string; to: string; fee: string; feeVal: (p: string) => string;
  actionsTitle: string; actions: Record<MandateAction, string>; clauses: string[]; signature: string; signedOn: string; fingerprint: string };

export const MTEXT: Record<Loc, Txt> = {
  fr: { title: "Mandat de vente exclusif", agency: "Agence", broker: "Agent immobilier", license: "N° de licence", owner: "Propriétaire", idNumber: "N° d'identité", address: "Adresse du propriétaire", property: "Bien", price: "Prix demandé",
    period: "Durée de l'exclusivité", from: "du", to: "au", fee: "Commission", feeVal: (p) => `${p} % du prix de vente, TVA en sus`,
    actionsTitle: "Actions de commercialisation auxquelles l'agence s'engage",
    actions: { sign: "Panneau sur le bien", internet: "Annonces sur les sites immobiliers (Yad2, Madlan…)", social: "Diffusion sur les réseaux sociaux et le site de l'agence", newspaper: "Annonce dans la presse", open_house: "Journée portes ouvertes", brokers: "Diffusion aux agences partenaires (shitouf)", database: "Envoi aux acheteurs de la base de l'agence" },
    clauses: ["Le propriétaire confie à l'agence, à titre exclusif, la recherche d'un acquéreur pour le bien ci-dessus pendant la durée indiquée.", "L'agence s'engage à réaliser au moins les actions de commercialisation listées ci-dessus pendant la durée de l'exclusivité.", "Si le bien est vendu pendant la durée de l'exclusivité, la commission ci-dessus est due à l'agence, dans les conditions prévues par la loi.", "Conformément à la loi sur les courtiers en immobilier, l'exclusivité portant sur un logement ne peut excéder six mois.", "Le propriétaire déclare être habilité à vendre le bien et avoir reçu un exemplaire de ce mandat."],
    signature: "Signature du propriétaire", signedOn: "Signé le", fingerprint: "Empreinte du document" },
  he: { title: "הזמנת שירותי תיווך בבלעדיות", agency: "משרד תיווך", broker: "מתווך", license: "מספר רישיון", owner: "בעל הנכס", idNumber: "מספר תעודת זהות", address: "כתובת בעל הנכס", property: "הנכס", price: "מחיר מבוקש",
    period: "תקופת הבלעדיות", from: "מ־", to: "עד", fee: "דמי תיווך", feeVal: (p) => `${p}% ממחיר המכירה, בתוספת מע״מ`,
    actionsTitle: "פעולות השיווק שהמשרד מתחייב לבצע",
    actions: { sign: "שלט על הנכס", internet: "פרסום באתרי נדל״ן (יד2, מדלן…)", social: "פרסום ברשתות החברתיות ובאתר המשרד", newspaper: "מודעה בעיתון", open_house: "בית פתוח", brokers: "הפצה למשרדי תיווך שותפים (שיתוף פעולה)", database: "שליחה לקונים ממאגר המשרד" },
    clauses: ["בעל הנכס מוסר למשרד, בבלעדיות, את איתור הקונה לנכס הנ״ל לתקופה המצוינת.", "המשרד מתחייב לבצע לפחות את פעולות השיווק המפורטות לעיל במהלך תקופת הבלעדיות.", "אם הנכס יימכר במהלך תקופת הבלעדיות, יהיו דמי התיווך הנ״ל מגיעים למשרד, בהתאם להוראות הדין.", "בהתאם לחוק המתווכים במקרקעין, בלעדיות לדירת מגורים לא תעלה על שישה חודשים.", "בעל הנכס מצהיר כי הוא מוסמך למכור את הנכס וכי קיבל עותק מהזמנה זו."],
    signature: "חתימת בעל הנכס", signedOn: "נחתם בתאריך", fingerprint: "טביעת אצבע של המסמך" },
  en: { title: "Exclusive sale agreement", agency: "Agency", broker: "Broker", license: "License no.", owner: "Owner", idNumber: "ID number", address: "Owner's address", property: "Property", price: "Asking price",
    period: "Exclusivity period", from: "from", to: "to", fee: "Fee", feeVal: (p) => `${p}% of the sale price, plus VAT`,
    actionsTitle: "Marketing actions the agency commits to",
    actions: { sign: "Sign on the property", internet: "Listings on property websites (Yad2, Madlan…)", social: "Social media and agency website", newspaper: "Newspaper ad", open_house: "Open house", brokers: "Sharing with partner agencies (co-brokerage)", database: "Mailing to the agency's buyer database" },
    clauses: ["The owner entrusts the agency, exclusively, with finding a buyer for the property above for the stated period.", "The agency commits to carrying out at least the marketing actions listed above during the exclusivity period.", "If the property is sold during the exclusivity period, the fee above is due to the agency, as provided by law.", "Under the Real Estate Brokers Law, exclusivity on a residential property may not exceed six months.", "The owner declares being entitled to sell the property and having received a copy of this agreement."],
    signature: "Owner's signature", signedOn: "Signed on", fingerprint: "Document fingerprint" },
};

/** Une version linguistique du mandat : les valeurs qui dépendent de la langue. */
export type MandatePart = { locale: Loc; orgName: string; address: string; price: string; from: string; to: string; pct: string; signedAt: string };
export type MandateDoc = { parts: MandatePart[]; broker: string; license: string; owner: string; idNumber: string; ownerAddress: string; reference: string; actions: MandateAction[]; signaturePng: string; fingerprint: string };

/** L'hébreu d'abord (toujours), puis la traduction dans la langue de lecture du propriétaire. La signature vaut pour l'ensemble. */
export function mandateHtml(d: MandateDoc, fonts: PosterFonts): string {
  const first = d.parts[0]!, two = d.parts.length > 1;
  const dir = (l: Loc) => (l === "he" ? "rtl" : "ltr");
  // Chaque valeur est isolée : un nom ou une adresse en lettres latines ne se mélange pas à la ligne hébraïque.
  const row = (k: string, v: string, ltr = false) => `<dt>${esc(k)}</dt><dd>${ltr ? `<span class="ltr">${esc(v)}</span>` : `<bdi>${esc(v)}</bdi>`}</dd>`;
  const part = (p: MandatePart, i: number) => { const t = MTEXT[p.locale]; return `<section lang="${p.locale}" dir="${dir(p.locale)}" class="${i ? "tr" : ""}">
${i ? `<div class="trl">${esc(TEXT[p.locale].translation)}</div>` : ""}<h1>${esc(t.title)}</h1><div class="org">${esc(p.orgName)}</div>
<dl>${row(t.agency, p.orgName)}${row(t.broker, d.broker)}${d.license ? row(t.license, d.license, true) : ""}${row(t.owner, d.owner)}${row(t.idNumber, d.idNumber, true)}${row(t.address, d.ownerAddress)}
<dt>${esc(t.property)}</dt><dd><span class="ltr">${esc(d.reference)}</span> — <bdi>${esc(p.address)}</bdi></dd>${p.price ? row(t.price, p.price) : ""}${row(t.period, `${t.from} ${p.from} ${t.to} ${p.to}`)}${row(t.fee, t.feeVal(p.pct))}</dl>
<h2>${esc(t.actionsTitle)}</h2><ul>${d.actions.map((a) => `<li>${esc(t.actions[a])}</li>`).join("")}</ul>
<ol>${t.clauses.map((x) => `<li>${esc(x)}</li>`).join("")}</ol></section>`; };
  return `<!doctype html><html lang="${first.locale}" dir="${dir(first.locale)}"><head><meta charset="utf-8"><style>
${fontFaces(fonts)}
*{box-sizing:border-box}body{font:${two ? "12px/1.45" : "13px/1.5"} 'NH Sans',sans-serif;color:#112127;margin:0}
h1{font-family:'NH Display',Georgia,serif;font-weight:500;font-size:${two ? 21 : 24}px;margin:0 0 4px}.org{color:#525D62;margin-bottom:${two ? 12 : 18}px}
dl{display:grid;grid-template-columns:170px 1fr;gap:${two ? "3px" : "5px"} 16px;margin:0 0 ${two ? 10 : 16}px}dt{color:#525D62}dd{margin:0;font-weight:500}
h2{font-size:${two ? 13 : 14}px;margin:${two ? 10 : 14}px 0 6px}ul,ol{padding-inline-start:18px;margin:0 0 ${two ? 8 : 14}px}li{margin-bottom:${two ? 3 : 5}px}
section.tr{border-top:1px solid #CAC7BF;margin-top:14px;padding-top:12px}.trl{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#525D62;margin-bottom:6px}
.sigw{break-inside:avoid;margin-top:14px}.sigl{font-weight:600;font-size:14px;margin-bottom:6px}
.sig{border:1px solid #CAC7BF;border-radius:8px;height:120px;display:flex;align-items:center;justify-content:center;background:#fff}.sig img{max-height:110px;max-width:90%}
.meta{margin-top:8px;color:#525D62;font-size:11px}.fp,.ltr{direction:ltr;unicode-bidi:isolate}.ltr{display:inline-block}.fp{font-family:ui-monospace,monospace;font-size:9.5px;color:#525D62;word-break:break-all;margin-top:2px}
</style></head><body>
${d.parts.map(part).join("\n")}
<div class="sigw"><div class="sigl">${d.parts.map((p) => `<bdi>${esc(MTEXT[p.locale].signature)}</bdi>`).join(" / ")}</div><div class="sig"><img src="${esc(d.signaturePng)}" alt=""></div>
${d.parts.map((p) => `<div class="meta" lang="${p.locale}" dir="${dir(p.locale)}">${esc(MTEXT[p.locale].signedOn)} ${esc(p.signedAt)}</div>`).join("")}
<div class="meta">${d.parts.map((p) => `<bdi>${esc(MTEXT[p.locale].fingerprint)}</bdi>`).join(" / ")}</div><div class="fp">${esc(d.fingerprint)}</div></div>
</body></html>`;
}
