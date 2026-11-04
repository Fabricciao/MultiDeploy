// Maquettes mobiles (PWA agent terrain) : viewport 390 × 844, zones tactiles ≥ 44 px.
import { css, I, photo, avatar } from "./lib.mjs";
import { poster } from "./pages-b.mjs";

const mcss = `
body{background:#e6e8ee;display:grid;place-items:center;min-height:100vh;padding:24px}
.phone{width:390px;height:844px;background:var(--bg);position:relative;overflow:hidden;display:flex;flex-direction:column;border-radius:38px;box-shadow:0 0 0 1px rgb(0 0 0/.12),0 24px 60px -20px rgb(20 30 60/.35)}
.status{height:46px;flex-shrink:0;display:flex;align-items:flex-end;justify-content:space-between;padding:0 26px 6px;font-size:14px;font-weight:600}
.status .r{display:flex;gap:5px;align-items:center}
.appbar{height:48px;flex-shrink:0;display:flex;align-items:center;gap:8px;padding:0 12px 0 16px;padding-inline:16px 8px}
.appbar h1{font-size:19px;font-weight:600;letter-spacing:-.01em}
.ib{width:44px;height:44px;display:grid;place-items:center;border-radius:50%;flex-shrink:0}
.ib.bd{border:1px solid var(--line-strong);background:var(--surface)}
.scroll{flex:1;overflow:hidden;padding:4px 16px 16px;position:relative}
.tabbar{height:78px;flex-shrink:0;background:var(--surface);border-top:1px solid var(--line);display:flex;align-items:flex-start;padding:6px 6px 0;position:relative}
.tabbar a{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10.5px;color:var(--muted);padding-top:3px;height:52px}
.tabbar a.on{color:var(--accent)}
.fabw{flex:1;display:flex;justify-content:center}
.fab{width:54px;height:54px;border-radius:50%;background:var(--accent);color:#fff;display:grid;place-items:center;margin-top:-18px;box-shadow:0 8px 20px -6px color-mix(in oklab,var(--accent) 70%,black)}
.home{position:absolute;inset-block-end:7px;inset-inline:0;margin-inline:auto;width:128px;height:5px;border-radius:3px;background:#111;opacity:.85}
.scrim{position:absolute;inset:0;background:rgb(12 18 36/.45)}
.sheet{position:absolute;inset-inline:0;inset-block-end:0;background:var(--surface);border-radius:22px 22px 0 0;padding:8px 16px 30px;box-shadow:0 -10px 40px -10px rgb(0 0 0/.3)}
.grab{width:38px;height:4px;border-radius:2px;background:var(--line-strong);margin:2px auto 12px}
.m-card{background:var(--surface);border:1px solid var(--line);border-radius:14px}
.m-btn{height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:600;font-size:15px;border:1px solid var(--line-strong);background:var(--surface);color:var(--ink)}
.m-btn.pri{background:var(--accent);border-color:var(--accent);color:#fff}
.m-btn.sm{height:44px;font-size:13px}
.m-h{font-size:12px;font-weight:600;color:var(--muted);letter-spacing:.02em;margin:18px 2px 8px;display:flex;align-items:center;gap:8px}
.m-row{display:flex;align-items:center;gap:12px;padding:12px 14px;min-height:56px}
.m-row+.m-row{border-top:1px solid var(--line)}
.hs{display:flex;gap:8px;overflow:hidden}
.q4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.q4 a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;height:68px;border-radius:12px;border:1px solid var(--line);background:var(--surface);font-size:11.5px;font-weight:500}
.dark{background:#0d0f14;color:#fff}
.chip{white-space:nowrap}
`;

const shellM = (L, { title = "", right = "", tab = "today", body, noTabs = false, dark = false, overlay = "", bar = true, back = false }) => `
<div class="phone ${dark ? "dark" : ""}" dir="${L.dir}">
  <div class="status" style="direction:ltr;${dark ? "color:#fff" : ""}"><span class="tab">9:41</span><span class="r">${I("Signal", 14)}${I("Wifi", 14)}${I("BatteryFull", 18)}</span></div>
  ${bar ? `<div class="appbar">${back ? `<span class="ib flip" style="margin-inline-start:-10px">${I("ChevronLeft", 22)}</span>` : ""}<h1 class="grow">${title}</h1>${right}</div>` : ""}
  ${body}
  ${noTabs ? "" : tabs(L, tab)}
  ${overlay}
  <i class="home" style="${dark ? "background:#fff" : ""}"></i>
</div>`;

function tabs(L, on) {
  const t = L.t, item = (k, ic, fr, he) => `<a class="${on === k ? "on" : ""}">${I(ic, 22)}<span>${t(fr, he)}</span></a>`;
  return `<nav class="tabbar">${item("today", "Sun", "Aujourd'hui", "היום")}${item("properties", "House", "Biens", "נכסים")}<div class="fabw"><span class="fab">${I("Plus", 26, { strokeWidth: 2.2 })}</span></div>${item("clients", "Users", "Clients", "לקוחות")}${item("more", "Menu", "Plus", "עוד")}</nav>`;
}

