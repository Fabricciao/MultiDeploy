// Briques partagées des maquettes : CSS (mêmes tokens que l'app), icônes, composants, coquille d'application.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { icons } from "lucide-react";

export const css = `
@font-face{font-family:"Inter Var";src:url(fonts/inter-latin-wght-normal.woff2) format("woff2");font-weight:100 900;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"Heebo Var";src:url(fonts/heebo-hebrew-wght-normal.woff2) format("woff2");font-weight:100 900;unicode-range:U+0307-0308,U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F}
@font-face{font-family:"Heebo Var";src:url(fonts/heebo-latin-wght-normal.woff2) format("woff2");font-weight:100 900;unicode-range:U+0000-00FF}
:root{
  --bg:oklch(.985 .002 250);--surface:#fff;--sunken:oklch(.965 .003 250);--line:oklch(.915 .004 250);--line-strong:oklch(.85 .006 250);
  --ink:oklch(.22 .01 250);--muted:oklch(.5 .012 250);--faint:oklch(.66 .01 250);
  --accent:#1f4fd8;--accent-hover:#1a43b8;--accent-soft:#eaf0fd;--accent-ink:#1a43b8;
  --ok:oklch(.52 .12 155);--ok-soft:oklch(.96 .03 155);--warn:oklch(.58 .13 70);--warn-soft:oklch(.97 .04 85);--bad:oklch(.54 .18 27);--bad-soft:oklch(.97 .02 27);
  --r:6px;--r-lg:10px;
}
*{box-sizing:border-box}
html{font-size:14px;line-height:1.5;background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased}
body{margin:0;font-family:"Inter Var","Heebo Var",system-ui,sans-serif;min-height:100vh}
h1,h2,h3,p{margin:0}
button,input,select{font:inherit;color:inherit}
a{color:inherit;text-decoration:none}
svg{flex-shrink:0}
div>svg[role=img]{width:100%;height:100%;display:block}
.ltr{direction:ltr;unicode-bidi:isolate;display:inline-block}
.tab{font-variant-numeric:tabular-nums}
.muted{color:var(--muted)}.faint{color:var(--faint)}
.flip{}[dir=rtl] .flip{transform:scaleX(-1)}
.row{display:flex;align-items:center;gap:8px}.col{display:flex;flex-direction:column}.grow{flex:1;min-width:0}.gap4{gap:4px}.gap12{gap:12px}.gap16{gap:16px}.wrap{flex-wrap:wrap}
.sp{margin-inline-start:auto}

/* shell */
.app{display:flex;min-height:100vh}
.side{width:216px;flex-shrink:0;background:var(--surface);border-inline-end:1px solid var(--line);padding:10px 8px;display:flex;flex-direction:column;gap:2px;position:sticky;top:0;height:100vh}
.org{display:flex;align-items:center;gap:9px;padding:6px 8px 12px}
.mark{width:26px;height:26px;border-radius:7px;background:var(--accent);color:#fff;display:grid;place-items:center;font-weight:700;font-size:13px}
.org b{font-size:13px;font-weight:600;display:block;line-height:1.2}.org small{font-size:11px;color:var(--muted)}
.nav{display:flex;align-items:center;gap:10px;height:32px;padding:0 8px;border-radius:var(--r);font-size:13px;color:var(--ink)}
.nav:hover{background:var(--sunken)}.nav.on{background:var(--accent-soft);color:var(--accent-ink);font-weight:500}
.nav .cnt{margin-inline-start:auto;font-size:11px;color:var(--muted)}
.nav-sep{height:1px;background:var(--line);margin:8px 4px}
.side-foot{margin-top:auto;padding:8px;border-top:1px solid var(--line);display:flex;gap:9px;align-items:center;font-size:12px}
.main{flex:1;min-width:0;display:flex;flex-direction:column}
.top{height:52px;display:flex;align-items:center;gap:12px;padding:0 20px;background:var(--surface);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:5}
.search span.grow{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.search{display:flex;align-items:center;gap:8px;height:32px;width:340px;padding:0 10px;border:1px solid var(--line);border-radius:var(--r);background:var(--bg);color:var(--muted);font-size:13px}
.kbd{font-size:11px;border:1px solid var(--line-strong);border-radius:4px;padding:0 5px;color:var(--muted);background:var(--surface)}
.page{padding:20px 24px 40px;flex:1}
.ph{display:flex;align-items:flex-end;gap:16px;margin-bottom:16px}
.ph h1{font-size:20px;font-weight:600;letter-spacing:-.01em;line-height:1.25}
.ph p{color:var(--muted);font-size:13px}

/* controls */
.btn{color:var(--ink);display:inline-flex;align-items:center;justify-content:center;gap:7px;height:32px;padding:0 12px;border-radius:var(--r);border:1px solid var(--line-strong);background:var(--surface);font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap}
.btn:hover{background:var(--sunken)}
.btn.pri{background:var(--accent);border-color:var(--accent);color:#fff}.btn.pri:hover{background:var(--accent-hover)}
.btn.ghost{border-color:transparent;background:transparent}.btn.ghost:hover{background:var(--sunken)}
.btn.sm{height:28px;padding:0 9px;font-size:12px}.btn.icon{width:32px;padding:0}.btn.sm.icon{width:28px}
.btn.danger{color:var(--bad)}
.btn[disabled]{opacity:.5;cursor:not-allowed}
.seg{display:inline-flex;padding:2px;border:1px solid var(--line);border-radius:var(--r);background:var(--surface)}
.seg>*{height:26px;padding:0 10px;display:inline-flex;align-items:center;gap:6px;border-radius:4px;font-size:12px;font-weight:500;color:var(--muted)}
.seg>.on{background:var(--accent);color:#fff}
.chip{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 9px;border:1px solid var(--line-strong);border-radius:999px;background:var(--surface);font-size:12px;font-weight:500}
.chip.on{background:var(--accent-soft);border-color:color-mix(in oklab,var(--accent) 35%,white);color:var(--accent-ink)}
.chip.dash{border-style:dashed;color:var(--muted);background:transparent}
.chip .x{opacity:.6}
.badge{display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 8px;border-radius:999px;font-size:11.5px;font-weight:500;background:var(--sunken);color:var(--muted);white-space:nowrap}
.badge.ok{background:var(--ok-soft);color:var(--ok)}.badge.warn{background:var(--warn-soft);color:var(--warn)}.badge.bad{background:var(--bad-soft);color:var(--bad)}.badge.acc{background:var(--accent-soft);color:var(--accent-ink)}
.dot{width:6px;height:6px;border-radius:50%;background:currentColor}
.input{height:32px;width:100%;padding:0 10px;border:1px solid var(--line-strong);border-radius:var(--r);background:var(--surface);font-size:13px;display:flex;align-items:center;gap:8px}
.input.mul{height:auto;min-height:32px;padding:5px 8px;flex-wrap:wrap}
.input.warn{border-color:color-mix(in oklab,var(--warn) 55%,white);background:var(--warn-soft)}
.input.bad{border-color:var(--bad);background:var(--bad-soft)}
.lbl{font-size:12px;font-weight:500;color:var(--muted);margin-bottom:5px;display:flex;align-items:center;gap:6px}
.avatar{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:10.5px;font-weight:600;background:var(--accent-soft);color:var(--accent-ink);flex-shrink:0}
.avatar.lg{width:44px;height:44px;font-size:15px}.avatar.sm{width:20px;height:20px;font-size:9px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg)}
.card>h2,.card-h{font-size:13px;font-weight:600;padding:11px 14px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px}
.card-b{padding:14px}
.sw{width:100%;border:0;border-top:1px solid var(--line)}

/* table */
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl th{height:34px;padding:0 10px;text-align:start;font-weight:500;font-size:12px;color:var(--muted);background:var(--sunken);border-bottom:1px solid var(--line);white-space:nowrap}
.tbl td{height:52px;padding:0 10px;border-bottom:1px solid var(--line);white-space:nowrap}
.tbl tr:last-child td{border-bottom:0}.tbl tr:hover td{background:var(--sunken)}
.tbl tr.sel td{background:var(--accent-soft)}
.cb{width:15px;height:15px;border:1.5px solid var(--line-strong);border-radius:4px;background:var(--surface);display:inline-grid;place-items:center;vertical-align:middle}
.cb.on{background:var(--accent);border-color:var(--accent);color:#fff}
.thumb{width:56px;height:38px;border-radius:5px;overflow:hidden;flex-shrink:0;background:var(--sunken)}
.thumb svg,.ph-img svg{width:100%;height:100%;display:block}
.bar{height:5px;border-radius:3px;background:var(--line);overflow:hidden}.bar>i{display:block;height:100%;background:var(--accent)}
.kv{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px 18px}
.kv .k{font-size:11.5px;color:var(--muted)}.kv .v{font-size:14px;font-weight:500;margin-top:1px}
.tabs{display:flex;gap:2px;border-bottom:1px solid var(--line);margin-bottom:16px}
.tabs>*{padding:8px 12px;font-size:13px;color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1px}
.tabs>.on{color:var(--ink);font-weight:500;border-color:var(--accent)}
.note{font-size:12px;color:var(--muted)}
.foot-note{position:fixed;inset-block-end:10px;inset-inline:0;margin-inline:auto;width:fit-content;pointer-events:none;font-size:11px;color:var(--muted);background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:3px 10px;z-index:50}
`;

