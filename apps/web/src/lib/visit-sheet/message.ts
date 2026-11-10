import type { Loc } from "./html";

/** Message préenregistré qui accompagne le lien du bon de visite, dans la langue du client. */
export type SlipMsgIn = { first: string; address: string; date: string; url: string; agent: string; org: string };

const T: Record<Loc, { hi: (n: string) => string; body: (a: string, d: string) => string; sign: string; subject: (o: string) => string; cta: string; foot: string }> = {
  fr: { hi: (n) => (n ? `Bonjour ${n},` : "Bonjour,"), body: (a, d) => `Voici votre bon de visite pour le bien ${a} (visite du ${d}). Vous pouvez le signer en ligne en une minute :`, sign: "Merci et à bientôt,", subject: (o) => `Votre bon de visite — ${o}`, cta: "Signer le bon de visite", foot: "Le lien est personnel et valable 7 jours." },
  he: { hi: (n) => (n ? `שלום ${n},` : "שלום,"), body: (a, d) => `מצורף טופס הביקור עבור הנכס ${a} (ביקור ב־${d}). אפשר לחתום עליו אונליין בדקה:`, sign: "תודה ולהתראות,", subject: (o) => `טופס הביקור שלך — ${o}`, cta: "לחתימה על טופס הביקור", foot: "הקישור אישי ובתוקף ל־7 ימים." },
  en: { hi: (n) => (n ? `Hello ${n},` : "Hello,"), body: (a, d) => `Here is your viewing form for ${a} (viewing on ${d}). You can sign it online in one minute:`, sign: "Thank you, speak soon,", subject: (o) => `Your viewing form — ${o}`, cta: "Sign the viewing form", foot: "This link is personal and valid for 7 days." },
};

export function slipMessage(l: Loc, i: SlipMsgIn): string {
  const t = T[l];
  return [t.hi(i.first), `${t.body(i.address, i.date)} ${i.url}`, "", [i.agent, i.org].filter(Boolean).join(" · ")].join("\n").trim();
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function slipEmail(l: Loc, i: SlipMsgIn & { accent?: string }): { subject: string; html: string; text: string } {
  const t = T[l], rtl = l === "he", accent = /^#[0-9a-f]{6}$/i.test(i.accent ?? "") ? i.accent! : "#005C73";
  const html = `<!doctype html><html lang="${l}" dir="${rtl ? "rtl" : "ltr"}"><body style="margin:0;background:#EFECE8;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" style="max-width:560px;background:#fff;border-radius:12px;padding:28px" cellpadding="0" cellspacing="0" dir="${rtl ? "rtl" : "ltr"}">
<tr><td style="font-family:Georgia,serif;font-size:18px;font-weight:600;color:#112127;padding-bottom:16px">${esc(i.org)}</td></tr>
<tr><td style="font-size:15px;color:#112127;line-height:1.55;padding-bottom:8px">${esc(t.hi(i.first))}</td></tr>
<tr><td style="font-size:15px;color:#112127;line-height:1.55;padding-bottom:20px">${esc(t.body(i.address, i.date))}</td></tr>
<tr><td style="padding-bottom:20px"><a href="${esc(i.url)}" style="display:inline-block;background:${accent};color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">${esc(t.cta)}</a></td></tr>
<tr><td style="font-size:13px;color:#525D62;padding-bottom:20px">${esc(t.foot)}</td></tr>
<tr><td style="font-size:14px;color:#112127;line-height:1.5">${esc(t.sign)}<br><b>${esc(i.agent)}</b></td></tr>
</table></td></tr></table></body></html>`;
  const text = [t.hi(i.first), "", t.body(i.address, i.date), i.url, "", t.foot, "", t.sign, i.agent, i.org].join("\n");
  return { subject: t.subject(i.org), html, text };
}