export function mpage(L, title, phone) {
  return `<!doctype html><html lang="${L.lang}" dir="${L.dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${css}${mcss}</style></head><body>${phone}</body></html>`;
}

const bell = `<span class="ib">${I("Bell", 22)}</span>`;
const chk = (on) => `<span class="cb ${on ? "on" : ""}" style="width:22px;height:22px;border-radius:7px;flex-shrink:0">${on ? I("Check", 14, { strokeWidth: 3 }) : ""}</span>`;

// ───────────────────────── 1. Aujourd'hui
const todayScroll = (L) => {
  const { t } = L;
  return `<div class="scroll">
  <div style="margin:2px 2px 14px"><div class="muted" style="font-size:13px">${t("Mercredi 4 novembre", "יום רביעי, 4 בנובמבר")}</div><div style="font-size:24px;font-weight:600;letter-spacing:-.02em">${t("Bonjour Yaël", "בוקר טוב, יעל")}</div></div>
  <div class="m-card" style="padding:14px;border-color:color-mix(in oklab,var(--accent) 30%,white);background:var(--accent-soft)">
    <div class="row" style="margin-bottom:8px"><span class="badge acc">${I("Clock", 12)}${t("Prochaine visite · 16:30", "ביקור הבא · 16:30")}</span></div>
    <div style="font-weight:600;font-size:16px">${t("4 pièces · Rue Ahuza 24, Raanana", "4 חדרים · אחוזה 24, רעננה")}</div><div class="muted" style="margin-bottom:12px">${t("avec Michaël Cohen", "עם מיכאל כהן")}</div>
    <div class="row" style="gap:8px"><span class="m-btn pri sm grow">${I("Navigation", 17)}${t("Itinéraire", "ניווט")}</span><span class="m-btn sm grow">${I("Phone", 17)}${t("Appeler", "חיוג")}</span></div></div>

  <div class="m-h">${t("TÂCHES DU JOUR", "משימות להיום")} <span class="badge">3</span></div>
  <div class="m-card">${[["Relancer Dana Lévi — visite samedi soir", "לחזור לדנה לוי — ביקור במוצאי שבת", 0, "warn", "Aujourd'hui", "היום"], ["Envoyer le dossier à Sarah Azoulay", "לשלוח תיק לשרה אזולאי", 0, "", "", ""], ["Photos du 5 pièces Herzl", "תמונות לדירת 5 חדרים בהרצל", 1, "", "", ""]].map(([f, h, d, b, bf, bh]) => `<div class="m-row">${chk(d)}<div class="grow" style="${d ? "text-decoration:line-through;color:var(--faint)" : ""}">${t(f, h)}</div>${b ? `<span class="badge ${b}">${t(bf, bh)}</span>` : ""}</div>`).join("")}</div>

  <div class="m-h">${I("Target", 14)}${t("NOUVEAUX MATCHS", "התאמות חדשות")}</div>
  <div class="m-card" style="padding:12px"><div class="row" style="gap:12px"><div class="thumb" style="width:64px;height:52px;border-radius:8px">${photo(3)}</div><div class="grow"><div style="font-weight:600">${t("Duplex 5 pièces · Raanana", "דופלקס 5 חדרים · רעננה")}</div><div class="note">${t("3 clients correspondent", "3 לקוחות מתאימים")}</div></div></div><div class="m-btn pri sm" style="margin-top:10px">${I("Send", 16)}${t("Envoyer aux 3 clients", "שליחה ל-3 לקוחות")}</div></div>

  <div class="m-h">${I("TriangleExclamationPoint", 14)}${t("À SURVEILLER", "לתשומת לב")}</div>
  <div class="m-card"><div class="m-row"><span class="badge warn">${t("5 j", "5 ימים")}</span><div class="grow">${t("Exclusivité · Duplex Jabotinsky 40", "בלעדיות · דופלקס ז׳בוטינסקי 40")}</div>${I("ChevronRight", 18, { className: "flip" })}</div></div>
  <div class="note" style="margin:12px 2px 0;display:flex;gap:6px">${I("MoonStar", 14)}${t("Chabbat : notifications silencieuses dès vendredi 14 h.", "שבת: התראות שקטות מיום שישי ב-14:00.")}</div>
  </div>`;
};

export function today(L) {
  const { t } = L;
  const body = todayScroll(L);
  return mpage(L, "Aujourd'hui", shellM(L, { title: t("Aujourd'hui", "היום"), right: bell, body }));
}

