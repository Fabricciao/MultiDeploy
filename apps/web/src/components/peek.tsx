import { getTranslations } from "next-intl/server";
import { ChevronDown, ChevronUp, Mail, Maximize2, MessageCircle, Phone, Sparkles, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Ctx } from "@/lib/session";
import { getProperty } from "@/lib/data/properties";
import { contactName, getContact } from "@/lib/data/contacts";
import { cityName } from "@/lib/data/geo";
import { initials, money, num } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { listMedia } from "@/lib/data/media";
import { Avatar, Badge, Cover, statusTone } from "@/components/ui";
import { PeekKeys } from "@/components/shell";

type Nav = { closeHref: string; prevHref: string | null; nextHref: string | null };

function Bar({ nav, full, labels }: { nav: Nav; full: string; labels: { close: string; open: string; prev: string; next: string } }) {
  return (
    <div className="peek-bar">
      <Link href={nav.closeHref as "/"} scroll={false} className="iconbtn" aria-label={labels.close}><X size={17} aria-hidden /></Link>
      <span className="kbd hide-m">Esc</span>
      <span className="sp" />
      {nav.prevHref && <Link href={nav.prevHref as "/"} scroll={false} className="iconbtn" aria-label={labels.prev}><ChevronUp size={17} aria-hidden /></Link>}
      {nav.nextHref && <Link href={nav.nextHref as "/"} scroll={false} className="iconbtn" aria-label={labels.next}><ChevronDown size={17} aria-hidden /></Link>}
      <Link href={full as "/"} className="btn sm"><Maximize2 size={13} aria-hidden />{labels.open}</Link>
      <PeekKeys closeHref={nav.closeHref} prevHref={nav.prevHref} nextHref={nav.nextHref} />
    </div>
  );
}

export async function PropertyPeek({ ctx, id, locale, nav }: { ctx: Ctx; id: string; locale: string; nav: Nav }) {
  const data = await getProperty(ctx, id);
  if (!data) return null;
  const t = await getTranslations("props");
  const ts = await getTranslations("send");
  const tc = await getTranslations("common");
  const { p } = data;
  const media = await listMedia(ctx, id);
  const tr = Object.fromEntries(data.translations.map((x) => [x.locale, x]));
  const title = tr[locale]?.title || tr.fr?.title || tr.he?.title || `${t(`types.${p.property_type}`)} · ${p.street ?? ""}`;
  const city = cityName({ name_fr: p.city_fr, name_he: p.city_he, name_en: p.city_en }, locale);
  const m = p.mandate as { type?: string; origin?: string; co_broke?: boolean } | null;
  const kv = (k: string, v: React.ReactNode) => <div><div className="k">{k}</div><div className="v tab">{v}</div></div>;
  return (
    <aside className="drawer peek" aria-label={title}>
      <Bar nav={nav} full={`/properties/${id}`} labels={{ close: tc("close"), open: tc("openRecord"), prev: tc("prev"), next: tc("next") }} />
      <div style={{ overflow: "auto", flex: 1 }}>
        <div style={{ height: 210 }}><Cover path={media[0]?.storage_path} full /></div>
        <div className="col" style={{ padding: "16px 20px", gap: 10 }}>
          <div className="row wrap"><Badge tone={statusTone(p.status)}><i className="dot" />{t(`status.${p.status}`)}</Badge>{m?.type === "exclusive" && <Badge tone="acc">{t("mandate.exclusive")}</Badge>}{m?.origin === "partner" && <Badge tone="info">{t("origin.partner")}</Badge>}{m?.co_broke && <Badge tone="sig">{t("origin.coBrokeTag")}</Badge>}</div>
          <div><h2 className="t-page" style={{ fontSize: 22, lineHeight: "28px" }}>{title}</h2><p className="note">{city} · <span className="ltr tab">{p.reference}</span></p></div>
          <div><div className="t-price">{money(locale, p.price, p.currency)}</div>{p.price && p.area_built && <div className="note tab">{money(locale, Number(p.price) / Number(p.area_built), p.currency)} / {t("sqm")}</div>}</div>
          <div className="kv" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            {kv(t("rooms"), num(locale, p.rooms))}{kv(t("area"), `${num(locale, p.area_built, 0)} ${t("sqm")}`)}{kv(t("floor"), <span className="ltr">{p.floor === 0 ? t("ground") : p.floor ?? "–"}{p.floors_total ? ` / ${p.floors_total}` : ""}</span>)}
            {kv(t("has.mamad"), p.mamad ? tc("yes") : tc("no"))}{kv(t("has.parking"), p.parking_count ?? 0)}{kv(t("has.elevator"), p.elevator ? tc("yes") : tc("no"))}
          </div>
          {data.matches.length > 0 && (
            <div className="ai-panel"><Sparkles size={15} aria-hidden style={{ color: "var(--signal-text)", marginBlockStart: 2 }} /><div className="grow"><div style={{ fontWeight: 500, color: "var(--signal-text)" }}>{ts("matchingClients")} · {data.matches.length}</div><div className="note">{data.matches.slice(0, 3).map((x) => contactName(x, locale)).join(", ")}</div></div><Link href={`/properties/${id}`} className="btn sm">{ts("send")}</Link></div>
          )}
        </div>
      </div>
    </aside>
  );
}

