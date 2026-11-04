import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MessageCircle, Phone } from "lucide-react";
import { getPublicShare } from "@/lib/data/shares";
import { cityName } from "@/lib/data/geo";
import { money, num } from "@/lib/format";
import { Photo } from "@/components/ui";
import { themeCss } from "@/lib/theme";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function PublicSelectionPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const data = await getPublicShare(token);
  if (!data) notFound();
  const t = await getTranslations("public");
  const tp = await getTranslations("props");
  const { share: s, props } = data;
  const accent = (s.colors as { primary?: string } | null)?.primary ?? "#1f4fd8";
  const org = (locale === "he" ? s.name_he : locale === "en" ? s.name_en : s.name_fr) ?? s.name_fr ?? "";
  const phoneDigits = (s.agent_phone as string | null)?.replace(/\D/g, "");
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeCss(accent) }} />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 64px" }}>
        <header className="row" style={{ marginBottom: 20 }}><div className="mark">{org[0]}</div><b style={{ fontSize: 15 }}>{org}</b></header>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.01em", marginBottom: 4 }}>{t("title")}</h1>
        <p className="muted" style={{ marginBottom: 20 }}>{t("subtitle", { agent: s.agent_name })}</p>
        <div className="col" style={{ gap: 16 }}>
          {props.map((p) => {
            const tr = (p.tr as Record<string, { title?: string; description?: string }>)[locale] ?? (p.tr as Record<string, { title?: string; description?: string }>).fr ?? {};
            const feats = [p.mamad && tp("has.mamad"), p.parking_count > 0 && `${tp("has.parking")} ×${p.parking_count}`, p.elevator && tp("has.elevator"), p.sukkah_balcony && tp("has.sukkah_balcony"), p.storage && tp("has.storage"), p.ac && tp("has.ac")].filter(Boolean) as string[];
            return (
              <article key={p.id} className="card" style={{ overflow: "hidden" }}>
                <div style={{ height: 220 }}><Photo seed={p.id} label={tr.title ?? ""} /></div>
                <div className="card-b col" style={{ gap: 8 }}>
                  <div className="tab" style={{ fontSize: 24, fontWeight: 600 }}>{money(locale, p.price, p.currency)}</div>
                  <div style={{ fontWeight: 500, fontSize: 15 }}>{tr.title ?? ""}</div>
                  <div className="muted">{[p.street, cityName({ name_fr: p.city_fr, name_he: p.city_he, name_en: p.city_en }, locale)].filter(Boolean).join(", ")}</div>
                  <div className="row wrap" style={{ gap: 14 }}><span>{num(locale, p.rooms)} {tp("rooms")}</span><span>{num(locale, p.area_built, 0)} {tp("sqm")}</span>{p.floor !== null && <span>{tp("floor")} <span className="ltr">{p.floor}{p.floors_total ? `/${p.floors_total}` : ""}</span></span>}</div>
                  {feats.length > 0 && <div className="row wrap" style={{ gap: 6 }}>{feats.map((f) => <span key={f} className="chip">{f}</span>)}</div>}
                  {tr.description && <p style={{ lineHeight: 1.7, marginTop: 4 }}>{tr.description}</p>}
                </div>
              </article>
            );
          })}
        </div>
        <section className="card card-b" style={{ marginTop: 24 }}>
          <b>{t("contact", { agent: s.agent_name })}</b>
          <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
            {phoneDigits && <a className="btn pri" href={`tel:+${phoneDigits}`}><Phone size={15} aria-hidden />{t("call")}</a>}
            {phoneDigits && <a className="btn" href={`https://wa.me/${phoneDigits}`} rel="noopener noreferrer"><MessageCircle size={15} aria-hidden />WhatsApp</a>}
          </div>
        </section>
        <p className="note" style={{ marginTop: 20 }}>{t("legal")}</p>
      </main>
    </>
  );
}