// ───────────────────────── 2. Menu Nouveau
export function newSheet(L) {
  const { t } = L;
  const tile = (ic, f, h, sub, subh, pri) => `<div style="border-radius:16px;padding:14px;height:112px;display:flex;flex-direction:column;justify-content:space-between;${pri ? "background:var(--accent);color:#fff" : "background:var(--sunken)"}">${I(ic, 26)}<div><div style="font-weight:600;font-size:16px">${t(f, h)}</div><div style="font-size:11.5px;opacity:.75">${t(sub, subh)}</div></div></div>`;
  const body = todayScroll(L);
  const overlay = `<div class="scrim"></div><div class="sheet" style="padding-bottom:34px"><div class="grab"></div>
  <div class="row" style="margin-bottom:12px"><b style="font-size:18px">${t("Nouveau", "חדש")}</b><span class="ib sp">${I("X", 20)}</span></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${tile("Mic", "Dicter", "הכתבה", "Client ou bien, à la voix", "לקוח או נכס, בקול", true)}${tile("ScanLine", "Scanner un papier", "סריקת דף", "Photo d'une fiche manuscrite", "צילום דף כתוב ביד")}${tile("UserPlus", "Client", "לקוח", "Saisie manuelle", "הזנה ידנית")}${tile("House", "Bien", "נכס", "Saisie manuelle", "הזנה ידנית")}</div>
  <div class="m-card" style="margin-top:12px">${[["CalendarPlus", "Visite", "ביקור"], ["ListTodo", "Tâche", "משימה"], ["StickyNote", "Note vocale après visite", "הערה קולית אחרי ביקור"]].map(([ic, f, h]) => `<div class="m-row">${I(ic, 20)}<div class="grow">${t(f, h)}</div>${I("ChevronRight", 18, { className: "flip" })}</div>`).join("")}</div></div>`;
  return mpage(L, "Nouveau", shellM(L, { title: t("Aujourd'hui", "היום"), right: bell, body, overlay }));
}

// ───────────────────────── 3. Dictée
export function dictate(L) {
  const { t } = L;
  const bars = Array.from({ length: 38 }, (_, k) => 8 + Math.abs(Math.sin(k * 0.55) * 46 + Math.sin(k * 0.21) * 26)).map((h, k) => `<i style="width:4px;height:${h.toFixed(0)}px;border-radius:3px;background:${k > 28 ? "rgb(255 255 255/.25)" : "#6f93ff"}"></i>`).join("");
  const hint = (f, h) => `<span style="padding:6px 12px;border-radius:99px;border:1px solid rgb(255 255 255/.22);font-size:13px">${t(f, h)}</span>`;
  const body = `<div class="scroll" style="display:flex;flex-direction:column;align-items:center;padding-top:8px">
   <div class="seg" style="background:rgb(255 255 255/.08);border-color:rgb(255 255 255/.15)"><span class="on">${I("Mic", 14)}${t("Dicter", "הכתבה")}</span><span style="color:#aab">${I("ScanLine", 14)}${t("Scanner", "סריקה")}</span><span style="color:#aab">${I("PenLine", 14)}${t("Saisir", "הזנה")}</span></div>
   <div style="margin-top:34px;font-size:15px;color:#aab;text-align:center">${t("Nouveau client ou nouveau bien — dites-le comme à un collègue.", "לקוח חדש או נכס חדש — פשוט תגידו את זה כמו לעמית.")}</div>
   <div class="tab" style="font-size:58px;font-weight:300;letter-spacing:.02em;margin-top:26px;font-variant-numeric:tabular-nums">0:23</div>
   <div style="display:flex;align-items:center;gap:4px;height:90px;margin-top:6px">${bars}</div>
   <div style="margin-top:28px;width:100%"><div style="font-size:12px;color:#8a90a2;margin-bottom:8px">${t("Pensez à mentionner", "כדאי להזכיר")}</div><div class="row wrap" style="gap:8px">${hint("Nom", "שם")}${hint("Téléphone", "טלפון")}${hint("Ce qu'il cherche", "מה הוא מחפש")}${hint("Budget", "תקציב")}${hint("Villes", "ערים")}${hint("Mamad / parking", "ממ״ד / חניה")}</div></div>
   <div style="margin-top:auto;display:flex;align-items:center;justify-content:space-between;width:100%;padding:0 8px 8px">
     <div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:80px;font-size:12px;color:#aab"><span class="ib" style="background:rgb(255 255 255/.1);color:#fff;width:52px;height:52px">${I("Pause", 22)}</span>${t("Pause", "השהיה")}</div>
     <div style="display:flex;flex-direction:column;align-items:center;gap:8px"><span style="width:84px;height:84px;border-radius:50%;background:rgb(255 255 255/.14);display:grid;place-items:center"><span style="width:64px;height:64px;border-radius:50%;background:#e5484d;display:grid;place-items:center;color:#fff">${I("Square", 24, { fill: "#fff" })}</span></span><span style="font-size:13px;font-weight:500">${t("Terminer", "סיום")}</span></div>
     <div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:80px;font-size:12px;color:#aab"><span class="ib" style="background:rgb(255 255 255/.1);color:#fff;width:52px;height:52px">${I("X", 22)}</span>${t("Annuler", "ביטול")}</div></div>
   <div style="font-size:11px;color:#7c8396;text-align:center;margin-top:14px;padding-bottom:10px">${t("Rien n'est enregistré avant votre validation.", "דבר לא נשמר לפני אישורכם.")}</div></div>`;
  return mpage(L, "Dictée", shellM(L, { dark: true, bar: false, noTabs: true, body }));
}

