import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCtx, db } from "@/lib/session";
import { contactName } from "@/lib/data/contacts";
import { cityName } from "@/lib/data/geo";
import { money, num } from "@/lib/format";
import { BulkSend } from "@/components/bulk-send";
import { PageHeader } from "@/components/ui";

export default async function SendPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ p?: string | string[]; q?: string }> }) {
  const { locale } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("send");
  const ids = (Array.isArray(sp.p) ? sp.p : sp.p ? [sp.p] : []).filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 10);
  const q = (sp.q ?? "").trim().slice(0, 60);
  const props = ids.length ? await db(ctx, (tx) => tx`select p.id, p.reference, p.price, p.currency, p.rooms, p.street, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en from public.properties p left join public.geo_places g on g.id = p.city_id where p.id = any(${ids}::uuid[]) and p.status in ('active','under_offer') and p.deleted_at is null`) : [];
  const contacts = await db(ctx, (tx) => tx`select id, first_name, last_name, first_name_he, last_name_he from public.contacts where deleted_at is null and (${q} = '' or search_text like '%' || app.normalize_search(${q}) || '%') order by created_at desc limit 40`);
  return (
    <>
      <PageHeader title={t("bulkTitle")} sub={t("bulkSub", { count: props.length })} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 380px", gap: 20, alignItems: "start" }} className="split">
        <div className="card"><h2>{t("selected")}</h2><div className="card-b col" style={{ gap: 8 }}>{props.length === 0 ? <p className="muted">{t("noneSelected")}</p> : props.map((p) => <div key={p.id} className="row"><span className="ltr note">{p.reference}</span><span className="grow">{p.street} · {cityName({ name_fr: p.city_fr, name_he: p.city_he, name_en: p.city_en }, locale)} · {num(locale, p.rooms)}</span><b className="tab">{money(locale, p.price, p.currency)}</b></div>)}</div></div>
        <div className="card"><h2>{t("recipient")}</h2><div className="card-b col" style={{ gap: 10 }}>
          <form method="get" className="row" style={{ gap: 6 }}>{ids.map((id) => <input key={id} type="hidden" name="p" value={id} />)}<input name="q" defaultValue={q} className="input grow" placeholder={t("searchClient")} aria-label={t("searchClient")} /><button className="btn sm">OK</button></form>
          {props.length > 0 && <BulkSend propertyIds={props.map((p) => p.id)} contacts={contacts.map((c) => ({ id: c.id, label: contactName(c, locale) }))} />}
        </div></div>
      </div>
    </>
  );
}
