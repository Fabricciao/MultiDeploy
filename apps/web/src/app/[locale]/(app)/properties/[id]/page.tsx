import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClipboardCheck, Star, FileSignature, Pencil, Archive, Image as ImageIcon, MessageCircle, Send, Sparkles, CalendarCheck, Circle, CircleCheck, Handshake, Eye, ArrowRightLeft, StickyNote, Phone, Globe } from "lucide-react";
import { getPropertyInsights } from "@/lib/data/insights";
import { CopyButton } from "@/components/copy-button";
import { Link } from "@/i18n/navigation";
import { getCtx, db } from "@/lib/session";
import { WhatsAppSend } from "@/components/whatsapp-send";
import { pickName } from "@/lib/data/types";
import { TaskAdd } from "@/components/task-add";
import { getProperty } from "@/lib/data/properties";
import { cityName } from "@/lib/data/geo";
import { contactName } from "@/lib/data/contacts";
import { dateShort, dateTime, initials, money, num, relDays } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { Avatar, Badge, PageHeader, statusTone } from "@/components/ui";
import { SendForm, type SendItem } from "@/components/send-form";
import { hasWhatsApp } from "@/lib/data/connections";
import { PhotoGallery } from "@/components/photo-gallery";
import { listMedia } from "@/lib/data/media";
import { archivePropertyAction } from "../actions";
import { SlipActions } from "@/components/slip-actions";
import { listSlips, siteBase, slipInfo } from "@/lib/data/slips";
import { propertyFeedback } from "@/lib/data/visits";
import { listMandates, mandateLinks } from "@/lib/data/mandates";
import { MandateForm, MandateSend } from "@/components/mandate-panel";
import { cancelMandateAction } from "./mandate-actions";