// ───────────────────────── 4. Revue IA
export function review(L) {
  const { t, cur } = L;
  const f = (lab, val, st = "ok") => `<div style="margin-bottom:12px"><div class="lbl" style="font-size:12.5px">${lab}${st === "ok" ? `<span style="color:var(--ok)">${I("Check", 14, { strokeWidth: 2.6 })}</span>` : st === "warn" ? `<span class="badge warn" style="height:20px">${I("TriangleExclamationPoint", 11)}${t("À vérifier", "לבדיקה")}</span>` : `<span class="badge bad" style="height:20px">${t("Requis", "חובה")}</span>`}</div><div class="input ${st === "warn" ? "warn" : st === "bad" ? "bad" : ""}" style="height:48px;font-size:16px;border-radius:12px">${val}</div></div>`;
  const body = `<div class="scroll" style="padding-bottom:0">
   <div class="row" style="background:var(--bad-soft);border:1px solid color-mix(in oklab,var(--bad) 28%,white);border-radius:12px;padding:10px 12px;color:var(--bad);margin-bottom:14px">${I("CircleExclamationPoint", 18)}<span style="color:var(--ink);font-size:13px"><b>${t("Il manque : téléphone", "חסר: טלפון")}</b></span></div>
   <div class="m-card" style="padding:12px 14px;margin-bottom:14px"><div class="row">${I("TextQuote", 16)}<b class="grow" style="font-size:13px">${t("Transcription", "תמלול")}</b><span class="muted" style="font-size:12px">${t("Afficher", "הצגה")}</span>${I("ChevronDown", 16)}</div></div>
   <div class="m-h" style="margin-top:0">${t("IDENTITÉ", "זהות")}</div>
   ${f(t("Prénom", "שם פרטי"), t("Dana", "דנה"))}${f(t("Nom", "שם משפחה"), t("Lévi", "לוי"))}${f(t("Téléphone", "טלפון"), `<span class="faint ltr">+972</span>`, "bad")}
   <div class="m-h">${t("RECHERCHE", "חיפוש")} <span class="sp muted" style="font-weight:400">${t("5 champs", "5 שדות")}</span></div>
   ${f(t("Budget maximum", "תקציב מקסימלי"), `<span class="tab">${cur(4000000)}</span>`, "warn")}
   <div class="m-card" style="padding:10px 12px;margin:-4px 0 12px;font-size:12.5px;background:var(--warn-soft);border-color:color-mix(in oklab,var(--warn) 30%,white)"><div class="muted" style="font-size:11.5px">${t("Dans la dictée", "מתוך ההכתבה")}</div><i>« ${t("budget maximum quatre millions", "תקציב עד ארבעה מיליון")} »</i><div class="muted" style="margin-top:4px">${t("Devise non précisée — ₪ supposé.", "מטבע לא צוין — הונח ₪.")}</div></div>
   ${f(t("Villes", "ערים"), `<span class="chip on">${t("Raanana", "רעננה")}</span><span class="chip on">${t("Kfar Saba", "כפר סבא")}</span>`)}
  </div>
  <div style="padding:10px 16px 12px;background:var(--surface);border-top:1px solid var(--line);display:flex;gap:10px"><span class="m-btn" style="width:52px;flex-shrink:0" title="mic">${I("Mic", 20)}</span><span class="m-btn pri grow" style="opacity:.45">${t("Enregistrer", "שמירה")}</span></div>`;
  return mpage(L, "Revue", shellM(L, { title: t("Nouveau client", "לקוח חדש"), back: true, right: `<span class="badge acc" style="margin-inline-end:8px">${I("Sparkles", 12)}${t("Pré-rempli", "מולא ע״י AI")}</span>`, noTabs: true, body }));
}

