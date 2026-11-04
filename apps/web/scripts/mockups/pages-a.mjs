import { I, shell, photo, avatar } from "./lib.mjs";

const PROPS = [
  { ref: "P-2026-0142", fr: ["4 pièces", "Rue Ahuza 24", "Raanana", "Neve Zemer"], he: ["4 חדרים", "אחוזה 24", "רעננה", "נווה זמר"], rooms: 4, area: 112, floor: "3/6", price: 3450000, st: "active", mandate: ["ex", 12], ag: ["YL", "יל"], seed: 0 },
  { ref: "P-2026-0141", fr: ["3,5 pièces", "Rue Weizmann 8", "Kfar Saba", "Centre"], he: ["3.5 חדרים", "ויצמן 8", "כפר סבא", "מרכז"], rooms: 3.5, area: 86, floor: "2/5", price: 2190000, st: "offer", mandate: ["ex", 64], ag: ["DM", "דמ"], seed: 1 },
  { ref: "P-2026-0139", fr: ["5 pièces", "Rue Herzl 112", "Herzliya", "Gan Rashal"], he: ["5 חדרים", "הרצל 112", "הרצליה", "גן רש״ל"], rooms: 5, area: 140, floor: "6/8", price: 4980000, st: "active", mandate: ["non", 0], ag: ["YL", "יל"], seed: 2 },
  { ref: "P-2026-0138", fr: ["Duplex 5 pièces", "Rue Jabotinsky 40", "Raanana", "Centre"], he: ["דופלקס 5 חדרים", "ז׳בוטינסקי 40", "רעננה", "מרכז"], rooms: 5, area: 155, floor: "4–5/5", price: 5250000, st: "active", mandate: ["ex", 5], ag: ["AB", "אב"], seed: 3 },
  { ref: "P-2026-0135", fr: ["4 pièces jardin", "Rue HaPalmach 6", "Kfar Saba", "Kfar Saba Nord"], he: ["4 חדרים עם גינה", "הפלמ״ח 6", "כפר סבא", "כפר סבא צפון"], rooms: 4, area: 128, floor: "0/3", price: 3890000, st: "active", mandate: ["ex", 88], ag: ["DM", "דמ"], seed: 4 },
  { ref: "P-2026-0131", fr: ["3 pièces", "Rue Rothschild 17", "Netanya", "Centre ville"], he: ["3 חדרים", "רוטשילד 17", "נתניה", "מרכז העיר"], rooms: 3, area: 74, floor: "1/4", price: 1650000, st: "draft", mandate: ["none", 0], ag: ["AB", "אב"], seed: 5 },
  { ref: "P-2026-0127", fr: ["Penthouse 5 pièces", "Rue Ben Gurion 3", "Herzliya", "Marina"], he: ["פנטהאוז 5 חדרים", "בן גוריון 3", "הרצליה", "מרינה"], rooms: 5, area: 168, floor: "9/9", price: 7400000, st: "active", mandate: ["ex", 31], ag: ["YL", "יל"], seed: 0 },
  { ref: "P-2026-0122", fr: ["4 pièces", "Rue Hanassi 55", "Raanana", "Ramat Poleg"], he: ["4 חדרים", "הנשיא 55", "רעננה", "רמת פולג"], rooms: 4, area: 105, floor: "5/7", price: 3290000, st: "sold", mandate: ["ex", 0], ag: ["DM", "דמ"], seed: 1 },
];
const ST = { active: ["ok", "Actif", "פעיל"], offer: ["warn", "Sous offre", "בהצעה"], draft: ["", "Brouillon", "טיוטה"], sold: ["acc", "Vendu", "נמכר"] };

