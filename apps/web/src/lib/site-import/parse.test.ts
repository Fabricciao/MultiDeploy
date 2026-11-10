import { describe, expect, it } from "vitest";
import { listingImages, parseListing, LISTING_PATH, SKIP_PATH } from "./parse";

const cities = [{ id: "jlm", name_fr: "Jérusalem", name_he: "ירושלים", name_en: "Jerusalem", aliases: ["Jerusalem"] }, { id: "tlv", name_fr: "Tel Aviv", name_he: "תל אביב", name_en: "Tel Aviv", aliases: [] }];
const page = (body: string, head = "") => `<!doctype html><html><head>${head}</head><body><header><a href="/">Logo</a> À vendre À louer</header><main>${body}</main><footer>© Agence</footer></body></html>`;

describe("lecture d'une fiche de bien (sans IA)", () => {
  it("champs étiquetés en français, prix en ₪, galerie WordPress", () => {
    const h = page(`<h1>Penthouse à Bait Vagan</h1><p>A vendre</p><span>6,990,000 ₪</span>
      <ul><li>Superficie : 167 m²</li><li>Types de biens : Penthouse</li><li>Nombre de pièces : 5</li><li>Nombre de chambres : 4</li><li>Etages : 17</li><li>Ville : Jerusalem</li></ul>
      <div><p>Magnifique penthouse au 17e étage avec terrasse soucca de 44 m2, climatisation centrale et deux places de parking.</p></div>
      <a href="/wp-content/uploads/2025/03/salon-300x200.jpeg"><img src="/wp-content/uploads/2025/03/salon-300x200.jpeg"></a><img src="/wp-content/uploads/logo.png">
      <h3>Biens similaires</h3><img src="/wp-content/uploads/autre-bien.jpg">`);
    const r = parseListing(h, "https://agence.test/property/penthouse/", cities)!;
    expect(r).toMatchObject({ title: "Penthouse à Bait Vagan", transaction: "sale", price: 6990000, currency: "ILS", rooms: 5, bedrooms: 4, area_built: 167, floor: 17, property_type: "penthouse", city_id: "jlm", lang: "fr" });
    expect(r.features).toEqual(expect.arrayContaining(["parking", "sukkah_balcony", "ac"]));
    expect(listingImages(h, "https://agence.test/property/penthouse/")).toEqual(["https://agence.test/wp-content/uploads/2025/03/salon.jpeg"]);
  });
  it("hébreu : location, prix au mois", () => {
    const h = page(`<h1>דירת 3 חדרים להשכרה</h1><div>מחיר: 4,490 ₪ לחודש</div><div>חדרים: 3</div><div>שטח: 70 מ"ר</div><div>קומה: 2 מתוך 4</div><div>עיר: תל אביב</div><p>דירה משופצת עם מרפסת ומעלית, קרובה לים ולתחבורה ציבורית, כניסה מיידית.</p>`);
    const r = parseListing(h, "https://agence.test/nehasim/dira-3/", cities)!;
    expect(r).toMatchObject({ transaction: "rent", price: 4490, rooms: 3, area_built: 70, floor: 2, floors_total: 4, city_id: "tlv", lang: "he" });
    expect(r.features).toContain("elevator");
  });
  it("données structurées schema.org prioritaires, « prix sur demande » sans prix", () => {
    const ld = { "@context": "https://schema.org", "@type": "RealEstateListing", name: "Villa in Herzliya", description: "A bright villa with a private garden and pool, close to the beach and schools.", image: ["https://agence.test/img/villa-1.jpg"],
      offers: { "@type": "Offer", price: 12500000, priceCurrency: "ILS" }, address: { "@type": "PostalAddress", streetAddress: "Hagalim 12", addressLocality: "Jerusalem" }, numberOfRooms: 7, floorSize: { value: 320 } };
    const h = page(`<h1>Villa</h1><p>For sale</p>`, `<script type="application/ld+json">${JSON.stringify(ld)}</script>`);
    const r = parseListing(h, "https://agence.test/listing/villa/", cities)!;
    expect(r).toMatchObject({ title: "Villa in Herzliya", price: 12500000, rooms: 7, area_built: 320, street: "Hagalim", house_number: "12", city_id: "jlm", transaction: "sale", property_type: "house" });
    const p2 = parseListing(page(`<h1>Projet neuf</h1><p>Prix sur demande</p><p>Appartements de 3 à 5 pièces, livraison 2027, dans un quartier calme proche des écoles.</p><span>35 000 ₪/m²</span>`), "https://agence.test/biens/projet/", cities)!;
    expect(p2.price).toBeNull();
  });
  it("reconnaît les adresses de fiches et écarte le reste", () => {
    expect(LISTING_PATH.test("/property/stern/")).toBe(true);
    expect(LISTING_PATH.test("/נכסים/דירה-בירושלים/")).toBe(true);
    expect(SKIP_PATH.test("/category/news/")).toBe(true);
    expect(SKIP_PATH.test("/wp-content/uploads/x.jpg")).toBe(true);
  });
});