// ───────────────────────── 5. Scan
export function scan(L) {
  const { t } = L;
  const paper = `<svg viewBox="0 0 260 340" style="width:240px;transform:rotate(-2.5deg);filter:drop-shadow(0 10px 18px rgb(0 0 0/.5))"><rect width="260" height="340" rx="3" fill="#f6f3e8"/>${Array.from({ length: 12 }, (_, k) => `<line x1="14" x2="246" y1="${44 + k * 24}" y2="${44 + k * 24}" stroke="#b9c6d9" stroke-width="1"/>`).join("")}<g fill="none" stroke="#243a63" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 30c10-10 14 8 24-2s8 12 20 0 10-8 22-2"/><path d="M24 54c8-8 12 6 22-2s10 10 20 0M92 52c8-4 14 6 24-2s16 6 28-2"/><path d="M24 78c12-10 14 8 28-2s12 8 24 0M90 78c10-6 16 6 30 0"/><path d="M24 102c10-8 16 6 26-2s14 8 28 0 12-6 26 0"/><path d="M24 126c14-8 14 8 30-2s10 8 22 0M90 126c12-6 18 6 34-2"/><path d="M24 150c8-8 14 6 26-2s14 8 24-2"/><path d="M24 174c12-6 16 6 30-2M72 174c10-8 18 6 30-2s12 6 26-2"/></g></svg>`;
  const corner = (pos) => `<i style="position:absolute;${pos};width:26px;height:26px;border:3px solid #fff;border-radius:6px;${pos.includes("block-start") ? "border-bottom:0" : "border-top:0"};${pos.includes("inset-inline-start") ? "border-inline-end:0" : "border-inline-start:0"}"></i>`;
  const body = `<div class="scroll" style="padding:0;display:flex;flex-direction:column">
   <div style="padding:0 16px 8px;display:flex;align-items:center;justify-content:space-between"><span class="ib" style="background:rgb(255 255 255/.12);color:#fff">${I("X", 20)}</span><div class="seg" style="background:rgb(255 255 255/.08);border-color:rgb(255 255 255/.15)"><span style="color:#aab">${I("Mic", 14)}${t("Dicter", "הכתבה")}</span><span class="on">${I("ScanLine", 14)}${t("Scanner", "סריקה")}</span></div><span class="ib" style="background:rgb(255 255 255/.12);color:#fff">${I("Zap", 20)}</span></div>
   <div style="flex:1;margin:0 12px;border-radius:20px;background:radial-gradient(circle at 50% 40%,#3a3f4d,#1b1e27);position:relative;display:grid;place-items:center;overflow:hidden">
     <div style="position:absolute;inset:26px 20px">${corner("inset-block-start:0;inset-inline-start:0")}${corner("inset-block-start:0;inset-inline-end:0")}${corner("inset-block-end:0;inset-inline-start:0")}${corner("inset-block-end:0;inset-inline-end:0")}</div>
     ${paper}
     <span class="badge ok" style="position:absolute;inset-block-start:14px;background:rgb(30 160 100/.9);color:#fff;height:26px;padding:0 12px">${I("Check", 13, { strokeWidth: 3 })}${t("Papier détecté · bords redressés", "דף זוהה · קצוות יושרו")}</span>
     <div style="position:absolute;inset-block-end:12px;font-size:12px;color:#c3c8d6">${t("Lumière correcte · texte net", "תאורה תקינה · טקסט חד")}</div></div>
   <div style="padding:14px 16px 6px;display:flex;align-items:center;justify-content:space-between">
     <div style="display:flex;gap:8px"><div style="width:48px;height:62px;border-radius:8px;border:2px solid #6f93ff;background:#f6f3e8;position:relative"><span class="avatar sm" style="position:absolute;inset-block-start:-7px;inset-inline-end:-7px;background:#6f93ff;color:#fff">1</span></div><div style="width:48px;height:62px;border-radius:8px;border:1px dashed rgb(255 255 255/.3);display:grid;place-items:center;color:#8a90a2">${I("Plus", 18)}</div></div>
     <span style="width:76px;height:76px;border-radius:50%;border:4px solid #fff;display:grid;place-items:center"><span style="width:58px;height:58px;border-radius:50%;background:#fff"></span></span>
     <div style="width:104px;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12px;color:#aab"><span class="ib" style="background:rgb(255 255 255/.12);color:#fff">${I("Images", 20)}</span>${t("Galerie", "גלריה")}</div></div>
   <div style="padding:6px 16px 8px"><div class="m-btn pri" style="background:#4d74f0;border-color:#4d74f0">${t("Analyser 1 page", "ניתוח עמוד אחד")}</div></div></div>`;
  return mpage(L, "Scanner", shellM(L, { dark: true, bar: false, noTabs: true, body }));
}

