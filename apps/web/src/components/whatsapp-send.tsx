"use client";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";
import { logWhatsAppAction } from "@/app/[locale]/(app)/send-action";

export type WaContact = { id: string; label: string; first: string; phone: string; locale: string };
export type WaProperty = { id: string; token: string | null; titles: Record<string, string>; place: Record<string, string>; price: number | null; currency: string; rent: boolean; rooms: string; area: string };

const L = (l: string) => (l === "he" || l === "en" ? l : "fr");
const TXT = {
  fr: { hello: (n: string) => `Bonjour${n ? ` ${n}` : ""},`, intro: "voici un bien qui pourrait vous intéresser :", rooms: "pièces", more: "Photos et détails :", month: "/ mois", loc: "fr-FR" },
  en: { hello: (n: string) => `Hello${n ? ` ${n}` : ""},`, intro: "here is a property you may like:", rooms: "rooms", more: "Photos and details:", month: "/ month", loc: "en-IL" },
  he: { hello: (n: string) => `שלום${n ? ` ${n}` : ""},`, intro: "מצאתי נכס שעשוי לעניין אותך:", rooms: "חדרים", more: "תמונות ופרטים:", month: "לחודש", loc: "he-IL" },
} as const;

/** Message prérédigé dans la langue du client. */
export function waMessage(p: WaProperty, c: { first: string; locale: string }, origin: string, sign: string) {
  const l = L(c.locale), t = TXT[l];
  const title = p.titles[l] || p.titles.fr || p.titles.he || p.titles.en || "";
  const price = p.price ? `${new Intl.NumberFormat(t.loc, { style: "currency", currency: p.currency || "ILS", maximumFractionDigits: 0 }).format(p.price)}${p.rent ? ` ${t.month}` : ""}` : "";
  const lines = [t.hello(c.first), t.intro, "", title && `🏠 ${title}`, p.place[l] && `📍 ${p.place[l]}`, price && `💰 ${price}`, [p.rooms && `${p.rooms} ${t.rooms}`, p.area && `${p.area} m²`].filter(Boolean).join(" · "),
    p.token ? `\n${t.more} ${origin}/${l}/l/${p.token}` : "", sign && `\n${sign}`];
  return lines.filter(Boolean).join("\n").replace(/\n{3,}/g, "\n\n");
}

/** Envoyer un bien à un client par WhatsApp : ouvre WhatsApp (application ou WhatsApp Web) avec le message prêt, vers le numéro du client. Aucune connexion API requise. */
export function WhatsAppSend({ property, contacts, sign }: { property: WaProperty; contacts: WaContact[]; sign: string }) {
  const t = useTranslations("send");
  const locale = useLocale();
  const [cid, setCid] = useState("");
  const [manual, setManual] = useState("");
  const [text, setText] = useState("");
  const [edited, setEdited] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const c = contacts.find((x) => x.id === cid);
  const draft = useMemo(() => waMessage(property, { first: c?.first ?? "", locale: c?.locale ?? locale }, origin, sign), [property, c, origin, sign, locale]);
  useEffect(() => { if (!edited) setText(draft); }, [draft, edited]);
  const digits = (c?.phone ?? manual).replace(/\D/g, "").replace(/^0/, "972");
  const href = digits.length >= 9 ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
  return (
    <div className="card-b col" style={{ gap: 10 }}>
      <select className="input" value={cid} onChange={(e) => setCid(e.target.value)} aria-label={t("waClient")}>
        <option value="">{t("waPick")}</option>
        {contacts.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
      </select>
      {!cid && <input className="input ltr" dir="ltr" inputMode="tel" placeholder={t("waPhone")} value={manual} onChange={(e) => setManual(e.target.value)} aria-label={t("waPhone")} />}
      <textarea className="input" rows={8} value={text} onChange={(e) => { setText(e.target.value); setEdited(true); }} aria-label={t("waMessage")} />
      {edited && <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={() => setEdited(false)}>{t("waReset")}</button>}
      {href ? (
        <a className="btn pri" href={href} target="_blank" rel="noopener noreferrer" onClick={() => { if (c) void logWhatsAppAction(locale, c.id, property.id); }}><MessageCircle size={15} aria-hidden />{t("waOpen")}</a>
      ) : <button type="button" className="btn pri" disabled><MessageCircle size={15} aria-hidden />{t("waOpen")}</button>}
      <p className="note">{property.token ? t("waHint") : t("waNoLink")}</p>
    </div>
  );
}
