/** Modèles de titre/description d'annonce (aucune IA : texte déterministe, uniquement à partir des champs saisis). */
export type DescFields = { transaction: "sale" | "rent"; propertyType: string; rooms: number | null; area: number | null; floor: number | null; floorsTotal: number | null; city: string | null;
  mamad: boolean; parking: number; elevator: boolean; sukkah: boolean; storage: boolean; ac: boolean };
export type L = "fr" | "he" | "en";

const TYPE: Record<L, Record<string, string>> = {
  fr: { apartment: "appartement", garden_apt: "appartement avec jardin", duplex: "duplex", penthouse: "penthouse", house: "maison", cottage: "cottage", land: "terrain", office: "bureau", shop: "local commercial" },
  he: { apartment: "דירה", garden_apt: "דירת גן", duplex: "דופלקס", penthouse: "פנטהאוז", house: "בית", cottage: "קוטג׳", land: "קרקע", office: "משרד", shop: "חנות" },
  en: { apartment: "apartment", garden_apt: "garden apartment", duplex: "duplex", penthouse: "penthouse", house: "house", cottage: "cottage", land: "plot of land", office: "office", shop: "retail unit" },
};
const FEAT: Record<L, Record<"mamad" | "elevator" | "sukkah" | "storage" | "ac", string>> = {
  fr: { mamad: "mamad (pièce protégée)", elevator: "ascenseur", sukkah: "balcon soukka", storage: "cave / entrepôt", ac: "climatisation" },
  he: { mamad: "ממ״ד", elevator: "מעלית", sukkah: "מרפסת סוכה", storage: "מחסן", ac: "מיזוג אוויר" },
  en: { mamad: "safe room (mamad)", elevator: "elevator", sukkah: "sukkah balcony", storage: "storage room", ac: "air conditioning" },
};
const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function buildDescription(f: DescFields, l: L): { title: string; description: string } {
  const type = TYPE[l][f.propertyType] ?? TYPE[l].apartment!;
  const rooms = f.rooms ? num(f.rooms) : null;
  const sale = f.transaction === "sale";
  const feats = (["mamad", "elevator", "sukkah", "storage", "ac"] as const).filter((k) => f[k]).map((k) => FEAT[l][k]);
  if (f.parking > 0) feats.push(l === "fr" ? `${f.parking} place${f.parking > 1 ? "s" : ""} de parking` : l === "he" ? (f.parking > 1 ? `${f.parking} חניות` : "חניה") : `${f.parking} parking space${f.parking > 1 ? "s" : ""}`);
  const floor = f.floor !== null ? (l === "fr" ? `au ${f.floor}${f.floor === 1 ? "er" : "e"} étage${f.floorsTotal ? ` sur ${f.floorsTotal}` : ""}` : l === "he" ? `בקומה ${f.floor}${f.floorsTotal ? ` מתוך ${f.floorsTotal}` : ""}` : `on floor ${f.floor}${f.floorsTotal ? ` of ${f.floorsTotal}` : ""}`) : null;
  const area = f.area ? (l === "he" ? `${num(f.area)} מ״ר` : `${num(f.area)} m²`) : null;
  const city = f.city;

  let title: string, intro: string;
  if (l === "fr") {
    title = `${sale ? "À vendre" : "À louer"} : ${[type[0]!.toUpperCase() + type.slice(1), rooms ? `${rooms} pièces` : null, city].filter(Boolean).join(" · ")}`;
    intro = `${sale ? "À vendre" : "À louer"}${city ? ` à ${city}` : ""} : ${type}${rooms ? ` de ${rooms} pièces` : ""}${area ? ` (${area})` : ""}${floor ? `, situé ${floor}` : ""}.`;
  } else if (l === "he") {
    title = `${sale ? "למכירה" : "להשכרה"}: ${[rooms ? `${type} ${rooms} חדרים` : type, city].filter(Boolean).join(" · ")}`;
    intro = `${sale ? "למכירה" : "להשכרה"}${city ? ` ב${city}` : ""}: ${type}${rooms ? ` ${rooms} חדרים` : ""}${area ? ` (${area})` : ""}${floor ? `, ${floor}` : ""}.`;
  } else {
    title = `${sale ? "For sale" : "For rent"}: ${[rooms ? `${rooms}-room ${type}` : type, city].filter(Boolean).join(" · ")}`;
    intro = `${sale ? "For sale" : "For rent"}${city ? ` in ${city}` : ""}: ${rooms ? `${rooms}-room ` : ""}${type}${area ? ` (${area})` : ""}${floor ? `, ${floor}` : ""}.`;
  }
  const featLine = feats.length ? (l === "fr" ? ` Atouts : ${feats.join(", ")}.` : l === "he" ? ` יתרונות: ${feats.join(", ")}.` : ` Features: ${feats.join(", ")}.`) : "";
  return { title, description: intro + featLine };
}