const ic = (name, size = 16, extra = {}) => {
  const C = icons[name];
  if (!C) throw new Error("icône inconnue: " + name);
  return renderToStaticMarkup(createElement(C, { size, strokeWidth: 1.75, "aria-hidden": true, ...extra }));
};
export const I = ic;

export function makeL(lang) {
  const he = lang === "he";
  const loc = he ? "he-IL" : "fr-FR";
  return {
    lang, he, dir: he ? "rtl" : "ltr",
    t: (fr, h) => (he ? h : fr),
    n: (v, o = {}) => new Intl.NumberFormat(loc, o).format(v),
    cur: (v) => new Intl.NumberFormat(loc, { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(v),
    m2: he ? "מ״ר" : "m²",
    ph: (s) => `<span class="ltr tab">${s}</span>`,
  };
}

let pid = 0;
/** Placeholder de photo : façade stylisée, teintes sourdes. Aucune fausse « vraie photo ». */
export function photo(seed = 0, label = "") {
  const id = `p${++pid}`;
  const hues = [210, 28, 160, 340, 50, 250];
  const h = hues[seed % hues.length];
  const b = (x, w, hh, l) => `<rect x="${x}" y="${120 - hh}" width="${w}" height="${hh}" fill="hsl(${h} ${14 + l}% ${58 - l * 1.2}%)"/>`;
  return `<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}">
<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${h} 30% 88%)"/><stop offset="1" stop-color="hsl(${h} 25% 96%)"/></linearGradient>
<pattern id="${id}w" width="12" height="14" patternUnits="userSpaceOnUse"><rect x="3" y="3" width="6" height="8" fill="hsl(${h} 30% 90% / .75)"/></pattern></defs>
<rect width="200" height="120" fill="url(#${id}s)"/>
${b(10, 46, 78, 2)}${b(60, 62, 96, 0)}${b(126, 40, 64, 4)}${b(170, 30, 84, 6)}
<rect x="60" y="24" width="62" height="96" fill="url(#${id}w)"/><rect x="10" y="42" width="46" height="78" fill="url(#${id}w)"/><rect x="126" y="56" width="40" height="64" fill="url(#${id}w)"/>
<rect y="112" width="200" height="8" fill="hsl(${h} 12% 40% / .35)"/></svg>`;
}

export const avatar = (txt, cls = "") => `<span class="avatar ${cls}">${txt}</span>`;

const NAV = [
  ["today", "Sun", "Aujourd'hui", "היום"],
  ["properties", "House", "Biens", "נכסים"],
  ["clients", "Users", "Clients", "לקוחות"],
  ["deals", "Handshake", "Affaires", "עסקאות"],
  ["agenda", "CalendarDays", "Agenda", "יומן"],
  ["marketing", "Megaphone", "Marketing", "שיווק"],
  ["reports", "ChartNoAxesColumn", "Rapports", "דוחות"],
  ["settings", "Settings", "Paramètres", "הגדרות"],
];

/** Coquille CRM : barre latérale + barre supérieure. */
export function shell(L, { active, title, body, orgName = "Eliezer.immo", crumbs = "", themeVars = "", navItems = NAV, user = ["YL", "יל", "Yaël Lévy", "יעל לוי", "Administratrice", "מנהלת"], sub = ["Agence", "סוכנות"] }) {
  const nav = navItems.map(([k, icon, fr, he]) => `<a class="nav ${k === active ? "on" : ""}" href="#">${I(icon, 16)}<span>${L.t(fr, he)}</span>${active !== "orgs" && k === "clients" ? `<span class="cnt tab">${L.n(412)}</span>` : active !== "orgs" && k === "properties" ? `<span class="cnt tab">${L.n(248)}</span>` : ""}</a>`).join("");
  return page(L, title, `<div class="app" style="${themeVars}">
<aside class="side">
  <div class="org"><div class="mark">E</div><div><b>${orgName}</b><small>${L.t(sub[0], sub[1])}</small></div><span class="sp muted">${I("ChevronsUpDown", 14)}</span></div>
  ${nav}
  <div class="side-foot">${avatar(L.t(user[0], user[1]))}<div class="grow"><b style="font-weight:500;display:block;line-height:1.2">${L.t(user[2], user[3])}</b><span class="muted" style="font-size:11px">${L.t(user[4], user[5])}</span></div></div>
</aside>
<div class="main">
  <header class="top">
    <div class="search">${I("Search", 14)}<span class="grow">${L.t("Rechercher un bien, un client, une action…", "חיפוש נכס, לקוח או פעולה…")}</span><span class="kbd ltr">Ctrl K</span></div>
    ${crumbs}
    <div class="sp row gap12">
      <div class="seg"><span class="${L.lang === "fr" ? "on" : ""}">FR</span><span class="${L.lang === "he" ? "on" : ""}">עב</span><span>EN</span></div>
      <button class="btn pri">${I("Plus", 15)}${L.t("Nouveau", "חדש")}<span style="opacity:.6;margin-inline-start:2px">${I("ChevronDown", 13)}</span></button>
      <button class="btn ghost icon" aria-label="notifications">${I("Bell", 16)}</button>
    </div>
  </header>
  <div class="page">${body}</div>
</div></div>`);
}

export function page(L, title, inner, extraCss = "") {
  return `<!doctype html><html lang="${L.lang}" dir="${L.dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${css}${extraCss}</style></head><body>${inner}<div class="foot-note">${L.t("Maquette — données fictives", "מוקאפ — נתונים פיקטיביים")}</div></body></html>`;
}