export function properties(L) {
  const { t, n, cur, ph } = L;
  const rows = PROPS.map((p, i) => {
    const [type, street, city, nb] = L.he ? p.he : p.fr;
    const sel = i === 0 || i === 3;
    const m = p.mandate[0] === "ex"
      ? (p.mandate[1] === 0 ? `<span class="badge">${t("Exclusif", "בלעדיות")}</span>` : p.mandate[1] <= 14 ? `<span class="badge warn">${I("Clock", 12)}${t(`Expire dans ${p.mandate[1]} j`, `פוקעת בעוד ${p.mandate[1]} ימים`)}</span>` : `<span class="badge">${t("Exclusif", "בלעדיות")} · ${t(`${p.mandate[1]} j`, `${p.mandate[1]} ימים`)}</span>`)
      : `<span class="muted">${p.mandate[0] === "none" ? "—" : t("Non exclusif", "ללא בלעדיות")}</span>`;
    const [cls, sf, sh] = ST[p.st];
    return `<tr class="${sel ? "sel" : ""}"><td style="width:36px"><span class="cb ${sel ? "on" : ""}">${sel ? I("Check", 11, { strokeWidth: 3 }) : ""}</span></td>
<td><div class="row gap12"><div class="thumb">${photo(p.seed, street)}</div><div><div style="font-weight:500">${type} · ${street}</div><div class="note"><span class="ltr tab">${p.ref}</span></div></div></div></td>
<td>${city}<div class="note">${nb}</div></td>
<td class="tab">${n(p.rooms)}</td><td class="tab">${n(p.area)} ${L.m2}</td><td class="tab"><span class="ltr">${p.floor}</span></td>
<td class="tab" style="font-weight:500">${cur(p.price)}</td>
<td><span class="badge ${cls}"><i class="dot"></i>${t(sf, sh)}</span></td><td>${m}</td><td>${avatar(L.he ? p.ag[1] : p.ag[0])}</td></tr>`;
  }).join("");

  const body = `
<div class="ph"><div class="grow"><h1>${t("Biens", "נכסים")}</h1><p>${t("248 biens · 183 actifs", "248 נכסים · 183 פעילים")}</p></div>
  <span class="seg"><span class="on">${I("Table2", 14)}${t("Tableau", "טבלה")}</span><span>${I("LayoutGrid", 14)}${t("Grille", "רשת")}</span><span>${I("Map", 14)}${t("Carte", "מפה")}</span></span>
  <button class="btn">${I("Download", 15)}${t("Exporter", "ייצוא")}</button>
  <button class="btn pri">${I("Plus", 15)}${t("Nouveau bien", "נכס חדש")}</button></div>

<div class="tabs"><span class="on">${t("Tous", "הכול")}</span><span>${t("Mes biens", "הנכסים שלי")} <span class="faint">34</span></span><span>${t("Exclusivités à renouveler", "בלעדיויות לחידוש")} <span class="badge warn" style="margin-inline-start:4px">7</span></span><span>${t("Sans photos", "ללא תמונות")}</span><span>${t("Prix en baisse", "מחיר שירד")}</span></div>

<div class="row wrap" style="margin-bottom:14px;position:relative">
  <span class="chip on">${t("Vente", "מכירה")}<span class="x">${I("X", 12)}</span></span>
  <span class="chip on">${t("Raanana · Kfar Saba · Herzliya", "רעננה · כפר סבא · הרצליה")}<span class="x">${I("X", 12)}</span></span>
  <span class="chip on">${t("3 – 5 pièces", "3 – 5 חדרים")}<span class="x">${I("X", 12)}</span></span>
  <span class="chip on" style="box-shadow:0 0 0 3px color-mix(in oklab,var(--accent) 18%,transparent)">${t("Prix ≤ 5 M ₪", "מחיר עד 5 מ׳ ₪")}${I("ChevronDown", 12)}</span>
  <span class="chip">${t("Mamad", "ממ״ד")}${I("ChevronDown", 12)}</span>
  <span class="chip dash">${I("Plus", 12)}${t("Filtre", "סינון")}</span>
  <button class="btn ghost sm">${t("Réinitialiser", "איפוס")}</button>
  <button class="btn ghost sm" style="color:var(--accent-ink)">${I("Bookmark", 13)}${t("Enregistrer la vue", "שמירת תצוגה")}</button>
  <span class="sp note">${t("112 résultats", "112 תוצאות")}</span>

  <div class="card" style="position:absolute;inset-block-start:36px;inset-inline-start:392px;width:320px;z-index:4;box-shadow:0 8px 24px -8px rgb(20 30 60/.25)">
    <div class="card-b col gap12">
      <div class="row"><b style="font-size:13px">${t("Prix", "מחיר")}</b><span class="sp seg"><span class="on">₪</span><span>$</span><span>€</span></span></div>
      <div style="display:flex;align-items:flex-end;gap:3px;height:44px">${[8, 14, 22, 34, 40, 36, 28, 22, 14, 9, 6, 4].map((h, k) => `<i style="flex:1;height:${h}px;border-radius:2px 2px 0 0;background:${k < 9 ? "color-mix(in oklab,var(--accent) 55%,white)" : "var(--line)"}"></i>`).join("")}</div>
      <div style="position:relative;height:4px;background:var(--line);border-radius:2px;margin:2px 7px"><i style="position:absolute;inset-inline:0 25%;height:4px;background:var(--accent);border-radius:2px"></i><i style="position:absolute;inset-inline-start:0;top:-5px;width:14px;height:14px;border-radius:50%;background:#fff;border:2px solid var(--accent);translate:-3px"></i><i style="position:absolute;inset-inline-start:75%;top:-5px;width:14px;height:14px;border-radius:50%;background:#fff;border:2px solid var(--accent)"></i></div>
      <div class="row gap12"><div class="grow"><div class="lbl">${t("Min", "מינימום")}</div><div class="input tab">${cur(0)}</div></div><div class="grow"><div class="lbl">${t("Max", "מקסימום")}</div><div class="input tab">${cur(5000000)}</div></div></div>
      <div class="row"><button class="btn ghost sm">${t("Effacer", "ניקוי")}</button><button class="btn pri sm sp">${t("Appliquer", "החלה")}</button></div>
    </div></div>
</div>

<div class="card" style="overflow:hidden"><table class="tbl"><thead><tr>
 <th></th><th>${t("Bien", "נכס")}</th><th>${t("Ville", "עיר")}</th><th>${t("Pièces", "חדרים")}</th><th>${t("Surface", "שטח")}</th><th>${t("Étage", "קומה")}</th><th>${t("Prix", "מחיר")} ${I("ArrowDown", 11)}</th><th>${t("Statut", "סטטוס")}</th><th>${t("Mandat", "מנדט")}</th><th>${t("Agent", "סוכן")}</th></tr></thead><tbody>${rows}</tbody></table></div>

<div class="row" style="position:sticky;inset-block-end:16px;margin:18px auto 0;width:fit-content;background:var(--ink);color:#fff;border-radius:10px;padding:6px 8px 6px 14px;box-shadow:0 10px 30px -8px rgb(10 20 50/.45)">
  <b style="font-weight:500;margin-inline-end:6px">${t("2 biens sélectionnés", "נבחרו 2 נכסים")}</b>
  <button class="btn sm" style="background:#fff">${I("Send", 13)}${t("Envoyer à un client", "שליחה ללקוח")}</button>
  <button class="btn sm" style="background:#fff">${I("Sparkles", 13)}${t("Créer des affiches", "יצירת מודעות")}</button>
  <button class="btn sm" style="background:transparent;color:#fff;border-color:rgb(255 255 255/.25)">${t("Assigner", "שיוך")}</button>
  <button class="btn sm icon" style="background:transparent;color:#fff;border-color:rgb(255 255 255/.25)">${I("Ellipsis", 14)}</button></div>`;
  return shell(L, { active: "properties", title: t("Biens", "נכסים") + " · Eliezer.immo", body });
}