// ───────────────────────── 6. Liste des biens
export function properties(L) {
  const { t, cur, n, m2 } = { ...L, m2: L.m2 };
  const items = [
    [0, "4 pièces · Rue Ahuza 24", "4 חדרים · אחוזה 24", "Raanana · Neve Zemer", "רעננה · נווה זמר", 3450000, "112", "3/6", "ok", "Actif", "פעיל", "Expire dans 12 j", "פוקעת בעוד 12 ימים"],
    [4, "4 pièces jardin · Rue HaPalmach 6", "4 חדרים עם גינה · הפלמ״ח 6", "Kfar Saba · Nord", "כפר סבא · צפון", 3890000, "128", "0/3", "ok", "Actif", "פעיל", "", ""],
    [2, "5 pièces · Rue Herzl 112", "5 חדרים · הרצל 112", "Herzliya · Gan Rashal", "הרצליה · גן רש״ל", 4980000, "140", "6/8", "warn", "Sous offre", "בהצעה", "", ""],
  ];
  const body = `<div class="scroll" style="padding-top:0">
   <div class="row" style="gap:8px;margin-bottom:10px"><div class="input grow" style="height:46px;border-radius:12px;font-size:15px">${I("Search", 18)}<span class="muted">${t("Ville, rue, référence…", "עיר, רחוב, מספר נכס…")}</span></div><span class="ib bd" style="width:46px;height:46px;border-radius:12px;position:relative">${I("SlidersHorizontal", 20)}<span class="avatar sm" style="position:absolute;inset-block-start:-5px;inset-inline-end:-5px;background:var(--accent);color:#fff">3</span></span></div>
   <div class="hs" style="margin-bottom:12px"><span class="chip on" style="height:34px">${t("Vente", "מכירה")}${I("X", 13)}</span><span class="chip on" style="height:34px">${t("Raanana +2", "רעננה +2")}${I("X", 13)}</span><span class="chip on" style="height:34px">${t("3–5 pièces", "3–5 חדרים")}${I("X", 13)}</span><span class="chip" style="height:34px">${t("Mamad", "ממ״ד")}</span></div>
   <div class="row" style="margin-bottom:10px"><span class="note">${t("112 biens", "112 נכסים")}</span><span class="seg sp"><span class="on">${I("Rows3", 14)}${t("Liste", "רשימה")}</span><span>${I("Map", 14)}${t("Carte", "מפה")}</span></span></div>
   <div class="col" style="gap:12px">${items.map(([s, tf, th, cf, ch, pr, a, fl, bc, sf, sh, mf, mh]) => `<div class="m-card" style="overflow:hidden"><div style="height:140px;position:relative">${photo(s)}<span class="badge ${bc}" style="position:absolute;inset-block-start:10px;inset-inline-start:10px;background:#fff"><i class="dot"></i>${t(sf, sh)}</span>${mf ? `<span class="badge warn" style="position:absolute;inset-block-start:10px;inset-inline-end:10px">${I("Clock", 11)}${t(mf, mh)}</span>` : ""}<span class="ib" style="position:absolute;inset-block-end:6px;inset-inline-end:6px;background:#fff;width:36px;height:36px">${I("Send", 17)}</span></div>
     <div style="padding:11px 14px 13px"><div class="row"><b class="tab" style="font-size:18px">${cur(pr)}</b></div><div style="font-weight:500;margin-top:1px">${t(tf, th)}</div><div class="note">${t(cf, ch)}</div><div class="row" style="gap:14px;margin-top:6px;font-size:12.5px"><span class="row" style="gap:4px">${I("Ruler", 14)}${a} ${m2}</span><span class="row" style="gap:4px">${I("Building", 14)}<span class="ltr">${fl}</span></span></div></div></div>`).join("")}</div></div>`;
  return mpage(L, "Biens", shellM(L, { title: t("Biens", "נכסים"), tab: "properties", right: `<span class="ib">${I("Plus", 22)}</span>`, body }));
}

