import { getTranslations } from "next-intl/server";
import { MessageCircle, Phone } from "lucide-react";
import { cityName } from "@/lib/data/geo";
import { money, num } from "@/lib/format";
import { Photo } from "@/components/ui";
import { themeCss } from "@/lib/theme";

/** Vue publique partagée : sélection envoyée (/p/<jeton>) et page d'un bien (/l/<jeton>, cible du QR des affiches). */
export async function PublicView({ locale, token, data }: { locale: string; token: string; data: { share: Record<string, any>; props: Record<string, any>[]; agentPhone: string | null } }) {
  const t = await getTranslations("public");
  const tp = await getTranslations("props");
  const { share: s, props } = data;
  const accent = (s.colors as { primary?: string } | null)?.primary ?? null;
  const org = (locale === "he" ? s.name_he : locale === "en" ? s.name_en : s.name_fr) ?? s.name_fr ?? "";
  const phoneDigits = (s.agent_phone as string | null)?.replace(/\D/g, "");
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeCss(accent) }} />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 64px" }}>
        <header className="row" style={{ marginBottom: 24, paddingBlockEnd: 14, borderBlockEnd: "1px solid var(--border)" }}><span className="display" style={{ fontSize: 20, fontWeight: 600 }}>{org}</span></header>
        <h1 className="t-title" style={{ marginBottom: 4 }}>{t("title")}</h1>
        <p className="muted" style={{ marginBottom: 20 }}>{t("subtitle", { agent: s.agent_name })}</p>
        <div className="col" style={{ gap: 20 }}>
          {props.map((p) => {
            const tr = (p.tr as Record<string, { title?: string; description?: string }>)[locale] ?? (p.tr as Record<string, { title?: string; description?: string }>).fr ?? {};
            const feats = [p.mamad && tp("has.mamad"), p.parking_count > 0 && `${tp("has.parking")} ×${p.parking_count}`, p.elevator && tp("has.elevator"), p.sukkah_balcony && tp("has.sukkah_balcony"), p.storage && tp("has.storage"), p.ac && tp("has.ac")].filter(Boolean) as string[];
            return (
              <article key={p.id} className="card" style={{ overflow: "hidden", padding: 8 }}>
                <div className="photo door" style={{ height: 280 }}>{(p.photo_ids as string[]).length ? <img src={`/api/public/photo/${token}/${(p.photo_ids as string[])[0]}`} alt={tr.title ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <Photo seed={p.id} label={tr.title ?? ""} />}</div>
                {(p.photo_ids as string[]).length > 1 && <div className="row" style={{ gap: 4, padding: 4, overflowX: "auto" }}>{(p.photo_ids as string[]).slice(1, 8).map((pid) => <img key={pid} src={`/api/public/photo/${token}/${pid}?w=thumb`} alt="" loading="lazy" style={{ height: 64, borderRadius: 4 }} />)}</div>}
                <div className="card-b col" style={{ gap: 8 }}>
                  <div className="t-price tab">{money(locale, p.price, p.currency)}</div>
                  <div className="display" style={{ fontSize: 20, lineHeight: "26px" }}>{tr.title ?? ""}</div>
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