export function property(L) {
  const { t, n, cur, ph } = L;
  const [type, street, city, nb] = L.he ? PROPS[0].he : PROPS[0].fr;
  const matches = [
    ["DL", "דל", t("Dana Lévi", "דנה לוי"), t("4 pièces · Raanana · ≤ 4 M ₪", "4 חדרים · רעננה · עד 4 מ׳ ₪"), 96],
    ["MC", "מכ", t("Michaël Cohen", "מיכאל כהן"), t("Mamad, parking · ≤ 3,6 M ₪", "ממ״ד, חניה · עד 3.6 מ׳ ₪"), 91],
    ["SA", "שא", t("Sarah Azoulay", "שרה אזולאי"), t("3–5 pièces · Raanana, Kfar Saba", "3–5 חדרים · רעננה, כפר סבא"), 84],
    ["YB", "יב", t("Yoni Ben-David", "יוני בן דוד"), t("Investisseur · Raanana", "משקיע · רעננה"), 72],
  ];
  const ring = (v) => `<span style="width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:600;background:conic-gradient(var(--accent) ${v * 3.6}deg,var(--line) 0);position:relative"><span style="position:absolute;inset:3px;background:var(--surface);border-radius:50%"></span><span style="position:relative" class="tab">${v}</span></span>`;
  const feat = [["Mamad", "ממ״ד", "ShieldCheck"], ["Parking × 2", "חניה × 2", "Car"], ["Ascenseur", "מעלית", "ArrowUpDown"], ["Balcon soukka", "מרפסת סוכה", "Fence"], ["Climatisation", "מיזוג", "Snowflake"], ["Cave / Machsan", "מחסן", "Archive"]];
  const crumbs = `<div class="row note" style="margin-inline-start:8px"><a href="#" class="row" style="color:var(--muted)"><span class="flip">${I("ChevronLeft", 14)}</span>${t("Biens", "נכסים")}</a></div>`;
  const body = `
<div class="ph"><div class="grow"><div class="row" style="margin-bottom:4px"><span class="badge ok"><i class="dot"></i>${t("Actif", "פעיל")}</span><span class="badge"><span class="ltr tab">${PROPS[0].ref}</span></span><span class="badge warn">${I("Clock", 12)}${t("Exclusivité : 12 j restants", "בלעדיות: נותרו 12 ימים")}</span></div>
 <h1>${type} · ${street}, ${city}</h1><p>${nb} · ${t("En ligne depuis 38 jours · 41 vues · 6 visites", "באוויר 38 ימים · 41 צפיות · 6 ביקורים")}</p></div>
 <button class="btn">${I("Link", 15)}${t("Page publique", "עמוד ציבורי")}</button>
 <button class="btn">${I("Sparkles", 15)}${t("Créer une affiche", "יצירת מודעה")}</button>
 <button class="btn pri">${I("Send", 15)}${t("Envoyer à un client", "שליחה ללקוח")}</button>
 <button class="btn icon">${I("Ellipsis", 16)}</button></div>

<div style="display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:20px;align-items:start">
<div class="col gap16">
  <div class="card" style="padding:8px"><div style="display:grid;grid-template-columns:2fr 1fr 1fr;grid-template-rows:150px 150px;gap:6px;border-radius:8px;overflow:hidden">
    <div style="grid-row:span 2;position:relative">${photo(0, street).replace("<svg ", '<svg style="width:100%;height:100%" ')}<span class="badge" style="position:absolute;inset-block-start:10px;inset-inline-start:10px;background:#fff">${t("Couverture", "תמונה ראשית")}</span></div>
    ${[1, 2, 3].map((k) => `<div>${photo(k, "")}</div>`).join("")}
    <div style="position:relative">${photo(4, "")}<div style="position:absolute;inset:0;background:rgb(15 25 50/.55);color:#fff;display:grid;place-items:center;font-weight:500;gap:2px;text-align:center">${I("Images", 18)}<span>${t("+ 14 photos", "+ 14 תמונות")}</span></div></div></div></div>

  <div class="card"><div class="card-b"><div class="tabs" style="margin:-4px 0 14px"><span class="on">${t("Caractéristiques", "מאפיינים")}</span><span>${t("Description", "תיאור")}</span><span>${t("Documents", "מסמכים")} <span class="faint">5</span></span><span>${t("Historique", "היסטוריה")}</span></div>
  <div class="kv">
    <div><div class="k">${t("Pièces", "חדרים")}</div><div class="v tab">4</div></div><div><div class="k">${t("Surface construite", "שטח בנוי")}</div><div class="v tab">112 ${L.m2}</div></div>
    <div><div class="k">${t("Balcon", "מרפסת")}</div><div class="v tab">14 ${L.m2}</div></div><div><div class="k">${t("Étage", "קומה")}</div><div class="v tab"><span class="ltr">3 / 6</span></div></div>
    <div><div class="k">${t("Salles de bain", "חדרי רחצה")}</div><div class="v tab">2</div></div><div><div class="k">${t("Année", "שנת בנייה")}</div><div class="v tab">2016</div></div>
    <div><div class="k">${t("Arnona / mois", "ארנונה לחודש")}</div><div class="v tab">${cur(690)}</div></div><div><div class="k">${t("Va'ad bayit / mois", "ועד בית לחודש")}</div><div class="v tab">${cur(420)}</div></div>
    <div><div class="k">${t("Enregistrement", "רישום")}</div><div class="v">${t("Tabou", "טאבו")}</div></div><div><div class="k">${t("Entrée", "כניסה")}</div><div class="v">${t("Immédiate", "מיידית")}</div></div>
    <div><div class="k">${t("État", "מצב")}</div><div class="v">${t("Rénové", "משופץ")}</div></div><div><div class="k">${t("Orientation", "כיוון")}</div><div class="v">${t("Sud-ouest", "דרום-מערב")}</div></div></div>
  <hr class="sw" style="margin:16px 0"><div class="row wrap">${feat.map(([f, h, ico]) => `<span class="chip">${I(ico, 13)}${t(f, h)}</span>`).join("")}</div></div></div>

  <div class="card"><div class="card-h">${t("Description", "תיאור")}<div class="seg sp"><span class="on">FR</span><span>עב</span><span>EN</span></div></div>
  <div class="card-b col gap12"><div class="row"><span class="badge warn">${I("Sparkles", 12)}${t("Traduit par IA · à relire", "תורגם ע״י AI · לבדיקה")}</span><span class="note">${t("Source : hébreu", "מקור: עברית")}</span><button class="btn sm ghost sp">${I("Pencil", 13)}${t("Modifier", "עריכה")}</button></div>
  <p style="max-width:68ch">${t("Lumineux 4 pièces rénové au 3e étage d'un immeuble de 2016, à deux pas du parc Raanana. Séjour ouvert sur balcon soukka orienté sud-ouest, suite parentale, mamad, deux places de parking couvertes et cave. Calme, bien desservi par les écoles et les commerces.", "דירת 4 חדרים משופצת ומוארת בקומה 3 בבניין משנת 2016, במרחק הליכה מפארק רעננה. סלון פתוח למרפסת סוכה בכיוון דרום-מערב, חדר הורים עם חדר רחצה, ממ״ד, שתי חניות מקורות ומחסן. שכונה שקטה עם קרבה למוסדות חינוך ולמסחר.")}</p></div></div>
</div>

<div class="col gap16">
  <div class="card"><div class="card-b col gap12"><div><div class="note">${t("Prix demandé", "מחיר מבוקש")}</div><div style="font-size:26px;font-weight:600;letter-spacing:-.02em" class="tab">${cur(3450000)}</div></div>
   <div class="row note"><span class="tab">${cur(30804)} / ${L.m2}</span><span class="badge ok sp">${I("TrendingDown", 12)}<span class="ltr">−2,8 %</span></span></div>
   <hr class="sw"><div class="row"><div class="avatar">${t("YL", "יל")}</div><div class="grow"><div style="font-weight:500">${t("Yaël Lévy", "יעל לוי")}</div><div class="note">${t("Agent responsable", "סוכן אחראי")}</div></div><button class="btn sm ghost icon">${I("Phone", 14)}</button></div>
   <div class="row"><div class="avatar" style="background:var(--sunken);color:var(--muted)">${t("RM", "רמ")}</div><div class="grow"><div style="font-weight:500">${t("Rafaël Mizrahi", "רפאל מזרחי")}</div><div class="note">${t("Propriétaire · ", "בעלים · ")}${ph("+972 52-555-0183")}</div></div><button class="btn sm ghost icon">${I("MessageCircle", 14)}</button></div></div></div>

  <div class="card"><div class="card-h">${I("Target", 15)}${t("Clients correspondants", "לקוחות מתאימים")}<span class="badge acc">7</span></div>
  <div>${matches.map(([a, b, name, sub, v], k) => `<div class="row" style="padding:10px 14px;${k < matches.length - 1 ? "border-bottom:1px solid var(--line)" : ""}"><span class="cb ${k < 2 ? "on" : ""}">${k < 2 ? I("Check", 11, { strokeWidth: 3 }) : ""}</span>${avatar(L.he ? b : a)}<div class="grow"><div style="font-weight:500">${name}</div><div class="note" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sub}</div></div>${ring(v)}</div>`).join("")}</div>
  <div class="card-b" style="border-top:1px solid var(--line)"><button class="btn pri" style="width:100%">${I("Send", 14)}${t("Envoyer à 2 clients", "שליחה ל-2 לקוחות")}</button></div></div>

  <div class="card"><div class="card-h">${t("Activité", "פעילות")}</div><div class="card-b col gap12" style="font-size:12.5px">
   ${[["Eye", "Dana Lévi a ouvert la fiche envoyée", "דנה לוי פתחה את הדף שנשלח", "Il y a 2 h", "לפני שעתיים"], ["CalendarCheck", "Visite avec M. Cohen — retour positif", "ביקור עם מר כהן — משוב חיובי", "Hier", "אתמול"], ["TrendingDown", "Prix baissé de 3 550 000 à 3 450 000 ₪", "המחיר ירד מ-3,550,000 ל-3,450,000 ₪", "Lun.", "יום ב׳"]].map(([ico, fr, he, tf, th]) => `<div class="row" style="align-items:flex-start">${`<span class="muted" style="margin-top:1px">${I(ico, 15)}</span>`}<div class="grow">${t(fr, he)}<div class="faint" style="font-size:11.5px">${t(tf, th)}</div></div></div>`).join("")}</div></div>
</div></div>`;
  return shell(L, { active: "properties", title: t("Fiche bien", "כרטיס נכס"), body, crumbs });
}