// ───────────────────────── 7. Fiche client
export function client(L) {
  const { t, cur, ph } = L;
  const act = (ic, f, h, pri) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px"><span style="width:100%;height:52px;border-radius:14px;display:grid;place-items:center;${pri ? "background:var(--accent);color:#fff" : "background:var(--surface);border:1px solid var(--line-strong)"}">${I(ic, 22)}</span><span style="font-size:11.5px;font-weight:500">${t(f, h)}</span></div>`;
  const body = `<div class="scroll" style="padding-top:0">
   <div class="row" style="gap:14px;margin-bottom:12px"><div class="avatar lg" style="width:58px;height:58px;font-size:19px">${t("DL", "דל")}</div><div class="grow"><div style="font-size:21px;font-weight:600;letter-spacing:-.01em">${t("Dana Lévi", "דנה לוי")}</div><div class="row wrap" style="gap:4px;margin-top:4px"><span class="badge acc">${t("Acheteuse", "קונה")}</span><span class="badge">${t("Olé · 3 mois", "עולה חדשה · 3 חודשים")}</span><span class="badge">${I("Languages", 11)}FR</span></div></div></div>
   <div class="row" style="gap:10px;align-items:flex-start;margin-bottom:6px">${act("Phone", "Appeler", "חיוג")}${act("MessageCircle", "WhatsApp", "WhatsApp")}${act("Mail", "E-mail", "אימייל")}${act("Send", "Envoyer", "שליחה", true)}</div>
   <div class="m-card" style="padding:12px 14px;margin-top:14px;border-color:color-mix(in oklab,var(--warn) 35%,white);background:var(--warn-soft)"><div class="row"><span style="color:var(--warn)">${I("Clock", 18)}</span><div class="grow"><div style="font-weight:600;font-size:13.5px">${t("Proposer visite samedi soir", "להציע ביקור במוצאי שבת")}</div><div class="note">${t("Mari disponible dès 20 h · demain", "הבעל פנוי מ-20:00 · מחר")}</div></div>${chk(0)}</div></div>
   <div class="m-h">${t("RECHERCHE", "חיפוש")}</div>
   <div class="m-card" style="padding:12px 14px"><div class="row wrap" style="gap:6px"><span class="chip on">${t("Achat", "רכישה")}</span><span class="chip">${t("Raanana", "רעננה")}</span><span class="chip">${t("Kfar Saba", "כפר סבא")}</span><span class="chip">${t("Herzliya", "הרצליה")}</span><span class="chip">${t("3,5–5 pièces", "3.5–5 חדרים")}</span><span class="chip"><span class="tab">≤ ${cur(4000000)}</span></span><span class="chip on">${t("Mamad", "ממ״ד")}</span><span class="chip on">${t("Parking", "חניה")}</span></div></div>
   <div class="m-h">${I("Target", 14)}${t("BIENS CORRESPONDANTS", "נכסים מתאימים")} <span class="badge acc">12</span></div>
   <div class="hs" style="margin-inline:-16px;padding-inline:16px">${[[0, 96, "4 pièces · Raanana", "4 חדרים · רעננה", 3450000], [4, 88, "4 p. jardin · Kfar Saba", "4 חד׳ גינה · כפר סבא", 3890000], [2, 81, "5 pièces · Herzliya", "5 חדרים · הרצליה", 4980000]].map(([s, v, f, h, p]) => `<div class="m-card" style="width:196px;flex-shrink:0;overflow:hidden"><div style="height:96px;position:relative">${photo(s)}<span class="badge" style="position:absolute;inset-block-start:8px;inset-inline-start:8px;background:#fff;color:var(--accent-ink)"><span class="ltr tab"><b>${v}</b> %</span></span></div><div style="padding:9px 11px"><div style="font-weight:500;font-size:13px">${t(f, h)}</div><b class="tab">${cur(p)}</b></div></div>`).join("")}</div>
   <div class="m-h">${t("ACTIVITÉ", "פעילות")}</div>
   <div class="m-card"><div class="m-row">${I("PhoneOutgoing", 18)}<div class="grow"><div style="font-weight:500">${t("Appel sortant · 6 min", "שיחה יוצאת · 6 דקות")}</div><div class="note">${t("Aujourd'hui 14:05", "היום 14:05")}</div></div></div><div class="m-row">${I("MailOpen", 18)}<div class="grow"><div style="font-weight:500">${t("E-mail ouvert · 3 biens", "אימייל נפתח · 3 נכסים")}</div><div class="note">${t("Hier 21:12", "אתמול 21:12")}</div></div></div></div>
  </div>`;
  return mpage(L, "Fiche client", shellM(L, { title: "", back: true, tab: "clients", right: `<span class="ib">${I("Pencil", 20)}</span><span class="ib">${I("Ellipsis", 22)}</span>`, body }));
}

// ───────────────────────── 8. Fiche bien + envoi
export function propertySend(L) {
  const { t, cur, m2 } = L;
  const body = `<div style="flex:1;position:relative;overflow:hidden;margin-top:-46px">
    <div style="height:290px;position:relative">${photo(0)}<div style="position:absolute;inset-block-start:52px;inset-inline:12px;display:flex;justify-content:space-between"><span class="ib flip" style="background:#fff">${I("ChevronLeft", 22)}</span><span class="ib" style="background:#fff">${I("Share2", 20)}</span></div><span class="badge" style="position:absolute;inset-block-end:12px;inset-inline-end:12px;background:rgb(0 0 0/.55);color:#fff">${I("Images", 12)}<span class="ltr">1 / 18</span></span></div>
    <div style="padding:14px 16px"><div class="row"><span class="badge ok"><i class="dot"></i>${t("Actif", "פעיל")}</span><span class="badge"><span class="ltr tab">P-2026-0142</span></span></div><div class="tab" style="font-size:26px;font-weight:600;letter-spacing:-.02em;margin-top:8px">${cur(3450000)}</div><div style="font-weight:500">${t("4 pièces · Rue Ahuza 24, Raanana", "4 חדרים · אחוזה 24, רעננה")}</div>
    <div class="row" style="gap:16px;margin-top:10px;font-size:13px"><span class="row" style="gap:5px">${I("Ruler", 15)}112 ${m2}</span><span class="row" style="gap:5px">${I("ShieldCheck", 15)}${t("Mamad", "ממ״ד")}</span><span class="row" style="gap:5px">${I("Car", 15)}×2</span></div></div></div>`;
  const cl = [["DL", "דל", "Dana Lévi", "דנה לוי", 96, 1], ["MC", "מכ", "Michaël Cohen", "מיכאל כהן", 91, 1], ["SA", "שא", "Sarah Azoulay", "שרה אזולאי", 84, 0]];
  const overlay = `<div class="scrim"></div><div class="sheet" style="padding-bottom:30px"><div class="grab"></div>
   <div class="row" style="margin-bottom:10px"><b style="font-size:18px" class="grow">${t("Envoyer ce bien", "שליחת הנכס")}</b><span class="ib">${I("X", 20)}</span></div>
   <div class="seg" style="display:flex;margin-bottom:12px"><span class="on grow" style="justify-content:center;height:38px">${I("Mail", 16)}${t("E-mail", "אימייל")}</span><span class="grow" style="justify-content:center;height:38px">${I("MessageCircle", 16)}WhatsApp</span></div>
   <div class="note" style="margin-bottom:6px">${t("Clients correspondants", "לקוחות מתאימים")}</div>
   <div class="m-card">${cl.map(([a, h, nf, nh, v, on]) => `<div class="m-row">${chk(on)}${avatar(t(a, h))}<div class="grow"><div style="font-weight:500">${t(nf, nh)}</div><div class="note">${t("Langue : Français", "שפה: צרפתית")}</div></div><span class="ltr tab badge acc">${v} %</span></div>`).join("")}</div>
   <div class="row" style="margin:12px 2px;font-size:12.5px" ><span class="muted">${I("Languages", 14)}</span><span class="grow muted">${t("Message et fiche dans la langue de chaque client.", "ההודעה והדף בשפת כל לקוח.")}</span></div>
   <div class="m-btn pri">${I("Send", 18)}${t("Envoyer à 2 clients", "שליחה ל-2 לקוחות")}</div></div>`;
  return mpage(L, "Fiche bien", shellM(L, { bar: false, tab: "properties", body, overlay }));
}

