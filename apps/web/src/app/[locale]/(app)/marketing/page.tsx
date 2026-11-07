import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download, Image as ImageIcon, Share2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCtx } from "@/lib/session";
import { aiBalance, listAgencyPosters, marketingStats, propertiesWithoutPoster } from "@/lib/data/posters";
import { listConnections } from "@/lib/data/connections";
import { cityName } from "@/lib/data/geo";
import { dateShort, money, num } from "@/lib/format";
import { Badge, Cover, PageHeader } from "@/components/ui";

const FORMATS = ["square", "portrait", "story", "facebook", "a4"] as const;

export default async function MarketingPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ format?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("marketing");
  const format = (FORMATS as readonly string[]).includes(sp.format ?? "") ? sp.format! : null;
  const canCreate = ctx.caps.has("posters.create");
  const [posters, stats, todo, balance, conns] = await Promise.all([
    listAgencyPosters(ctx, format), marketingStats(ctx), propertiesWithoutPoster(ctx), aiBalance(ctx).catch(() => 0),
    canCreate && !ctx.impersonating ? listConnections(ctx).catch(() => []) : Promise.resolve([]),
  ]);
  const place = (r: Record<string, any>) => [r.street, cityName({ name_fr: r.city_fr, name_he: r.city_he, name_en: r.city_en }, locale)].filter(Boolean).join(", ");
  const connected = conns.filter((c) => (c.provider === "facebook" || c.provider === "instagram") && c.status === "connected").length;
  const kpi = (label: string, value: React.ReactNode) => <div className="card kpi"><div className="k">{label}</div><div className="v">{value}</div></div>;
  return (
    <>
      <PageHeader title={t("title")} sub={t("sub")} />
      <div className="kpis">
        {kpi(t("kpi.total"), num(locale, stats.total, 0))}{kpi(t("kpi.month"), num(locale, stats.month, 0))}{kpi(t("kpi.todo"), num(locale, stats.todo, 0))}{kpi(t("kpi.credits"), num(locale, balance, 0))}
      </div>
      <div className="split" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 16, alignItems: "start" }}>
        <section>
          <div className="row wrap" style={{ marginBlockEnd: 12 }}>
            <Link href="/marketing" className={`chip ${format ? "" : "on"}`}>{t("all")}</Link>
            {FORMATS.map((f) => <Link key={f} href={`/marketing?format=${f}`} className={`chip ${format === f ? "on" : ""}`}>{t(`formats.${f}`)}</Link>)}
          </div>
          {posters.length === 0 ? (
            <div className="card empty"><ImageIcon size={24} strokeWidth={1.75} aria-hidden /><h3>{t(format ? "emptyFormat" : "empty")}</h3><p>{t("emptyHint")}</p></div>
          ) : (
            <div className="posters">
              {posters.map((p) => (
                <article key={p.id} className="poster">
                  <a href={`/api/files/${p.output_path}`} target="_blank" rel="noreferrer" className="poster-ph" aria-label={t("open")}><img src={`/api/files/${p.output_path}`} alt="" loading="lazy" /></a>
                  <div className="poster-b">
                    <Link href={`/properties/${p.property_id}/poster`} className="trunc" style={{ fontWeight: 500, display: "block" }}>{place(p) || p.reference}</Link>
                    <div className="note"><span className="ltr tab">{p.reference}</span> · {dateShort(locale, p.created_at)}</div>
                    <div className="row" style={{ marginBlockStart: 6 }}><Badge>{t(`formats.${p.format}`)}</Badge><Badge>{String(p.locale).toUpperCase()}</Badge><a href={`/api/files/${p.output_path}`} download className="btn sm icon sp" aria-label={t("download")} title={t("download")}><Download size={14} aria-hidden /></a></div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="col" style={{ gap: 12 }}>
          {canCreate && (
            <section className="card"><h2>{t("create")}<span className="cnt-b">{stats.todo}</span></h2>
              {todo.length === 0 ? <p className="muted card-b">{t("allDone")}</p> : todo.map((p) => (
                <Link key={p.id} href={`/properties/${p.id}/poster`} className="li">
                  <div className="thumb" style={{ width: 48, height: 40 }}><Cover path={p.cover_thumb} /></div>
                  <div className="grow"><b className="trunc">{place(p) || p.reference}</b><small className="tab">{money(locale, p.price, p.currency)}</small></div>
                  <span className="btn sm">{t("createOne")}</span>
                </Link>
              ))}
              <div style={{ padding: "10px 16px" }}><Link href="/properties?status=active" className="note">{t("otherProperty")}</Link></div>
            </section>
          )}
          {canCreate && !ctx.impersonating && (
            <section className="card"><h2><Share2 size={15} aria-hidden />{t("social")}</h2>
              <div className="card-b col" style={{ gap: 10 }}>
                <p className="note">{t(connected ? "socialOn" : "socialOff")}</p>
                <Link href="/settings/connections" className="btn sm" style={{ alignSelf: "flex-start" }}>{t("socialManage")}</Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