export async function ClientPeek({ ctx, id, locale, nav }: { ctx: Ctx; id: string; locale: string; nav: Nav }) {
  const data = await getContact(ctx, id);
  if (!data) return null;
  const tk = await getTranslations("clients");
  const tp = await getTranslations("props");
  const ts = await getTranslations("send");
  const tc = await getTranslations("common");
  const { c } = data;
  const name = contactName(c, locale);
  const phone = c.phones?.[0]?.e164 as string | undefined;
  const email = c.emails?.[0]?.email as string | undefined;
  return (
    <aside className="drawer peek" aria-label={name}>
      <Bar nav={nav} full={`/clients/${id}`} labels={{ close: tc("close"), open: tc("openRecord"), prev: tc("prev"), next: tc("next") }} />
      <div className="col" style={{ overflow: "auto", flex: 1, padding: 20, gap: 14 }}>
        <div className="row gap12"><Avatar text={initials(name)} cls="lg" /><div className="grow"><h2 className="t-page" style={{ fontSize: 22, lineHeight: "28px" }}>{name}</h2><div className="row wrap gap4" style={{ marginBlockStart: 4 }}>{(c.kinds as string[]).map((k) => <Badge key={k} tone="acc">{tk(`kind.${k}`)}</Badge>)}<Badge>{String(c.preferred_locale).toUpperCase()}</Badge></div></div></div>
        <div className="row wrap">
          {phone && <a className="btn sm" href={`tel:${phone}`}><Phone size={13} aria-hidden />{tk("call")}</a>}
          {phone && <a className="btn sm" href={`https://wa.me/${phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={13} aria-hidden />WhatsApp</a>}
          {email && <a className="btn sm" href={`mailto:${email}`}><Mail size={13} aria-hidden />E-mail</a>}
        </div>
        {phone && <div className="note"><span className="ltr tab">{formatPhone(phone)}</span>{email ? <> · <span className="ltr">{email}</span></> : null}</div>}
        {data.profiles.slice(0, 1).map((p) => (
          <div key={p.id} className="kv" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div><div className="k">{tk("budget")}</div><div className="v tab">{p.price_max ? `≤ ${money(locale, p.price_max, p.currency)}` : "—"}</div></div>
            <div><div className="k">{tp("rooms")}</div><div className="v tab">{num(locale, p.rooms_min)} – {num(locale, p.rooms_max)}</div></div>
            <div style={{ gridColumn: "span 2" }}><div className="k">{tp("filters.cities")}</div><div className="v">{(p.cities as { fr: string; he: string; en: string }[]).map((x) => cityName({ name_fr: x.fr, name_he: x.he, name_en: x.en }, locale)).join(", ") || "—"}</div></div>
          </div>
        ))}
        {data.matches.length > 0 && <div className="ai-panel"><Sparkles size={15} aria-hidden style={{ color: "var(--signal-text)", marginBlockStart: 2 }} /><div className="grow"><div style={{ fontWeight: 500, color: "var(--signal-text)" }}>{ts("matchingProperties")} · {data.matches.length}</div></div><Link href={`/clients/${id}`} className="btn sm">{ts("send")}</Link></div>}
      </div>
    </aside>
  );
}