// ───────────────────────── 9. Affiche
export function posterMobile(L) {
  const { t } = L;
  const body = `<div class="scroll" style="padding-top:0">
   <div class="hs" style="margin-bottom:10px"><span class="chip on" style="height:34px">Instagram 4:5</span><span class="chip" style="height:34px">Story 9:16</span><span class="chip" style="height:34px">Instagram 1:1</span><span class="chip" style="height:34px">Facebook</span></div>
   <div style="padding:5px;border:2px solid var(--accent);border-radius:12px;background:var(--accent-soft);width:260px;margin:0 auto">${poster(L, "A", { seed: 0 })}</div>
   <div class="row" style="justify-content:center;gap:6px;margin:10px 0 12px"><i style="width:18px;height:6px;border-radius:3px;background:var(--accent)"></i><i style="width:6px;height:6px;border-radius:3px;background:var(--line-strong)"></i><i style="width:6px;height:6px;border-radius:3px;background:var(--line-strong)"></i><span class="note" style="margin-inline-start:6px">${t("Variante 1 sur 3", "וריאציה 1 מתוך 3")}</span></div>
   <div class="seg" style="display:flex;margin-bottom:12px"><span class="grow" style="justify-content:center;height:36px">${t("Fidèle", "נאמן")}</span><span class="on grow" style="justify-content:center;height:36px">${t("Amélioré", "משופר")}</span><span class="grow" style="justify-content:center;height:36px">${t("Créatif", "יצירתי")}</span></div>
   <div class="m-btn sm" style="margin-bottom:6px">${I("RotateCcw", 16)}${t("Régénérer · 2 crédits", "יצירה מחדש · 2 קרדיטים")}</div></div>
   <div style="padding:10px 16px 12px;background:var(--surface);border-top:1px solid var(--line)"><div class="row" style="gap:8px;margin-bottom:8px"><span class="m-btn sm grow">${I("Copy", 16)}${t("Légende", "כיתוב")}</span><span class="m-btn sm grow">${I("Download", 16)}${t("Enregistrer", "שמירה")}</span></div><div class="m-btn pri">${I("Share2", 18)}${t("Partager (WhatsApp, Instagram…)", "שיתוף ב-WhatsApp או Instagram")}</div></div>`;
  return mpage(L, "Affiche", shellM(L, { title: t("Affiche", "מודעה"), back: true, noTabs: true, right: `<span class="badge" style="margin-inline-end:8px">${I("Coins", 12)}142</span>`, body }));
}

export const MOBILE = [
  ["m1-aujourdhui", today, "Aujourd'hui", "היום"],
  ["m2-nouveau", newSheet, "Menu Nouveau", "תפריט חדש"],
  ["m3-dictee", dictate, "Dictée", "הכתבה"],
  ["m4-revue-ia", review, "Revue IA", "בדיקת AI"],
  ["m5-scan", scan, "Scanner un papier", "סריקת דף"],
  ["m6-biens", properties, "Liste des biens", "רשימת נכסים"],
  ["m7-fiche-client", client, "Fiche client", "כרטיס לקוח"],
  ["m8-fiche-bien-envoi", propertySend, "Fiche bien + envoi", "כרטיס נכס + שליחה"],
  ["m9-affiche", posterMobile, "Affiche & partage", "מודעה ושיתוף"],
];
