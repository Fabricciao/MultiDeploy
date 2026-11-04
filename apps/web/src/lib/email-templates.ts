export type EmailLocale = "fr" | "he" | "en";
export type EmailProperty = { title: string; place: string; price: string; specs: string; url: string };

const T = {
  fr: { subject: (o: string) => `Une sélection de biens pour vous — ${o}`, hi: (n: string) => `Bonjour ${n},`, intro: "Voici les biens qui correspondent à votre recherche :", cta: "Voir la sélection", sign: "À très bientôt,", unsub: "Ne plus recevoir nos sélections", optout: "Vous recevez ce message car vous avez demandé à recevoir des biens de notre agence." },
  he: { subject: (o: string) => `מבחר נכסים עבורך — ${o}`, hi: (n: string) => `שלום ${n},`, intro: "אלה הנכסים שמתאימים לחיפוש שלך:", cta: "לצפייה בבחירה", sign: "בברכה,", unsub: "להסרה מרשימת התפוצה", optout: "קיבלת הודעה זו משום שביקשת לקבל נכסים מהסוכנות שלנו." },
  en: { subject: (o: string) => `A selection of properties for you — ${o}`, hi: (n: string) => `Hello ${n},`, intro: "Here are the properties that match your search:", cta: "View the selection", sign: "Best regards,", unsub: "Stop receiving our selections", optout: "You are receiving this because you asked to receive properties from our agency." },
} as const;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function renderShareEmail(i: { locale: EmailLocale; orgName: string; contactName: string; agentName: string; agentPhone?: string | null; message?: string; properties: EmailProperty[]; selectionUrl: string; unsubscribeUrl: string; accent?: string }) {
  const t = T[i.locale], rtl = i.locale === "he", accent = /^#[0-9a-f]{6}$/i.test(i.accent ?? "") ? i.accent! : "#1f4fd8";
  const cards = i.properties.map((p) => `<tr><td style="padding:0 0 12px"><a href="${esc(p.url)}" style="display:block;text-decoration:none;color:#1b1d24;border:1px solid #e4e6ec;border-radius:10px;padding:14px 16px">
    <div style="font-size:16px;font-weight:600">${esc(p.title)}</div><div style="color:#6b7080;font-size:13px;margin:2px 0 6px">${esc(p.place)}</div>
    <div style="font-size:18px;font-weight:700">${esc(p.price)}</div><div style="color:#6b7080;font-size:13px;margin-top:2px">${esc(p.specs)}</div></a></td></tr>`).join("");
  const html = `<!doctype html><html lang="${i.locale}" dir="${rtl ? "rtl" : "ltr"}"><body style="margin:0;background:#f4f5f8;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" style="max-width:560px;background:#fff;border-radius:12px;padding:28px" cellpadding="0" cellspacing="0" dir="${rtl ? "rtl" : "ltr"}">
<tr><td style="font-size:13px;font-weight:700;color:${accent};padding-bottom:16px">${esc(i.orgName)}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#1b1d24;padding-bottom:12px">${esc(t.hi(i.contactName))}<br>${esc(i.message?.trim() || t.intro)}</td></tr>
<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cards}</table></td></tr>
<tr><td style="padding:8px 0 20px"><a href="${esc(i.selectionUrl)}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${esc(t.cta)}</a></td></tr>
<tr><td style="font-size:14px;color:#1b1d24;line-height:1.5">${esc(t.sign)}<br><b>${esc(i.agentName)}</b>${i.agentPhone ? `<br><span dir="ltr">${esc(i.agentPhone)}</span>` : ""}</td></tr>
<tr><td style="font-size:11px;color:#8a90a2;padding-top:24px;border-top:1px solid #eceef3;margin-top:20px">${esc(t.optout)} <a href="${esc(i.unsubscribeUrl)}" style="color:#8a90a2">${esc(t.unsub)}</a></td></tr>
</table></td></tr></table></body></html>`;
  const text = [t.hi(i.contactName), "", i.message?.trim() || t.intro, "", ...i.properties.map((p) => `• ${p.title} — ${p.place} — ${p.price}\n  ${p.url}`), "", `${t.cta}: ${i.selectionUrl}`, "", t.sign, i.agentName, "", `${t.unsub}: ${i.unsubscribeUrl}`].join("\n");
  return { subject: t.subject(i.orgName), html, text };
}