export function client(L) {
  const { t, n, cur, ph } = L;
  const crumbs = `<div class="row note" style="margin-inline-start:8px"><a href="#" class="row" style="color:var(--muted)"><span class="flip">${I("ChevronLeft", 14)}</span>${t("Clients", "לקוחות")}</a></div>`;
  const cards = [[0, 96, "Raanana", "רעננה", "4 pièces", "4 חדרים", 3450000, ["Budget OK", "Mamad ✓", "Parking ✓"], ["בתקציב", "ממ״ד ✓", "חניה ✓"]], [4, 88, "Kfar Saba", "כפר סבא", "4 pièces jardin", "4 חדרים עם גינה", 3890000, ["Budget OK", "Mamad ✓", "Rez-de-jardin"], ["בתקציב", "ממ״ד ✓", "דירת גן"]], [2, 81, "Herzliya", "הרצליה", "5 pièces", "5 חדרים", 4980000, ["+ 24 % du budget", "Mamad ✓"], ["חריגה 24%", "ממ״ד ✓"]]];
  const tl = [
    ["PhoneOutgoing", "Appel sortant · 6 min", "שיחה יוצאת · 6 דקות", "Souhaite visiter ce week-end, préfère le samedi soir après Chabbat. Mari disponible à partir de 20 h.", "מעוניינת לבקר בסוף השבוע, מעדיפה מוצאי שבת. הבעל פנוי אחרי 20:00.", "Aujourd'hui 14:05", "היום 14:05"],
    ["MailOpen", "E-mail ouvert · 3 biens envoyés", "אימייל נפתח · נשלחו 3 נכסים", "Ouvert 2 fois · a cliqué sur P-2026-0142", "נפתח פעמיים · לחצה על P-2026-0142", "Hier 21:12", "אתמול 21:12"],
    ["Send", "Sélection envoyée par Yaël Lévy", "בחירת נכסים נשלחה ע״י יעל לוי", "", "", "Hier 18:40", "אתמול 18:40"],
    ["Mic", "Fiche créée par dictée vocale", "הכרטיס נוצר בהכתבה", "Source : recommandation (Michaël Cohen)", "מקור: המלצה (מיכאל כהן)", "Lun. 9:30", "יום ב׳ 9:30"],
  ];
  const body = `
<div class="ph" style="align-items:center"><div class="avatar lg">${t("DL", "דל")}</div><div class="grow"><div class="row"><h1>${t("Dana Lévi", "דנה לוי")}</h1><span class="faint" style="font-size:15px" lang="${L.he ? "fr" : "he"}">${L.he ? "Dana Lévi" : "דנה לוי"}</span></div>
 <div class="row wrap" style="margin-top:4px"><span class="badge acc">${t("Acheteuse", "קונה")}</span><span class="badge">${t("Olé depuis 3 mois", "עולה חדשה · 3 חודשים")}</span><span class="badge">${I("Languages", 12)}${t("Français", "צרפתית")}</span><span class="badge ok">${I("BadgeCheck", 12)}${t("Accord hypothécaire", "אישור עקרוני")}</span></div></div>
 <button class="btn">${I("Phone", 15)}${t("Appeler", "חיוג")}</button><button class="btn">${I("MessageCircle", 15)}WhatsApp</button><button class="btn">${I("Mail", 15)}${t("E-mail", "אימייל")}</button><button class="btn pri">${I("Send", 15)}${t("Envoyer des biens", "שליחת נכסים")}</button></div>
<div class="tabs"><span class="on">${t("Aperçu", "סקירה")}</span><span>${t("Activité", "פעילות")}</span><span>${t("Biens envoyés", "נכסים שנשלחו")} <span class="faint">9</span></span><span>${t("Documents", "מסמכים")}</span><span>${t("Affaires", "עסקאות")} <span class="faint">1</span></span></div>

<div style="display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:20px;align-items:start">
<div class="col gap16">
 <div class="card"><div class="card-h">${I("SlidersHorizontal", 15)}${t("Critères de recherche", "קריטריוני חיפוש")}<button class="btn ghost sm sp">${I("Pencil", 13)}${t("Modifier", "עריכה")}</button></div><div class="card-b">
  <div class="kv"><div><div class="k">${t("Transaction", "עסקה")}</div><div class="v">${t("Achat", "רכישה")}</div></div><div><div class="k">${t("Villes", "ערים")}</div><div class="v">${t("Raanana, Kfar Saba, Herzliya", "רעננה, כפר סבא, הרצליה")}</div></div><div><div class="k">${t("Budget", "תקציב")}</div><div class="v tab">${t("jusqu'à", "עד")} ${cur(4000000)}</div></div><div><div class="k">${t("Pièces", "חדרים")}</div><div class="v tab">3,5 – 5</div></div><div><div class="k">${t("Entrée", "כניסה")}</div><div class="v">${t("Avant septembre", "לפני ספטמבר")}</div></div><div><div class="k">${t("Financement", "מימון")}</div><div class="v tab">${t("Accord", "אישור")} ${cur(2200000)}</div></div></div>
  <div class="row wrap" style="margin-top:14px"><span class="note">${t("Indispensable", "חובה")}</span><span class="chip on">${I("ShieldCheck", 13)}${t("Mamad", "ממ״ד")}</span><span class="chip on">${I("Car", 13)}${t("Parking", "חניה")}</span><span class="note" style="margin-inline-start:10px">${t("Souhaité", "רצוי")}</span><span class="chip">${t("Balcon", "מרפסת")}</span><span class="chip">${t("Étage ≥ 2", "קומה 2 ומעלה")}</span></div></div></div>

 <div class="row"><h2 style="font-size:14px;font-weight:600">${t("Biens correspondants", "נכסים מתאימים")}</h2><span class="badge acc">12</span><span class="sp note">${t("Déjà envoyés masqués", "נכסים שנשלחו מוסתרים")}</span><button class="btn sm">${t("Tout voir", "הצג הכול")}</button></div>
 <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">${cards.map(([s, v, cf, ch, tf, th, pr, ff, fh]) => `<div class="card" style="overflow:hidden"><div style="height:112px;position:relative">${photo(s, "")}<span class="badge" style="position:absolute;inset-block-start:8px;inset-inline-start:8px;background:#fff;color:var(--accent-ink)"><span class="ltr tab"><b>${v}</b> %</span></span></div><div class="card-b" style="padding:11px"><div style="font-weight:500">${t(tf, th)} · ${t(cf, ch)}</div><div class="tab" style="font-weight:600;margin:2px 0 8px">${cur(pr)}</div><div class="row wrap" style="gap:4px">${(L.he ? fh : ff).map((x, k) => `<span class="badge ${x.includes("24") ? "warn" : ""}">${x}</span>`).join("")}</div></div></div>`).join("")}</div>
</div>

<div class="col gap16">
 <div class="card"><div class="card-h">${t("Activité récente", "פעילות אחרונה")}<button class="btn ghost sm sp">${I("Plus", 13)}${t("Note", "הערה")}</button></div><div class="card-b col" style="gap:0">
 ${tl.map(([ico, fr, he, nf, nh, tf, th], k) => `<div class="row" style="align-items:flex-start;gap:12px;padding-bottom:${k < tl.length - 1 ? 16 : 0}px;position:relative">${k < tl.length - 1 ? `<i style="position:absolute;inset-inline-start:13px;top:28px;bottom:0;width:1px;background:var(--line)"></i>` : ""}<span style="width:27px;height:27px;border-radius:50%;background:var(--sunken);display:grid;place-items:center;color:var(--muted);position:relative;flex-shrink:0">${I(ico, 14)}</span><div class="grow"><div style="font-weight:500">${t(fr, he)}</div>${nf ? `<div class="muted" style="margin-top:2px">${t(nf, nh)}</div>` : ""}<div class="faint" style="font-size:11.5px;margin-top:2px">${t(tf, th)}</div></div></div>`).join("")}</div></div>
 <div class="card"><div class="card-h">${t("À faire", "משימות")}</div><div class="card-b col gap12"><div class="row"><span class="cb"></span><div class="grow">${t("Proposer visite samedi soir — P-2026-0142", "להציע ביקור במוצאי שבת — P-2026-0142")}</div><span class="badge warn">${t("Demain", "מחר")}</span></div><div class="row"><span class="cb"></span><div class="grow">${t("Demander l'attestation hypothécaire", "לבקש אישור עקרוני")}</div><span class="badge">${t("Jeu.", "ה׳")}</span></div></div></div>
 <div class="card"><div class="card-h">${t("Coordonnées & consentements", "פרטי קשר והסכמות")}</div><div class="card-b col gap12"><div class="row">${I("Phone", 14)}${ph("+972 54-555-0121")}<span class="badge ok sp">WhatsApp</span></div><div class="row">${I("Mail", 14)}<span class="ltr">dana.levi@example.com</span></div><div class="row">${I("MapPin", 14)}${t("Vit à Paris · arrive en juillet", "גרה בפריז · מגיעה ביולי")}</div><hr class="sw"><div class="row"><span class="badge ok">${I("Check", 12)}${t("Opt-in marketing", "הסכמה לדיוור")}</span><span class="note">${t("12 oct. · formulaire du site", "12 באוק׳ · טופס האתר")}</span></div><div class="row"><span class="muted">${t("Agent référent", "סוכן אחראי")}</span><span class="sp row">${avatar(t("YL", "יל"), "sm")}${t("Yaël Lévy", "יעל לוי")}</span></div></div></div>
</div></div>`;
  return shell(L, { active: "clients", title: t("Fiche client", "כרטיס לקוח"), body, crumbs });
}

