import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { sql } from "@/lib/db";
import { ingestLead } from "@/lib/api/leads";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { cityName } from "@/lib/data/geo";
import { money, num } from "@/lib/format";
import { Photo } from "@/components/ui";
import { themeCss } from "@/lib/theme";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function EmbedPage({ params, searchParams }: { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<{ sent?: string; p?: string }> }) {
  const { locale, slug } = await params; const sp = await searchParams;
  setRequestLocale(locale);
  if (!/^[a-z0-9-]{3,32}$/.test(slug)) notFound();
  const [o] = await sql`select o.id, o.name_fr, o.name_he, o.name_en, b.colors from public.organizations o left join public.brand_kits b on b.organization_id = o.id where o.slug = ${slug} and o.status = 'active' and app.org_feature(o.id, 'api')`;
  if (!o) notFound();
  const t = await getTranslations("embed"); const tp = await getTranslations("props");
  const props = await sql`select p.id, p.public_token, p.price, p.currency, p.rooms, p.area_built, g.name_fr as city_fr, g.name_he as city_he, g.name_en as city_en,
    (select t.title from public.property_translations t where t.property_id = p.id order by (t.locale = ${locale}) desc limit 1) as title,
    (select pm.id from public.property_media pm where pm.property_id = p.id and pm.kind = 'photo' and pm.visibility = 'public' order by pm.is_cover desc, pm.position limit 1) as photo
    from public.properties p left join public.geo_places g on g.id = p.city_id where p.organization_id = ${o.id} and p.status = 'active' and p.deleted_at is null and p.public_token is not null order by p.published_at desc nulls last limit 24`;
  async function submit(fd: FormData) {
    "use server";
    const { redirect } = await import("next/navigation");
    const h = await headers();
    if (String(fd.get("website") ?? "")) redirect(`/${locale}/embed/${slug}?sent=1`); // pot de miel : les robots le remplissent
    if (!rateLimit(`embed:${clientIp(h)}`, 5, 600_000).ok) redirect(`/${locale}/embed/${slug}?sent=limit`);
    const phone = String(fd.get("phone") ?? "").trim(), email = String(fd.get("email") ?? "").trim();
    const r = await ingestLead(o!.id, { first_name: String(fd.get("name") ?? "").slice(0, 80) || undefined, phone: phone || undefined, email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined, message: String(fd.get("message") ?? "").slice(0, 1000) || undefined, locale: locale as "fr", consent: fd.get("consent") === "on", source: "embed" });
    redirect(`/${locale}/embed/${slug}?sent=${"error" in r || (!phone && !email) ? "err" : "1"}`);
  }
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeCss((o.colors as { primary?: string } | null)?.primary) }} />
      <main style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
          {props.map((p) => (
            <article key={p.id} className="card" style={{ overflow: "hidden" }}>
              <div style={{ height: 170 }}>{p.photo ? <img src={`/api/public/photo/${p.public_token}/${p.photo}?w=thumb`} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Photo seed={p.id} />}</div>
              <div style={{ padding: 12 }}><b className="tab" style={{ fontSize: 17 }}>{money(locale, p.price, p.currency)}</b><div style={{ fontWeight: 500 }}>{p.title ?? ""}</div><div className="note">{cityName({ name_fr: p.city_fr, name_he: p.city_he, name_en: p.city_en }, locale)} · {num(locale, p.rooms)} {tp("rooms").toLowerCase()} · {num(locale, p.area_built, 0)} {tp("sqm")}</div></div>
            </article>))}
        </div>
        {props.length === 0 && <p className="muted">{t("empty")}</p>}
        <section className="card" style={{ marginTop: 20, maxWidth: 520 }}><h2>{t("contact")}</h2>
          <form action={submit} className="card-b col" style={{ gap: 10 }}>
            {sp.sent === "1" && <div role="status" style={{ color: "var(--ok)" }}>{t("thanks")}</div>}{sp.sent === "err" && <div role="alert" className="err">{t("needContact")}</div>}{sp.sent === "limit" && <div role="alert" className="err">{t("tooMany")}</div>}
            <input name="name" className="input" placeholder={t("name")} aria-label={t("name")} maxLength={80} /><input name="phone" className="input" dir="ltr" placeholder={t("phone")} aria-label={t("phone")} maxLength={40} /><input name="email" type="email" className="input" dir="ltr" placeholder="E-mail" aria-label="E-mail" maxLength={160} />
            <textarea name="message" className="input" placeholder={t("message")} aria-label={t("message")} maxLength={1000} />
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden style={{ position: "absolute", insetInlineStart: -9999, opacity: 0 }} />
            <label className="row" style={{ gap: 8, fontSize: 12 }}><input type="checkbox" className="ck" name="consent" />{t("consent")}</label>
            <button className="btn pri">{t("send")}</button></form></section>
      </main>
    </>
  );
}
