import { esc, fontFaces, type PosterFonts } from "../poster/html";
import type { Loc } from "../visit-sheet/html";

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

export type MandateDoc = { locale: Loc; orgName: string; broker: string; license: string; owner: string; idNumber: string; ownerAddress: string; reference: string; address: string; price: string; from: string; to: string; pct: string;
  actions: MandateAction[]; signaturePng: string; signedAt: string; fingerprint: string };

export function mandateHtml(d: MandateDoc, fonts: PosterFonts): string {
  const t = MTEXT[d.locale], rtl = d.locale === "he";
  const row = (k: string, v: string) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`;
  return `<!doctype html><html lang="${d.locale}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><style>
${fontFaces(fonts)}
*{box-sizing:border-box}body{font:13px/1.5 'NH Sans',sans-serif;color:#112127;margin:0}
h1{font-family:'NH Display',Georgia,serif;font-weight:500;font-size:24px;margin:0 0 4px}.org{color:#525D62;margin-bottom:18px}
dl{display:grid;grid-template-columns:170px 1fr;gap:5px 16px;margin:0 0 16px}dt{color:#525D62}dd{margin:0;font-weight:500}
h2{font-size:14px;margin:14px 0 6px}ul,ol{padding-inline-start:18px;margin:0 0 14px}li{margin-bottom:5px}
.sig{border:1px solid #CAC7BF;border-radius:8px;height:120px;display:flex;align-items:center;justify-content:center;background:#fff;margin-top:6px}.sig img{max-height:110px;max-width:90%}
.meta{margin-top:10px;color:#525D62;font-size:11px}.fp,.ltr{direction:ltr;unicode-bidi:isolate}.fp{font-family:ui-monospace,monospace}
</style></head><body>
<h1>${esc(t.title)}</h1><div class="org">${esc(d.orgName)}</div>
<dl>${row(t.agency, d.orgName)}${row(t.broker, d.broker)}${d.license ? row(t.license, d.license) : ""}${row(t.owner, d.owner)}${row(t.idNumber, d.idNumber)}${row(t.address, d.ownerAddress)}
${row(t.property, `${d.reference} — ${d.address}`)}${d.price ? row(t.price, d.price) : ""}${row(t.period, `${t.from} ${d.from} ${t.to} ${d.to}`)}${row(t.fee, t.feeVal(d.pct))}</dl>
<h2>${esc(t.actionsTitle)}</h2><ul>${d.actions.map((a) => `<li>${esc(t.actions[a])}</li>`).join("")}</ul>
<ol>${t.clauses.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
<h2>${esc(t.signature)}</h2><div class="sig"><img src="${esc(d.signaturePng)}" alt=""></div>
<div class="meta">${esc(t.signedOn)} ${esc(d.signedAt)} · ${esc(t.fingerprint)}: <span class="fp">${esc(d.fingerprint)}</span></div>
</body></html>`;
}
