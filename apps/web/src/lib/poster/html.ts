import { wcagContrast } from "culori";

export type PosterFormat = "square" | "portrait" | "story" | "facebook" | "a4";
export type PosterVariant = "A" | "B" | "C";
export const FORMATS: Record<PosterFormat, { w: number; h: number }> = { square: { w: 1080, h: 1080 }, portrait: { w: 1080, h: 1350 }, story: { w: 1080, h: 1920 }, facebook: { w: 1200, h: 630 }, a4: { w: 1240, h: 1754 } };

export type PosterData = {
  locale: "fr" | "he" | "en"; format: PosterFormat; variant: PosterVariant;
  brand: { primary: string; secondary: string; fontLatin: string | null; fontHebrew: string };
  orgName: string; tag: string; title: string; place: string; price: string; specs: string[];
  phone: string | null; agentName: string | null; legal: string; headline?: string | null;
  photo?: string | null; logo?: string | null; qr?: string | null; virtualStaging?: string | null;
};

export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const hex = (c: string) => (/^#[0-9a-f]{6}$/i.test(c) ? c : "#1f4fd8");
export const readableOn = (bg: string) => (wcagContrast(bg, "#ffffff") >= 4.5 ? "#ffffff" : "#111111");
const safeFont = (f: string | null) => (f && /^[\w\s-]{1,40}$/.test(f) ? f : null);

export function posterHtml(d: PosterData, fonts: { inter: string; heeboHe: string; heeboLatin: string }): string {
  const { w, h } = FORMATS[d.format];
  const u = Math.min(w, h) / 100, landscape = w > h * 1.2;
  const px = (k: number) => `${(k * u).toFixed(1)}px`;
  const primary = hex(d.brand.primary), onPrimary = readableOn(primary), secondary = hex(d.brand.secondary);
  const rtl = d.locale === "he", lat = safeFont(d.brand.fontLatin);
  const family = `${lat ? `'${lat}',` : ""}'Inter Var','Heebo Var',system-ui,sans-serif`;
  const phone = d.phone ? `<span class="ltr">${esc(d.phone)}</span>` : "";
  const logo = d.logo ? `<img src="${esc(d.logo)}" class="logo">` : `<span class="mark">${esc(d.orgName[0] ?? "")}</span>`;
  const brandRow = `<div class="brand">${logo}<b>${d.logo ? "" : esc(d.orgName)}</b></div>`;
  const specs = d.specs.length ? `<div class="specs">${d.specs.map((s) => `<span>${esc(s)}</span>`).join('<i class="sep"></i>')}</div>` : "";
  const qr = d.qr ? `<img class="qr" src="${esc(d.qr)}">` : "";
  const foot = (color: string) => `<div class="foot" style="color:${color}"><div><div class="contact">${esc(d.agentName ?? "")}${d.agentName && phone ? " · " : ""}${phone}</div><div class="legal">${esc(d.legal)}${d.virtualStaging ? ` · ${esc(d.virtualStaging)}` : ""}</div></div>${qr}</div>`;
  const photoBox = d.photo ? `<img class="photo" src="${esc(d.photo)}">` : `<div class="photo nophoto"></div>`;
  const tag = (bg: string, fg: string) => `<span class="tag" style="background:${bg};color:${fg}">${esc(d.tag)}</span>`;
  const head = (color: string) => `<div class="title" style="color:${color}">${esc(d.headline || d.title)}</div>`;
  const price = (color: string, k = 10) => `<div class="price" style="color:${color};font-size:${px(k)}">${esc(d.price)}</div>`;

  let body = "";
  if (d.variant === "A") {
    body = `<div class="abs">${photoBox}</div><div class="abs" style="background:${landscape ? `linear-gradient(to ${rtl ? "left" : "right"},rgb(8 16 36/.92) 0,rgb(8 16 36/.8) 48%,rgb(8 16 36/.1) 78%,transparent 100%)` : "linear-gradient(180deg,rgb(8 16 36/.30) 0,transparent 32%,rgb(8 16 36/.88) 100%)"}"></div>
      <div class="top" style="color:#fff">${brandRow}${tag(primary, onPrimary)}</div>
      <div class="bottom" style="color:#fff">${head("#fff")}<div class="place" style="color:rgb(255 255 255/.85)">${esc(d.place)}</div>${specs}${price("#fff", landscape ? 9 : 11)}${foot("rgb(255 255 255/.92)")}</div>`;
  } else if (d.variant === "B") {
    body = `<div class="split ${landscape ? "row" : "col"}"><div class="ph" style="${landscape ? "width:55%" : "height:56%"}">${photoBox}<div class="tagpos">${tag("#fff", "#111")}</div></div>
      <div class="panel" style="background:${primary};color:${onPrimary}"><div>${brandRow}${head(onPrimary)}<div class="place" style="color:${onPrimary};opacity:.85">${esc(d.place)}</div>${specs}</div><div>${price(onPrimary, landscape ? 8 : 9.6)}${foot(onPrimary)}</div></div></div>`;
  } else {
    body = `<div class="frame ${landscape ? "row" : "col"}"><div class="ph rounded" style="${landscape ? "width:52%" : "flex:1;min-height:0"}">${photoBox}</div>
      <div class="txt"><div class="top" style="position:static;color:#111;margin-bottom:${px(2)}">${brandRow}<span class="tagtxt" style="color:${primary}">${esc(d.tag)}</span></div>${head("#111")}<div class="place" style="color:#555">${esc(d.place)}</div>${specs}
      <div class="rule" style="border-color:${primary}"></div>${price("#111", landscape ? 7.5 : 9)}${foot("#444")}</div></div>`;
  }
  const faces = `@font-face{font-family:'Inter Var';src:url(${fonts.inter}) format('woff2');font-weight:100 900;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC,U+2122,U+2212}
@font-face{font-family:'Heebo Var';src:url(${fonts.heeboHe}) format('woff2');font-weight:100 900;unicode-range:U+0590-05FF,U+200C-2010,U+20AA,U+FB1D-FB4F}
@font-face{font-family:'Heebo Var';src:url(${fonts.heeboLatin}) format('woff2');font-weight:100 900;unicode-range:U+0000-00FF}`;
  const bg = d.variant === "C" ? "#fbfaf7" : secondary;
  return `<!doctype html><html lang="${d.locale}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><style>${faces}
*{box-sizing:border-box;margin:0}html,body{width:${w}px;height:${h}px;overflow:hidden}
body{font-family:${family};position:relative;background:${bg};-webkit-font-smoothing:antialiased;line-height:1.15}
.abs{position:absolute;inset:0}.photo{width:100%;height:100%;object-fit:cover;display:block}.nophoto{background:linear-gradient(160deg,${secondary},${primary});display:grid;place-items:center;color:rgb(255 255 255/.5);font-size:${px(9)};font-weight:700;text-align:center;padding:${px(6)}}
.ltr{direction:ltr;unicode-bidi:isolate;display:inline-block}
.top{position:absolute;inset:${px(4.5)} ${px(5)} auto;display:flex;justify-content:space-between;align-items:center}
.bottom{position:absolute;inset-block-end:${px(5)};inset-inline-start:${px(5)};inset-inline-end:${landscape ? px(46) : px(5)};display:flex;flex-direction:column;gap:${px(1.6)}}
.brand{display:flex;align-items:center;gap:${px(1.6)};font-size:${px(3.2)};font-weight:600}.logo{height:${px(6.5)};max-width:${px(30)};object-fit:contain}
.mark{width:${px(6)};height:${px(6)};border-radius:${px(1.3)};background:${primary};color:${onPrimary};display:grid;place-items:center;font-weight:700;font-size:${px(3.4)}}
.tag{font-size:${px(2.6)};font-weight:700;letter-spacing:.08em;padding:${px(1.1)} ${px(2.4)};border-radius:999px}.tagtxt{font-size:${px(2.6)};font-weight:700;letter-spacing:.08em}
.title{font-size:${px(landscape ? 6 : 7.4)};font-weight:700;letter-spacing:-.01em;line-height:1.12;margin-top:${px(1.2)}}.place{font-size:${px(3.6)};font-weight:500;margin-top:${px(.6)}}
.specs{display:flex;align-items:center;gap:${px(2)};font-size:${px(3.1)};font-weight:500;margin-top:${px(1)};opacity:.92;flex-wrap:wrap}.sep{width:${px(.7)};height:${px(.7)};border-radius:50%;background:currentColor;opacity:.6}
.price{font-weight:700;letter-spacing:-.02em;margin-top:${px(1.6)}}
.foot{display:flex;align-items:flex-end;justify-content:space-between;gap:${px(3)};border-top:1px solid currentColor;border-top-color:rgb(127 127 127/.35);padding-top:${px(2.2)};margin-top:${px(2)}}
.contact{font-size:${px(3.2)};font-weight:600}.legal{font-size:${px(1.9)};opacity:.75;margin-top:${px(.8)};max-width:${px(landscape ? 60 : 70)};line-height:1.35}.qr{width:${px(landscape ? 11 : 12)};height:${px(landscape ? 11 : 12)};border-radius:${px(1)};background:#fff;padding:${px(.6)}}
.split{width:100%;height:100%;display:flex}.split.col{flex-direction:column}.split.row{flex-direction:row}.ph{position:relative;overflow:hidden;flex-shrink:0}.tagpos{position:absolute;inset-block-start:${px(4)};inset-inline-start:${px(4)}}
.panel{flex:1;padding:${px(5)};display:flex;flex-direction:column;justify-content:space-between;min-width:0}
.frame{position:absolute;inset:${px(5)};display:flex;gap:${px(3.5)}}.frame.col{flex-direction:column}.frame.row{flex-direction:row}.rounded{border-radius:${px(3)}}.txt{display:flex;flex-direction:column;flex:1;min-width:0;color:#111}
.rule{border-top:${px(.45)} solid;margin-top:${px(2.4)}}
</style></head><body>${body}</body></html>`;
}
