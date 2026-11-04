import { describe, expect, it } from "vitest";
import { findAmount, evalNumber, tokens } from "./numbers";
import { extractContact, extractProperty, type CityRef } from "./extract";

const CITIES: CityRef[] = [
  { id: "c-raanana", name_fr: "Raanana", name_he: "רעננה", name_en: "Ra'anana", aliases: ["Ra'anana"] },
  { id: "c-kfar", name_fr: "Kfar Saba", name_he: "כפר סבא", name_en: "Kfar Saba", aliases: ["Kfar Sava"] },
  { id: "c-herz", name_fr: "Herzliya", name_he: "הרצליה", name_en: "Herzliya", aliases: [] },
  { id: "c-ta", name_fr: "Tel Aviv-Jaffa", name_he: "תל אביב-יפו", name_en: "Tel Aviv-Yafo", aliases: ["Tel Aviv", "תל אביב"] },
];

describe("nombres en lettres", () => {
  it.each([
    ["quatre millions", 4_000_000], ["deux millions deux cent mille", 2_200_000], ["2,2 millions", 2_200_000], ["3 450 000", 3_450_000], ["4M", 4_000_000], ["850 mille", 850_000],
    ["ארבעה מיליון", 4_000_000], ["שני מיליון ומאתיים אלף", 2_200_000], ["שלושה מיליון", 3_000_000], ["four million", 4_000_000], ["trois cent mille", 300_000],
  ])("« %s » → %d", (s, v) => expect(findAmount(s)?.value).toBe(v));
  it("détecte la devise", () => { expect(findAmount("4 millions de shekels")?.hasCurrency).toBe(true); expect(findAmount("4 millions")?.hasCurrency).toBe(false); expect(findAmount("3,450,000 ₪")?.hasCurrency).toBe(true); });
  it("evalNumber", () => expect(evalNumber(tokens("deux cent mille"))).toBe(200_000));
});

describe("extractContact — dictée de la maquette (FR, mélange HE)", () => {
  const txt = "Dana Lévi, דנה לוי en hébreu, cherche un 4 pièces à Raanana ou Kfar Saba, budget maximum quatre millions. Il lui faut un mamad et un parking. Olé depuis trois mois, de Paris, parle français. Accord de principe de 2,2 millions. Elle vient par Michaël Cohen.";
  const r = extractContact(txt, CITIES);
  it("nom latin et hébreu", () => { expect(r.fields).toMatchObject({ first_name: "Dana", last_name: "Lévi", first_name_he: "דנה", last_name_he: "לוי" }); });
  it("critères : 4 pièces, 2 villes, budget 4 M", () => { expect(r.fields).toMatchObject({ rooms_min: 4, rooms_max: 4, budget_max: 4_000_000, city_ids: ["c-raanana", "c-kfar"] }); });
  it("le montant de l'accord de principe n'est PAS pris pour le budget", () => expect(r.fields.budget_max).not.toBe(2_200_000));
  it("indispensables, alyah, langue", () => { expect(r.fields.must_have).toEqual(expect.arrayContaining(["mamad", "parking"])); expect(r.fields.aliyah_status).toBe("recent"); expect(r.fields.preferred_locale).toBe("fr"); });
  it("budget sans devise → confiance réduite (à vérifier)", () => expect(r.meta.budget_max!.confidence).toBeLessThan(0.7));
  it("téléphone non dicté → manquant (jamais inventé)", () => { expect(r.missing).toContain("phone"); expect(r.fields.phone).toBeUndefined(); });
  it("chaque champ cite son extrait", () => { expect(r.meta.budget_max!.evidence).toContain("quatre millions"); expect(r.meta.rooms_min!.evidence).toContain("4 pièces"); });
});

describe("extractContact — hébreu", () => {
  const r = extractContact("דנה לוי, Dana Levi, מחפשת דירת ארבעה חדרים ברעננה או בכפר סבא, תקציב עד ארבעה מיליון. חייבת ממ״ד וחניה. טלפון 054-555-0121", CITIES);
  it("pièces, villes (avec préfixe ב), budget, téléphone", () => { expect(r.fields).toMatchObject({ rooms_min: 4, budget_max: 4_000_000, phone: "+972545550121", city_ids: ["c-raanana", "c-kfar"] }); expect(r.fields.must_have).toEqual(expect.arrayContaining(["mamad", "parking"])); });
  it("noms hébreux", () => expect(r.fields).toMatchObject({ first_name_he: "דנה", last_name_he: "לוי" }));
  it("trois pièces et demie / שלושה וחצי חדרים", () => {
    expect(extractContact("Yoni cherche un trois pièces et demie à Herzliya", CITIES).fields.rooms_min).toBe(3.5);
    expect(extractContact("יוני מחפש שלושה וחצי חדרים בהרצליה", CITIES).fields.rooms_min).toBe(3.5);
  });
});

describe("extractContact — anglais, location, fourchettes", () => {
  it("fourchette 3 à 4 pièces + location", () => { const r = extractContact("Sarah is looking to rent 3 to 4 rooms in Tel Aviv, up to 9000 shekels, her email is sarah@example.com", CITIES); expect(r.fields).toMatchObject({ transaction: "rent", rooms_min: 3, rooms_max: 4, email: "sarah@example.com", city_ids: ["c-ta"] }); expect(r.fields.kinds).toContain("tenant"); });
  it("texte vide ou sans information : rien d'inventé", () => { const r = extractContact("ok merci à bientôt", CITIES); expect(r.fields.budget_max).toBeUndefined(); expect(r.fields.city_ids).toEqual([]); expect(r.missing).toEqual(expect.arrayContaining(["first_name", "phone"])); });
  it("numéro international normalisé", () => expect(extractContact("Léa cherche un appartement, +33 6 12 34 56 78", CITIES).fields.phone).toBe("+33612345678"));
});

describe("extractProperty", () => {
  it("fiche de bien en français", () => {
    const r = extractProperty("Appartement à vendre 4 pièces, 112 m², étage 3 sur 6, rue Ahuza 24 à Raanana, prix 3 450 000 shekels, avec mamad, ascenseur et deux parkings", CITIES);
    expect(r.fields).toMatchObject({ transaction: "sale", property_type: "apartment", rooms: 4, area_built: 112, floor: 3, floors_total: 6, city_id: "c-raanana", price: 3_450_000, mamad: true, elevator: true, parking_count: 1 });
    expect(r.fields.street).toBe("Ahuza"); expect(r.fields.house_number).toBe("24");
  });
  it("hébreu : דירת 4 חדרים להשכרה", () => { const r = extractProperty("דירת 4 חדרים להשכרה ברעננה, 105 מ״ר, קומה 2, מחיר 7500 שקל, עם ממ״ד וחניה", CITIES); expect(r.fields).toMatchObject({ transaction: "rent", rooms: 4, area_built: 105, floor: 2, city_id: "c-raanana", price: 7500, mamad: true }); });
  it("prix et ville manquants signalés", () => expect(extractProperty("Un beau 3 pièces lumineux", CITIES).missing).toEqual(["price", "city_id"]));
});