export function intake(L) {
  const { t, cur, ph } = L;
  const hl = (c, s) => `<mark style="background:${c};border-radius:3px;padding:0 2px;color:inherit">${s}</mark>`;
  const g = "color-mix(in oklab,var(--ok) 22%,white)", a = "color-mix(in oklab,var(--warn) 30%,white)", b = "color-mix(in oklab,var(--accent) 20%,white)";
  const transcript = L.he
    ? `${hl(g, "דנה לוי")}, Dana Lévi, מחפשת ${hl(b, "דירת 4 חדרים")} ב${hl(b, "רעננה או כפר סבא")}, ${hl(a, "תקציב עד ארבעה מיליון")}. חייבת ${hl(b, "ממ״ד וחניה")}. עלתה לפני ${hl(g, "שלושה חודשים")} מפריז, מדברת ${hl(g, "צרפתית")}. אישור עקרוני ${hl(b, "שני מיליון ומאתיים")}. הגיעה דרך ${hl(g, "מיכאל כהן")}.`
    : `${hl(g, "Dana Lévi")}, ${hl(g, "דנה לוי")} en hébreu, cherche un ${hl(b, "4 pièces")} à ${hl(b, "Raanana ou Kfar Saba")}, ${hl(a, "budget maximum quatre millions")}. Il lui faut ${hl(b, "un mamad et un parking")}. Olé depuis ${hl(g, "trois mois")}, de Paris, ${hl(g, "parle français")}. Accord de principe de ${hl(b, "2,2 millions")}. Elle vient par ${hl(g, "Michaël Cohen")}.`;
  const bars = Array.from({ length: 56 }, (_, k) => 4 + Math.abs(Math.sin(k * 0.7) * 16 + Math.sin(k * 0.23) * 10)).map((h) => `<i style="width:3px;height:${h.toFixed(0)}px;border-radius:2px;background:var(--accent);opacity:.75"></i>`).join("");
  const ok = `<span style="color:var(--ok)" title="${t("Confiance élevée", "ודאות גבוהה")}">${I("Check", 13, { strokeWidth: 2.5 })}</span>`;
  const f = (label, val, state = "ok", extra = "") => `<div><div class="lbl">${label}${state === "ok" ? ok : state === "warn" ? `<span class="badge warn" style="height:18px">${I("TriangleExclamationPoint", 11)}${t("À vérifier", "לבדיקה")}</span>` : `<span class="badge bad" style="height:18px">${t("Requis", "חובה")}</span>`}</div><div class="input ${state === "warn" ? "warn" : state === "bad" ? "bad" : ""}">${val}</div>${extra}</div>`;
  const body = `
<div class="row" style="margin-bottom:14px"><button class="btn ghost sm">${I("X", 14)}${t("Annuler", "ביטול")}</button><div class="sp row gap16 note"><span class="row" style="color:var(--ok)">${I("CircleCheck", 15)}${t("Dicter", "הכתבה")}</span><span style="width:28px;height:1px;background:var(--line-strong)"></span><span class="row" style="color:var(--ink);font-weight:500">${I("CircleDot", 15, { color: "var(--accent)" })}${t("Revue", "בדיקה")}</span><span style="width:28px;height:1px;background:var(--line-strong)"></span><span class="row">${I("Circle", 15)}${t("Enregistrer", "שמירה")}</span></div><div class="sp seg"><span class="on">${I("Mic", 14)}${t("Dicter", "הכתבה")}</span><span>${I("ScanLine", 14)}${t("Scanner un papier", "סריקת דף")}</span><span>${I("PenLine", 14)}${t("Saisir", "הזנה ידנית")}</span></div></div>

<div style="display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:20px;align-items:start">
 <div class="col gap16">
  <div class="card"><div class="card-b col gap12"><div class="row"><span class="badge ok"><i class="dot"></i>${t("Transcrit en 4 s", "תומלל ב-4 שניות")}</span><span class="note tab">0:38</span><span class="sp badge">${t("FR + עב détectés", "זוהו עב + FR")}</span></div>
   <div style="display:flex;align-items:center;gap:2px;height:44px;background:var(--sunken);border-radius:8px;padding:0 12px;overflow:hidden">${bars}</div>
   <div class="row"><button class="btn icon">${I("Play", 14)}</button><button class="btn">${I("Mic", 15)}${t("Compléter par la voix", "השלמה בהכתבה")}</button><button class="btn ghost sm sp">${I("RotateCcw", 13)}${t("Refaire", "מחדש")}</button></div></div></div>
  <div class="card"><div class="card-h">${I("TextQuote", 15)}${t("Transcription", "תמלול")}</div><div class="card-b"><p style="line-height:1.85;font-size:14px">${transcript}</p>
   <div class="row wrap" style="margin-top:12px;font-size:11.5px"><span class="row"><i style="width:10px;height:10px;border-radius:3px;background:${g}"></i>${t("Identité", "זהות")}</span><span class="row"><i style="width:10px;height:10px;border-radius:3px;background:${b}"></i>${t("Recherche", "חיפוש")}</span><span class="row"><i style="width:10px;height:10px;border-radius:3px;background:${a}"></i>${t("Ambigu", "לא חד-משמעי")}</span></div></div></div>
  <p class="note">${I("Info", 12)} ${t("Rien n'est enregistré tant que vous n'avez pas validé. L'audio est supprimé après 30 jours.", "דבר לא נשמר עד לאישורך. ההקלטה נמחקת לאחר 30 יום.")}</p>
 </div>

 <div class="card" style="position:relative"><div class="card-h">${I("UserPlus", 15)}${t("Nouveau client", "לקוח חדש")}<span class="badge acc sp">${I("Sparkles", 12)}${t("Pré-rempli par IA", "מולא ע״י AI")}</span></div>
  <div class="card-b col gap16">
   <div class="row" style="background:var(--bad-soft);border:1px solid color-mix(in oklab,var(--bad) 30%,white);border-radius:8px;padding:9px 12px;color:var(--bad)">${I("CircleExclamationPoint", 16)}<span><b style="font-weight:600">${t("Il manque : téléphone.", "חסר: טלפון.")}</b> ${t("Non mentionné dans la dictée.", "לא הוזכר בהכתבה.")}</span></div>
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
    ${f(t("Prénom", "שם פרטי"), t("Dana", "דנה"))}${f(t("Nom", "שם משפחה"), t("Lévi", "לוי"))}
    ${f(t("Nom en hébreu", "שם בעברית"), "דנה לוי")}${f(t("Langue préférée", "שפה מועדפת"), t("Français", "צרפתית") + `<span class="sp muted">${I("ChevronDown", 14)}</span>`)}
    ${f(t("Téléphone", "טלפון"), `<span class="faint ltr">+972</span>`, "bad")}${f(t("E-mail", "אימייל"), `<span class="faint">—</span>`, "ok").replace(ok, "")}
   </div>
   <hr class="sw">
   <div class="lbl" style="font-size:13px;color:var(--ink);font-weight:600;margin:0">${t("Recherche", "חיפוש")}</div>
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
    ${f(t("Transaction", "עסקה"), `<span class="chip on">${t("Achat", "רכישה")}</span>`)}${f(t("Type de bien", "סוג נכס"), `<span class="chip on">${t("Appartement", "דירה")}</span>`)}
    ${f(t("Villes", "ערים"), `<span class="chip on">${t("Raanana", "רעננה")}</span><span class="chip on">${t("Kfar Saba", "כפר סבא")}</span>`)}${f(t("Pièces", "חדרים"), `<span class="tab">4</span>`)}
    <div style="position:relative">${f(t("Budget maximum", "תקציב מקסימלי"), `<span class="tab">${cur(4000000)}</span>`, "warn")}
     <div class="card" style="position:absolute;inset-block-start:calc(100% + 6px);inset-inline-start:0;width:260px;z-index:3;box-shadow:0 8px 24px -8px rgb(20 30 60/.3)"><div class="card-b" style="padding:10px 12px;font-size:12px"><div class="note" style="margin-bottom:4px">${t("Extrait de la dictée", "קטע מההכתבה")}</div><div style="font-style:italic">« ${t("budget maximum quatre millions", "תקציב עד ארבעה מיליון")} »</div><div class="note" style="margin-top:6px">${t("Devise non précisée — ₪ supposé.", "מטבע לא צוין — הונח ₪.")}</div></div></div></div>
    ${f(t("Indispensable", "חובה"), `<span class="chip on">${t("Mamad", "ממ״ד")}</span><span class="chip on">${t("Parking", "חניה")}</span>`)}
    ${f(t("Statut Alyah", "סטטוס עלייה"), t("Olé récente", "עולה חדשה"))}${f(t("Financement", "מימון"), `<span class="tab">${t("Accord", "אישור")} ${cur(2200000)}</span>`)}
    ${f(t("Source", "מקור"), t("Recommandation · Michaël Cohen", "המלצה · מיכאל כהן"))}${f(t("Agent référent", "סוכן אחראי"), `${avatar(t("YL", "יל"), "sm")}${t("Yaël Lévy", "יעל לוי")}`).replace(ok, "")}
   </div>
   <div class="row" style="background:var(--sunken);border-radius:8px;padding:8px 12px">${I("UsersRound", 15)}<span class="note">${t("Aucun doublon trouvé pour « Dana Lévi » ou ce prénom + ville.", "לא נמצאו כפילויות ל״דנה לוי״.")}</span></div>
  </div>
  <div class="row" style="padding:12px 14px;border-top:1px solid var(--line);background:var(--sunken);border-radius:0 0 10px 10px"><span class="note">${t("1 champ à vérifier · 1 requis manquant", "שדה אחד לבדיקה · שדה חובה אחד חסר")}</span><button class="btn sp">${t("Enregistrer sans téléphone", "שמירה ללא טלפון")}</button><button class="btn pri" disabled>${t("Enregistrer", "שמירה")}</button></div>
 </div>
</div>`;
  return shell(L, { active: "clients", title: t("Nouveau client par dictée", "לקוח חדש בהכתבה"), body });
}
