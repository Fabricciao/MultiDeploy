import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Pencil, Archive, Target } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCtx } from "@/lib/session";
import { getProperty } from "@/lib/data/properties";
import { cityName } from "@/lib/data/geo";
import { contactName } from "@/lib/data/contacts";
import { dateTime, initials, money, num, relDays } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { Avatar, Badge, PageHeader, Photo } from "@/components/ui";
import { SendForm, type SendItem } from "@/components/send-form";
import { archivePropertyAction } from "../actions";

export default async function PropertyPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("props");
  const ts = await getTranslations("send");
  const tc = await getTranslations("common");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getProperty(ctx, id);
  if (!data) notFound();
  const { p } = data;
  const tr = Object.fromEntries(data.translations.map((x) => [x.locale, x]));
  const title = tr[locale]?.title || tr.fr?.title || tr.he?.title || `${t(`types.${p.property_type}`)} · ${p.street ?? ""}`;
  const desc = tr[locale]?.description || tr.fr?.description || tr.he?.description || "";
  const city = cityName({ name_fr: p.city_fr, name_he: p.city_he, name_en: p.city_en }, locale);
  const m = p.mandate as { type?: string; end?: string } | null;
  const days = m?.type === "exclusive" && m.end ? Math.round((new Date(m.end).getTime() - Date.now()) / 86_400_000) : null;
  const canEdit = ctx.caps.has("properties.write") && (p.agent_id === ctx.userId || ctx.caps.has("properties.write_all"));
  const items: SendItem[] = data.matches.map((x) => ({
    id: x.contact_id, label: contactName(x, locale), score: x.score,
    sub: [x.phones?.[0]?.e164 ? formatPhone(x.phones[0].e164) : null, x.emails?.[0]?.email].filter(Boolean).join(" · "),
    warn: (x.reasons as { code: string; pct?: number }[]).find((r) => r.code === "over_budget") ? t("match.overBudget", { pct: (x.reasons as { code: string; pct?: number }[]).find((r) => r.code === "over_budget")!.pct ?? 0 }) : undefined,
  }));
  const spec = (k: string, v: React.ReactNode) => <div><div className="k">{k}</div><div className="v tab">{v}</div></div>;
  const yes = (b: boolean | null) => (b ? tc("yes") : tc("no"));

  return (
    <>
      <PageHeader title={title} sub={[city, p.street && `${p.street}${p.address_visibility === "exact" && p.house_number ? " " + p.house_number : ""}`].filter(Boolean).join(" · ")}>
        <Badge tone={p.status === "active" ? "ok" : p.status === "under_offer" ? "warn" : ""}><i className="dot" />{t(`status.${p.status}`)}</Badge>
        <span className="badge"><span className="ltr tab">{p.reference}</span></span>
        {days !== null && days >= 0 && days <= 30 && <Badge tone="warn">{t("mandate.expiresIn", { days })}</Badge>}
        {canEdit && <Link href={`/properties/${id}/edit`} className="btn"><Pencil size={14} aria-hidden />{tc("edit")}</Link>}
      </PageHeader>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 20, alignItems: "start" }} className="split">
        <div className="col" style={{ gap: 16 }}>
          <div className="card" style={{ padding: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gridTemplateRows: "140px 140px", gap: 6, borderRadius: 8, overflow: "hidden" }}>
              <div style={{ gridRow: "span 2" }}><Photo seed={id} label={title} /></div>
              {[1, 2, 3, 4].map((k) => <div key={k}><Photo seed={id + k} /></div>)}
            </div>
            <p className="note" style={{ padding: "8px 6px 2px" }}>{t("photosPlaceholder")}</p>
          </div>

          <div className="card"><h2>{t("details")}</h2><div className="card-b"><div className="kv">
            {spec(t("price"), money(locale, p.price, p.currency))}
            {spec(t("rooms"), num(locale, p.rooms))}
            {spec(t("area"), `${num(locale, p.area_built, 0)} ${t("sqm")}`)}
            {spec(t("floor"), <span className="ltr">{p.floor ?? "–"}{p.floors_total ? ` / ${p.floors_total}` : ""}</span>)}
            {spec(t("has.mamad"), yes(p.mamad))}{spec(t("has.parking"), p.parking_count ?? 0)}{spec(t("has.elevator"), yes(p.elevator))}{spec(t("has.sukkah_balcony"), yes(p.sukkah_balcony))}
            {spec(t("form.arnona"), money(locale, p.arnona_monthly))}{spec(t("form.vaad"), money(locale, p.vaad_bayit_monthly))}
            {spec(t("form.registration"), p.registration_type ? t(`form.reg.${p.registration_type}`) : "—")}
            {spec(t("mandateLabel"), m?.type === "exclusive" ? `${t("mandate.exclusive")}${m.end ? ` · ${relDays(locale, m.end)}` : ""}` : t("mandate.non_exclusive"))}
          </div></div></div>

          <div className="card"><h2>{t("form.description")}</h2><div className="card-b col" style={{ gap: 10 }}>
            {desc ? <p style={{ maxWidth: "68ch", lineHeight: 1.7 }}>{desc}</p> : <p className="muted">{t("noDescription")}</p>}
            {tr[locale]?.origin === "ai" && !tr[locale]?.reviewed && <Badge tone="warn">{t("aiNotReviewed")}</Badge>}
          </div></div>

          {p.internal_notes && <div className="card"><h2>{t("form.internalNotes")}</h2><div className="card-b" style={{ whiteSpace: "pre-wrap" }}>{p.internal_notes}</div></div>}
        </div>

        <div className="col" style={{ gap: 16 }}>
          <div className="card"><div className="card-b col" style={{ gap: 12 }}>
            <div><div className="note">{t("askingPrice")}</div><div className="tab" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.02em" }}>{money(locale, p.price, p.currency)}</div>
              {p.price && p.area_built && <div className="note tab">{money(locale, Number(p.price) / Number(p.area_built), p.currency)} / {t("sqm")}</div>}</div>
            <hr className="sw" />
            <div className="row">{p.agent_name && <Avatar text={initials(p.agent_name)} />}<div className="grow"><div style={{ fontWeight: 500 }}>{p.agent_name ?? "—"}</div><div className="note">{t("agent")}</div></div></div>
            {data.owners.map((o) => <div key={o.id + o.relation} className="row"><Avatar text={initials(contactName(o, locale))} /><div className="grow"><Link href={`/clients/${o.id}`} style={{ fontWeight: 500 }}>{contactName(o, locale)}</Link><div className="note">{t(`relation.${o.relation}`)}{o.phones?.[0]?.e164 ? <> · <span className="ltr">{formatPhone(o.phones[0].e164)}</span></> : null}</div></div></div>)}
          </div></div>

          <div className="card"><h2><Target size={15} aria-hidden />{ts("matchingClients")}<span className="badge acc">{items.length}</span></h2>
            {p.status === "active" ? <SendForm mode="property" fixedId={id} items={items} /> : <p className="muted card-b">{ts("onlyActive")}</p>}
          </div>

          {data.visits.length > 0 && <div className="card"><h2>{t("visits")}</h2><div className="card-b col" style={{ gap: 8 }}>{data.visits.map((v) => <div key={v.id} className="row"><span className="grow">{dateTime(locale, v.starts_at)}</span><span className="note">{v.first_name ?? ""} {v.last_name ?? ""}</span></div>)}</div></div>}

          {(ctx.caps.has("properties.delete") || ctx.caps.has("properties.write_all")) && (
            <form action={archivePropertyAction.bind(null, id)}><input type="hidden" name="locale" value={locale} /><button className="btn danger sm"><Archive size={14} aria-hidden />{t("archive")}</button></form>
          )}
        </div>
      </div>
    </>
  );
}
