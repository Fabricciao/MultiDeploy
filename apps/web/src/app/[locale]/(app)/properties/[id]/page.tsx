import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Pencil, Archive, Image as ImageIcon, MessageCircle, Send, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCtx, db } from "@/lib/session";
import { WhatsAppSend } from "@/components/whatsapp-send";
import { pickName } from "@/lib/data/types";
import { TaskAdd } from "@/components/task-add";
import { getProperty } from "@/lib/data/properties";
import { cityName } from "@/lib/data/geo";
import { contactName } from "@/lib/data/contacts";
import { dateTime, initials, money, num, relDays } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { Avatar, Badge, PageHeader, statusTone } from "@/components/ui";
import { SendForm, type SendItem } from "@/components/send-form";
import { hasWhatsApp } from "@/lib/data/connections";
import { PhotoGallery } from "@/components/photo-gallery";
import { listMedia } from "@/lib/data/media";
import { archivePropertyAction } from "../actions";

export default async function PropertyPage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ send?: string }> }) {
  const { locale, id } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("props");
  const ts = await getTranslations("send");
  const tc = await getTranslations("common");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getProperty(ctx, id);
  if (!data) notFound();
  const { p } = data;
  const media = await listMedia(ctx, id);
  const tr = Object.fromEntries(data.translations.map((x) => [x.locale, x]));
  const title = tr[locale]?.title || tr.fr?.title || tr.he?.title || `${t(`types.${p.property_type}`)} · ${p.street ?? ""}`;
  const desc = tr[locale]?.description || tr.fr?.description || tr.he?.description || "";
  const city = cityName({ name_fr: p.city_fr, name_he: p.city_he, name_en: p.city_en }, locale);
  const m = p.mandate as { type?: string; end?: string; origin?: string; partner?: string; co_broke?: boolean } | null;
  const days = m?.type === "exclusive" && m.end ? Math.round((new Date(m.end).getTime() - Date.now()) / 86_400_000) : null;
  const canEdit = ctx.caps.has("properties.write") && (p.agent_id === ctx.userId || ctx.caps.has("properties.write_all"));
  const items: SendItem[] = data.matches.map((x) => ({
    id: x.contact_id, label: contactName(x, locale), score: x.score,
    sub: [x.phones?.[0]?.e164 ? formatPhone(x.phones[0].e164) : null, x.emails?.[0]?.email].filter(Boolean).join(" · "),
    warn: (x.reasons as { code: string; pct?: number }[]).find((r) => r.code === "over_budget") ? t("match.overBudget", { pct: (x.reasons as { code: string; pct?: number }[]).find((r) => r.code === "over_budget")!.pct ?? 0 }) : undefined,
  }));
  const canSend = ctx.caps.has("shares.send") && !ctx.impersonating;
  const waContacts = canSend ? ((await db(ctx, (tx) => tx`select id, first_name, last_name, first_name_he, last_name_he, preferred_locale, phones from public.contacts
      where deleted_at is null and not do_not_contact and jsonb_array_length(coalesce(phones, '[]'::jsonb)) > 0 order by updated_at desc limit 400`)) as unknown as Record<string, any>[])
    .filter((c) => c.phones?.[0]?.e164).map((c) => ({ id: c.id as string, label: `${contactName(c, locale)} · ${formatPhone(c.phones[0].e164)}`, first: (c.preferred_locale === "he" ? c.first_name_he || c.first_name : c.first_name || c.first_name_he) ?? "", phone: c.phones[0].e164 as string, locale: c.preferred_locale as string })) : [];
  const place = (l: "fr" | "he" | "en") => [p.address_visibility === "hidden" || p.address_visibility === "neighborhood" ? null : p.street, l === "he" ? p.city_he : l === "en" ? p.city_en : p.city_fr].filter(Boolean).join(", ");
  const waProperty = { id, token: p.status === "active" ? (p.public_token as string | null) : null, titles: Object.fromEntries(data.translations.filter((x) => x.title).map((x) => [x.locale, x.title!])) as Record<string, string>,
    place: { fr: place("fr"), he: place("he"), en: place("en") }, price: p.price ? Number(p.price) : null, currency: (p.currency as string) ?? "ILS", rent: String(p.transaction).includes("rent"), rooms: p.rooms ? String(Number(p.rooms)) : "", area: p.area_built ? String(Math.round(Number(p.area_built))) : "" };
  const sign = [ctx.fullName, pickName(ctx.orgName, locale)].filter(Boolean).join(" · ");
  const spec = (k: string, v: React.ReactNode) => <div><div className="k">{k}</div><div className="v tab">{v}</div></div>;
  const yes = (b: boolean | null) => (b ? tc("yes") : tc("no"));

  return (
    <>
      <PageHeader title={title} sub={[city, p.street && `${p.street}${p.address_visibility === "exact" && p.house_number ? " " + p.house_number : ""}`].filter(Boolean).join(" · ")}>
        <Badge tone={statusTone(p.status)}><i className="dot" />{t(`status.${p.status}`)}</Badge>
        <span className="badge"><span className="ltr tab">{p.reference}</span></span>
        {days !== null && days >= 0 && days <= 30 && <Badge tone="warn">{t("mandate.expiresIn", { days })}</Badge>}
        {m?.origin === "partner" && <Badge tone="info">{t("origin.partner")}</Badge>}
        {m?.co_broke && <Badge tone="sig">{t("origin.coBrokeTag")}</Badge>}
        {ctx.caps.has("posters.create") && p.status !== "draft" && <Link href={`/properties/${id}/poster`} className="btn"><ImageIcon size={14} aria-hidden />{t("poster")}</Link>}
        {canEdit && <Link href={`/properties/${id}/edit`} className="btn"><Pencil size={14} aria-hidden />{tc("edit")}</Link>}
        {canSend && <Link href={`/properties/${id}?send=wa#wa`} className="btn pri" scroll={false}><Send size={14} aria-hidden className="flip" />{ts("sendToClient")}</Link>}
      </PageHeader>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 20, alignItems: "start" }} className="split">
        <div className="col" style={{ gap: 16 }}>
          <PhotoGallery propertyId={id} seed={id} canEdit={canEdit} items={media.map((m) => ({ id: m.id, url: `/api/files/${m.storage_path}`, isCover: m.is_cover }))} />

          <div className="card"><h2>{t("details")}</h2><div className="card-b"><div className="kv">
            {spec(t("price"), money(locale, p.price, p.currency))}
            {spec(t("rooms"), num(locale, p.rooms))}
            {spec(t("area"), `${num(locale, p.area_built, 0)} ${t("sqm")}`)}
            {spec(t("floor"), <span className="ltr">{p.floor === 0 ? t("ground") : p.floor ?? "–"}{p.floors_total ? ` / ${p.floors_total}` : ""}</span>)}
            {spec(t("has.mamad"), yes(p.mamad))}{spec(t("has.parking"), p.parking_count ?? 0)}{spec(t("has.elevator"), yes(p.elevator))}{spec(t("has.sukkah_balcony"), yes(p.sukkah_balcony))}
            {spec(t("form.arnona"), money(locale, p.arnona_monthly))}{spec(t("form.vaad"), money(locale, p.vaad_bayit_monthly))}
            {spec(t("form.registration"), p.registration_type ? t(`form.reg.${p.registration_type}`) : "—")}
            {spec(t("mandateLabel"), m?.type === "exclusive" ? `${t("mandate.exclusive")}${m.end ? ` · ${relDays(locale, m.end)}` : ""}` : t("mandate.non_exclusive"))}
            {spec(t("form.origin"), m?.origin === "partner" ? `${t("origin.partner")}${m.partner ? ` · ${m.partner}` : ""}` : t("origin.own"))}
            {spec(t("form.coBrokeShort"), yes(!!m?.co_broke))}
          </div></div></div>

          <div className="card"><h2>{t("form.description")}</h2><div className="card-b col" style={{ gap: 10 }}>
            {desc ? <p style={{ maxWidth: "68ch", lineHeight: 1.7 }}>{desc}</p> : <p className="muted">{t("noDescription")}</p>}
            {tr[locale]?.origin === "ai" && !tr[locale]?.reviewed && <Badge tone="warn">{t("aiNotReviewed")}</Badge>}
          </div></div>

          {p.internal_notes && <div className="card"><h2>{t("form.internalNotes")}</h2><div className="card-b" style={{ whiteSpace: "pre-wrap" }}>{p.internal_notes}</div></div>}
        </div>

        <div className="col" style={{ gap: 16 }}>
          <div className="card"><div className="card-b col" style={{ gap: 12 }}>
            <div><div className="note">{t("askingPrice")}</div><div className="t-price tab">{money(locale, p.price, p.currency)}</div>
              {p.price && p.area_built && <div className="note tab">{money(locale, Number(p.price) / Number(p.area_built), p.currency)} / {t("sqm")}</div>}</div>
            <hr className="sw" />
            <div className="row">{p.agent_name && <Avatar text={initials(p.agent_name)} />}<div className="grow"><div style={{ fontWeight: 500 }}>{p.agent_name ?? "—"}</div><div className="note">{t("agent")}</div></div></div>
            {data.owners.map((o) => <div key={o.id + o.relation} className="row"><Avatar text={initials(contactName(o, locale))} /><div className="grow"><Link href={`/clients/${o.id}`} style={{ fontWeight: 500 }}>{contactName(o, locale)}</Link><div className="note">{t(`relation.${o.relation}`)}{o.phones?.[0]?.e164 ? <> · <span className="ltr">{formatPhone(o.phones[0].e164)}</span></> : null}</div></div></div>)}
          </div></div>

          {canSend && <div className="card" id="wa" style={sp.send === "wa" ? { outline: "2px solid var(--accent)", outlineOffset: 2 } : undefined}><h2><MessageCircle size={15} aria-hidden />{ts("waTitle")}</h2>
            <WhatsAppSend property={waProperty} contacts={waContacts} sign={sign} /></div>}

          <div className="card"><h2><Sparkles size={15} aria-hidden />{ts("matchingClients")}<span className="badge sig">{items.length}</span></h2>
            {p.status === "active" ? <SendForm mode="property" fixedId={id} items={items} waApi={await hasWhatsApp(ctx)} /> : <p className="muted card-b">{ts("onlyActive")}</p>}
          </div>

          {ctx.caps.has("tasks.write") && <div className="card"><h2>{t("taskTitle")}</h2><div className="card-b"><TaskAdd locale={locale} propertyId={id} compact /></div></div>}

          {data.visits.length > 0 && <div className="card"><h2>{t("visits")}</h2><div className="card-b col" style={{ gap: 8 }}>{data.visits.map((v) => <div key={v.id} className="row"><span className="grow">{dateTime(locale, v.starts_at)}</span><span className="note">{v.first_name ?? ""} {v.last_name ?? ""}</span></div>)}</div></div>}

          {(ctx.caps.has("properties.delete") || ctx.caps.has("properties.write_all")) && (
            <form action={archivePropertyAction.bind(null, id)}><input type="hidden" name="locale" value={locale} /><button className="btn danger sm"><Archive size={14} aria-hidden />{t("archive")}</button></form>
          )}
        </div>
      </div>
    </>
  );
}