export default async function PropertyPage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ send?: string; tab?: string }> }) {
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
  const tv = await getTranslations("propV2");
  const tab = ["overview", "clients", "activity", "owner"].includes(sp.tab ?? "") ? sp.tab! : "overview";
  const [ins, slipList, base, fbs] = await Promise.all([getPropertyInsights(ctx, id), listSlips(ctx, { propertyId: id, state: "all", limit: 8 }), siteBase(), propertyFeedback(ctx, id)]);
  const mandates = await listMandates(ctx, id);
  const signedMandate = mandates.find((x) => x.status === "signed");
  const openMandate = mandates.find((x) => x.status === "sent");
  const fbAvg = fbs.length ? fbs.reduce((a, f) => a + Number(f.feedback.rating), 0) / fbs.length : null;
  const fee = p.commission_pct != null ? Number(p.commission_pct) : m?.co_broke || m?.origin === "partner" ? 0 : 2;
  const tabHref = (k: string) => `/properties/${id}${k === "overview" ? "" : `?tab=${k}`}`;
  const sharedTo = new Map(ins.shared.map((s) => [s.contact_id as string, s]));
  const quality = [
    { ok: media.length >= 5, label: tv("q.photos", { n: media.length }), href: undefined },
    { ok: ["fr", "he"].every((l) => tr[l]?.description), label: tv("q.languages"), href: canEdit ? `/properties/${id}/edit` : undefined },
    { ok: !!p.price, label: tv("q.price"), href: canEdit ? `/properties/${id}/edit` : undefined },
    { ok: m?.type === "exclusive" && !!m.end, label: tv("q.mandate"), href: canEdit ? `/properties/${id}/edit` : undefined },
    { ok: data.owners.length > 0, label: tv("q.owner"), href: canEdit ? `/properties/${id}/edit` : undefined },
    { ok: !!p.street && !!p.city_fr, label: tv("q.address"), href: canEdit ? `/properties/${id}/edit` : undefined },
  ];
  const score = Math.round((quality.filter((x) => x.ok).length / quality.length) * 10);
  const nextVisit = data.visits.filter((v) => v.status === "planned" && new Date(v.starts_at).getTime() > Date.now()).at(-1);
  const sqm = p.price && p.area_built ? Number(p.price) / Number(p.area_built) : null;
  const owner = data.owners[0];
  const ownerLocale = owner && ["fr", "he", "en"].includes(owner.preferred_locale) ? (owner.preferred_locale as string) : locale;
  const tr2 = await getTranslations({ locale: ownerLocale, namespace: "propV2" });
  const report = owner ? tr2("report.body", { name: (ownerLocale === "he" ? owner.first_name_he || owner.first_name : owner.first_name || owner.first_name_he) ?? "", place: [p.street, ownerLocale === "he" ? p.city_he : ownerLocale === "en" ? p.city_en : p.city_fr].filter(Boolean).join(", "),
    sent: ins.k.sent, opened: ins.k.opened, visits: ins.k.visits, offers: ins.k.offers, agent: ctx.fullName, agency: pickName(ctx.orgName, ownerLocale) }) : "";
  const ownerPhone = owner?.phones?.[0]?.e164 as string | undefined;
  const tlIcon = (k: string) => ({ visit: <CalendarCheck size={14} aria-hidden />, share: <Send size={14} aria-hidden className="flip" />, deal: <Handshake size={14} aria-hidden />, note: <StickyNote size={14} aria-hidden />, stage_change: <ArrowRightLeft size={14} aria-hidden /> } as Record<string, React.ReactNode>)[k] ?? <ArrowRightLeft size={14} aria-hidden />;
  const tlText = (r: Record<string, any>) => { const n = r.contact_id ? contactName(r, locale) : ""; return r.kind === "visit" ? tv(`tl.visit.${["planned", "done", "cancelled", "no_show"].includes(r.detail) ? r.detail : "planned"}`, { name: n }) : r.kind === "share" ? tv(String(r.detail).endsWith(":opened") ? "tl.shareOpened" : "tl.share", { name: n }) : r.kind === "deal" ? tv("tl.deal", { name: n }) : r.kind === "visit_slip_sent" ? tv("tl.slipSent", { name: n }) : r.kind === "visit_signed" ? tv("tl.signed", { name: n }) : r.kind === "visit_feedback" ? tv("tl.feedback", { name: n }) : r.kind === "mandate_signed" ? tv("tl.mandateSigned") : r.kind === "mandate_sent" ? tv("tl.mandateSent") : r.kind === "mandate_created" ? tv("tl.mandateCreated") : r.kind === "status_change" ? tv("tl.status") : r.kind === "note" ? (r.detail ?? tv("tl.note")) : tv("tl.other"); };

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
        {canSend && <Link href={`/properties/${id}?tab=clients#wa`} className="btn pri" scroll={false}><Send size={14} aria-hidden className="flip" />{ts("sendToClient")}</Link>}
      </PageHeader>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 344px", gap: 16, alignItems: "start" }} className="split">
        <div className="col" style={{ gap: 12, minWidth: 0 }}>
          <PhotoGallery propertyId={id} seed={id} canEdit={canEdit} items={media.map((m) => ({ id: m.id, url: `/api/files/${m.storage_path}`, isCover: m.is_cover }))} />

          <nav className="tabs" aria-label={tv("tabs")}>
            {(["overview", "clients", "activity", "owner"] as const).map((k) => <Link key={k} href={tabHref(k) as "/"} scroll={false} className={tab === k ? "on" : ""} aria-current={tab === k ? "page" : undefined}>{tv(`tab.${k}`)}{k === "clients" && <span className="cnt-b">{items.length}</span>}</Link>)}
          </nav>

          {tab === "overview" && <>
            <div className="card"><h2>{t("details")}</h2><div className="card-b"><div className="kv" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
              {spec(t("rooms"), num(locale, p.rooms))}
              {spec(t("area"), `${num(locale, p.area_built, 0)} ${t("sqm")}`)}
              {spec(t("floor"), <span className="ltr">{p.floor === 0 ? t("ground") : p.floor ?? "–"}{p.floors_total ? ` / ${p.floors_total}` : ""}</span>)}
              {spec(t("has.mamad"), yes(p.mamad))}{spec(t("has.parking"), p.parking_count ?? 0)}{spec(t("has.elevator"), yes(p.elevator))}{spec(t("has.sukkah_balcony"), yes(p.sukkah_balcony))}
              {spec(t("form.arnona"), money(locale, p.arnona_monthly))}{spec(t("form.vaad"), money(locale, p.vaad_bayit_monthly))}
              {spec(t("form.registration"), p.registration_type ? t(`form.reg.${p.registration_type}`) : "—")}
              {spec(t("mandateLabel"), <>{m?.type === "exclusive" ? `${t("mandate.exclusive")}${m.end ? ` · ${relDays(locale, m.end)}` : ""}` : t("mandate.non_exclusive")}{m?.origin === "partner" ? null : signedMandate?.document_path ? <> · <a href={`/api/files/${signedMandate.document_path}`} target="_blank" rel="noreferrer" style={{ color: "var(--accent-text)" }}>{tv("mandate.signedShort")}</a></> : <> · <Link href={tabHref("owner") as "/"} scroll={false} style={{ color: "var(--accent-text)" }}>{openMandate ? tv("mandate.pending") : tv("mandate.toSign")}</Link></>}</>)}
              {spec(t("form.origin"), m?.origin === "partner" ? `${t("origin.partner")}${m.partner ? ` · ${m.partner}` : ""}` : t("origin.own"))}
              {spec(t("form.coBrokeShort"), yes(!!m?.co_broke))}
              {spec(t("form.commission"), <span className="tab">{num(locale, fee, 1)} %{p.commission_pct == null && <span className="note"> · {t("form.commissionAutoShort")}</span>}</span>)}
            </div></div></div>

            <div className="card"><h2>{tv("perf.title")}<small>{tv("perf.sub")}</small></h2><div className="card-b col" style={{ gap: 10 }}>
              <div className="fun">
                <div><b>{ins.k.sent}</b><small>{tv("perf.sent")}</small></div>
                <div><b>{ins.k.opened}</b><small>{tv("perf.opened")}</small></div>
                <div><b>{ins.k.visits}</b><small>{tv("perf.visits")}</small></div>
                <div><b>{ins.k.offers}</b><small>{tv("perf.offers")}</small></div>
              </div>
              <p className="note">{tv("perf.total", { sent: ins.k.sent_all, visits: ins.k.visits_all })}</p>
            </div></div>

            <div className="card" id="slips"><h2><FileSignature size={15} aria-hidden />{tv("slips.title")}<span className="badge">{slipList.counts.signed} / {slipList.counts.signed + slipList.counts.pending}</span><span className="sp" /><Link href="/visit-slips" className="note">{tv("slips.all")}</Link></h2>
              {slipList.rows.length === 0 ? <p className="muted card-b">{tv("slips.empty")}</p> : slipList.rows.map((r) => (
                <div key={r.id} className="li wrap" style={{ gap: 8 }}><div className="grow" style={{ minWidth: 160 }}>{r.contact_id ? <Link href={`/clients/${r.contact_id}`} style={{ fontWeight: 500 }}>{contactName(r, locale)}</Link> : "—"}<small>{dateTime(locale, r.starts_at)}{r.agent_name ? ` · ${r.agent_name}` : ""}</small></div><SlipActions s={slipInfo(ctx, r, base)} sm /></div>))}
            </div>

            <div className="card" id="feedback"><h2><ClipboardCheck size={15} aria-hidden />{tv("fb.title")}{fbAvg !== null && <span className="badge">{num(locale, fbAvg, 1)} / 5 · {tv("fb.count", { n: fbs.length })}</span>}</h2>
              {fbs.length === 0 ? <p className="muted card-b">{tv("fb.empty")}</p> : fbs.map((f) => (
                <div key={f.id} className="fb">
                  <div className="row wrap" style={{ gap: 8 }}>{f.contact_id ? <Link href={`/clients/${f.contact_id}`} style={{ fontWeight: 500 }}>{contactName(f, locale)}</Link> : <b>—</b>}
                    <span className="stars" role="img" aria-label={`${f.feedback.rating} / 5`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={13} aria-hidden className={n <= f.feedback.rating ? "" : "off"} />)}</span>
                    <Badge tone={f.feedback.interest === "offer" ? "ok" : f.feedback.interest === "yes" ? "acc" : ""}>{tv(`fb.i.${f.feedback.interest}`)}</Badge>
                    <span className="note sp">{dateShort(locale, f.starts_at)}{f.agent_name ? ` · ${f.agent_name}` : ""}</span></div>
                  {f.feedback.note && <p style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{f.feedback.note}</p>}
                  {f.feedback.audio_path && <audio controls preload="none" src={`/api/files/${f.feedback.audio_path}`} />}
                </div>))}
            </div>

            <div className="card"><h2>{t("form.description")}</h2><div className="card-b col" style={{ gap: 10 }}>
              {desc ? <p style={{ maxWidth: "68ch", lineHeight: 1.7 }}>{desc}</p> : <p className="muted">{t("noDescription")}</p>}
              {tr[locale]?.origin === "ai" && !tr[locale]?.reviewed && <Badge tone="warn">{t("aiNotReviewed")}</Badge>}
            </div></div>

            {p.internal_notes && <div className="card"><h2>{t("form.internalNotes")}</h2><div className="card-b" style={{ whiteSpace: "pre-wrap" }}>{p.internal_notes}</div></div>}
          </>}

          {tab === "clients" && <>
            <div className="card"><h2><Sparkles size={15} aria-hidden style={{ color: "var(--signal-text)" }} />{ts("matchingClients")}<span className="badge sig">{items.length}</span></h2>
              {p.status === "active" ? <SendForm mode="property" fixedId={id} items={items.map((it) => { const s = sharedTo.get(it.id); return s ? { ...it, sub: [it.sub, s.opened_at ? tv("sentOpened") : tv("sentOn", { d: dateShort(locale, s.created_at) })].filter(Boolean).join(" · ") } : it; })} waApi={await hasWhatsApp(ctx)} /> : <p className="muted card-b">{ts("onlyActive")}</p>}
            </div>
            {canSend && <div className="card" id="wa"><h2><MessageCircle size={15} aria-hidden />{ts("waTitle")}</h2><WhatsAppSend property={waProperty} contacts={waContacts} sign={sign} /></div>}
          </>}

          {tab === "activity" && <div className="card">{ins.timeline.length === 0 ? <p className="muted card-b">{tv("tl.empty")}</p> : <div className="card-b tl">{ins.timeline.map((r) => (
            <div key={r.kind + r.id} className="tl-i"><span className={`tl-d ${r.kind === "share" ? "acc" : r.kind === "visit" ? "ok" : r.kind === "deal" ? "sig" : ""}`}>{tlIcon(r.kind)}</span>
              <div style={{ minWidth: 0 }}>{r.contact_id ? <Link href={`/clients/${r.contact_id}`}><b>{tlText(r)}</b></Link> : <b>{tlText(r)}</b>}<p>{r.actor ?? ""}</p></div><time>{dateShort(locale, r.at)}</time></div>))}</div>}</div>}

          {tab === "owner" && <>
            <div className="card"><h2>{tv("owner.title")}</h2><div className="card-b col" style={{ gap: 12 }}>
              {data.owners.length === 0 ? <p className="muted">{tv("owner.none")}{canEdit && <> <Link href={`/properties/${id}/edit`} style={{ color: "var(--accent-text)" }}>{tc("edit")}</Link></>}</p> : data.owners.map((o) => (
                <div key={o.id + o.relation} className="row gap12"><Avatar text={initials(contactName(o, locale))} cls="lg" /><div className="grow"><Link href={`/clients/${o.id}`} style={{ fontWeight: 600 }}>{contactName(o, locale)}</Link><div className="note">{t(`relation.${o.relation}`)}{o.phones?.[0]?.e164 ? <> · <span className="ltr">{formatPhone(o.phones[0].e164)}</span></> : null}</div></div>
                  {o.phones?.[0]?.e164 && <a className="btn" href={`tel:${o.phones[0].e164}`}><Phone size={14} aria-hidden />{tv("owner.call")}</a>}</div>))}
            </div></div>
            {owner && <div className="card"><h2>{tv("report.title")}<small>{tv("report.sub", { lang: ownerLocale.toUpperCase() })}</small></h2><div className="card-b col" style={{ gap: 12 }}>
              <div className="rep" dir={ownerLocale === "he" ? "rtl" : "ltr"} lang={ownerLocale}>{report}</div>
              <div className="row wrap"><CopyButton text={report} label={tv("report.copy")} done={tv("report.copied")} />
                {ownerPhone && canSend && <a className="btn pri" href={`https://wa.me/${ownerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(report)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} aria-hidden />{tv("report.wa")}</a>}</div>
              <p className="note">{tv("report.hint")}</p>
            </div></div>}
            <div className="card" id="mandate"><h2><FileSignature size={15} aria-hidden />{tv("mandate.title")}<small>{tv("mandate.sub")}</small></h2>
              {mandates.filter((x) => x.status !== "cancelled").map((x) => (
                <div key={x.id} className="li wrap" style={{ gap: 8 }}>
                  <div className="grow" style={{ minWidth: 0 }}><b className="trunc">{x.owner_name}</b><small>{dateShort(locale, x.starts_on)} → {dateShort(locale, x.ends_on)} · {num(locale, x.commission_pct, 2)} %{x.sent_at ? ` · ${tv("mandate.sentOn", { d: dateShort(locale, x.sent_at) })}` : ""}</small></div>
                  {x.status === "signed" ? <><Badge tone="ok"><CircleCheck size={12} aria-hidden />{tv("mandate.signedOn", { d: dateShort(locale, x.signed_at) })}</Badge>{x.document_path && <a className="btn sm" href={`/api/files/${x.document_path}`} target="_blank" rel="noreferrer">{tv("mandate.pdf")}</a>}</>
                    : <><Badge tone="warn">{tv("mandate.pending")}</Badge><MandateSend id={x.id} links={mandateLinks(ctx, x, base)} />
                      {canEdit && <form action={cancelMandateAction.bind(null, id, x.id)}><input type="hidden" name="locale" value={locale} /><button className="btn sm ghost">{tv("mandate.cancel")}</button></form>}</>}
                </div>))}
              {canEdit && !openMandate && <details className="card-b" open={!signedMandate}><summary className="btn sm" style={{ display: "inline-flex" }}>{tv("mandate.new")}</summary><div style={{ marginBlockStart: 12 }}>
                <MandateForm propertyId={id} owners={data.owners.filter((o) => o.relation === "owner").map((o) => ({ id: o.id as string, name: contactName(o, locale) }))} price={p.price ? Number(p.price) : null} commission={fee}
                  license={mandates.find((x) => x.broker_license && x.agent_id === ctx.userId)?.broker_license ?? ""} /></div></details>}
              {!canEdit && mandates.length === 0 && <p className="muted card-b">{tv("mandate.none")}</p>}
            </div>
          </>}
        </div>

        <div className="col" style={{ gap: 12 }}>
          <div className="card"><div className="card-b col" style={{ gap: 12 }}>
            <div><div className="note">{t("askingPrice")}</div><div className="t-price tab">{money(locale, p.price, p.currency)}</div>
              {sqm && <div className="note tab">{money(locale, sqm, p.currency)} / {t("sqm")}</div>}</div>
            {ins.median && sqm && <div className="row" style={{ fontSize: 12.5 }}><span className="muted grow">{tv("median", { n: ins.medianN })}</span><b className="tab">{money(locale, ins.median)} / {t("sqm")}</b></div>}
            {p.price && <div className="row" style={{ fontSize: 12.5 }}><span className="muted grow">{tv("fee", { pct: num(locale, fee, 1) })}</span><b className="tab">{money(locale, Number(p.price) * fee / 100 * 1.18)}</b></div>}
            <hr className="sw" />
            <div className="row">{p.agent_name && <Avatar text={initials(p.agent_name)} />}<div className="grow"><div style={{ fontWeight: 500 }}>{p.agent_name ?? "—"}</div><div className="note">{t("agent")}</div></div></div>
          </div></div>

          <div className="card"><h2><Sparkles size={15} aria-hidden style={{ color: "var(--signal-text)" }} />{ts("matchingClients")}<span className="badge sig">{items.length}</span><Link href={tabHref("clients") as "/"} scroll={false} className="sp">{tv("seeAll")}</Link></h2>
            {items.length === 0 ? <p className="muted card-b">{p.status === "active" ? tv("noMatch") : ts("onlyActive")}</p> : items.slice(0, 4).map((it) => (
              <Link key={it.id} href={`/clients/${it.id}`} className="li"><div className="grow" style={{ minWidth: 0 }}><b className="trunc">{it.label}</b><small>{sharedTo.get(it.id) ? (sharedTo.get(it.id)!.opened_at ? tv("sentOpened") : tv("sentOn", { d: dateShort(locale, sharedTo.get(it.id)!.created_at) })) : tv("notSent")}</small></div><span className="ring" style={{ background: `conic-gradient(var(--signal) ${it.score * 3.6}deg, var(--surface-sunken) 0)` }}><span className="ring-in tab">{it.score}</span></span></Link>))}
          </div>

          <div className="card"><h2>{tv("q.title")}<span className="sp strong tab">{score} / 10</span></h2><div className="card-b" style={{ paddingBlock: 10 }}>
            {quality.map((x) => <div key={x.label} className={`q-row ${x.ok ? "" : "todo"}`}>{x.ok ? <CircleCheck size={15} aria-hidden /> : <Circle size={15} aria-hidden />}<span className="grow">{x.label}</span>{!x.ok && x.href && <Link href={x.href as "/"} style={{ color: "var(--accent-text)", fontWeight: 500 }}>{tv("q.fix")}</Link>}</div>)}
          </div></div>

          {nextVisit && <div className="card"><h2>{tv("nextVisit")}</h2><div className="card-b row gap12"><span className="tl-d acc"><CalendarCheck size={14} aria-hidden /></span><div className="grow"><b style={{ fontWeight: 500 }}>{dateTime(locale, nextVisit.starts_at)}</b><div className="note">{[nextVisit.first_name, nextVisit.last_name].filter(Boolean).join(" ")}</div></div></div></div>}

          {ctx.caps.has("tasks.write") && <div className="card"><h2>{t("taskTitle")}</h2><div className="card-b"><TaskAdd locale={locale} propertyId={id} compact /></div></div>}

          {p.status === "active" && p.public_token && <div className="card"><div className="card-b row gap12"><span className="tl-d acc"><Globe size={14} aria-hidden /></span><div className="grow" style={{ minWidth: 0 }}><b style={{ fontWeight: 500 }}>{tv("public")}</b><div className="note trunc ltr">/l/{p.public_token as string}</div></div><Link className="btn sm" href={`/l/${p.public_token as string}`} target="_blank"><Eye size={13} aria-hidden /></Link></div></div>}

          {(ctx.caps.has("properties.delete") || ctx.caps.has("properties.write_all")) && (
            <form action={archivePropertyAction.bind(null, id)}><input type="hidden" name="locale" value={locale} /><button className="btn danger sm"><Archive size={14} aria-hidden />{t("archive")}</button></form>
          )}
        </div>
      </div>
    </>
  );
}
