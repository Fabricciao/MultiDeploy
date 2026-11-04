# Fusionne des clés (fr, he, en) dans messages/*.json — garantit la parité des 3 langues.
import json, sys
T = {}
def add(prefix, rows):
    for k, v in rows.items(): T[f"{prefix}.{k}"] = v
add("poster", {
 "title": ("Créer une affiche", "יצירת מודעה", "Create a poster"), "formats": ("Formats", "פורמטים", "Formats"), "formatsHint": ("Jusqu'à 3 formats générés d'un coup.", "עד 3 פורמטים בבת אחת.", "Up to 3 formats at once."),
 "facebook": ("Facebook · lien", "פייסבוק · קישור", "Facebook · link"), "a4": ("A4 imprimable", "A4 להדפסה", "Printable A4"), "language": ("Langue", "שפה", "Language"), "layout": ("Mise en page", "עימוד", "Layout"),
 "layouts.A": ("Plein cadre", "תמונה מלאה", "Full photo"), "layouts.B": ("Bandeau couleur", "פס צבעוני", "Colour band"), "layouts.C": ("Éditorial", "אדיטוריאלי", "Editorial"),
 "level": ("Niveau d'intervention IA", "רמת התערבות AI", "AI intervention level"), "levels.faithful": ("Fidèle", "נאמן", "Faithful"), "levels.enhanced": ("Amélioré", "משופר", "Enhanced"), "levels.creative": ("Créatif", "יצירתי", "Creative"),
 "levelsHint.faithful": ("Votre photo, habillée à la charte. Instantané.", "התמונה שלכם בעיצוב המותג. מיידי.", "Your photo, dressed in your brand. Instant."), "levelsHint.enhanced": ("Lumière, ciel et netteté retouchés (mention « image retouchée »).", "תאורה, שמיים וחדות משופרים (עם הערת ״תמונה ערוכה״).", "Light, sky and sharpness retouched (with a “retouched image” notice)."), "levelsHint.creative": ("Fond et ambiance générés autour de votre photo.", "רקע ואווירה שנוצרים סביב התמונה שלכם.", "Background and mood generated around your photo."),
 "providerMissing": ("Fournisseur d'images IA non configuré.", "ספק תמונות AI לא הוגדר.", "AI image provider not configured."), "free": ("Gratuit", "חינם", "Free"), "credits": ("{n} crédits", "{n} קרדיטים", "{n} credits"), "balance": ("Solde : {n} crédits", "יתרה: {n} קרדיטים", "Balance: {n} credits"),
 "headline": ("Accroche (optionnelle)", "כותרת (אופציונלי)", "Headline (optional)"), "headlinePlaceholder": ("Remplace le titre du bien", "מחליפה את כותרת הנכס", "Replaces the property title"),
 "showPrice": ("Afficher le prix", "להציג מחיר", "Show price"), "showAddress": ("Afficher la rue (jamais le numéro)", "להציג רחוב (לא מספר)", "Show street (never the number)"), "showContact": ("Afficher le contact de l'agent", "להציג פרטי סוכן", "Show agent contact"), "showQr": ("QR vers la page du bien", "QR לעמוד הנכס", "QR to the property page"),
 "generate": ("Générer", "יצירה", "Generate"), "generating": ("Génération…", "יוצר…", "Generating…"), "result": ("Affiches générées", "מודעות שנוצרו", "Generated posters"), "download": ("Télécharger", "הורדה", "Download"),
 "history": ("Historique", "היסטוריה", "History"), "historyEmpty": ("Aucune affiche pour ce bien.", "אין מודעות לנכס זה.", "No poster for this property."),
 "noPhotoNote": ("Aucune photo : l'affiche utilisera un fond de marque. Ajoutez des photos sur la fiche du bien.", "אין תמונות: המודעה תשתמש ברקע מותג. הוסיפו תמונות בכרטיס הנכס.", "No photo: the poster will use a brand background. Add photos on the property page."),
 "errors.no_legal": ("Renseignez d'abord la mention légale de l'agence (Paramètres → Charte graphique).", "יש להזין תחילה את ההערה המשפטית של הסוכנות (הגדרות ← מיתוג).", "First fill in the agency legal notice (Settings → Brand)."),
 "errors.forbidden": ("Droits insuffisants.", "אין הרשאה.", "Insufficient rights."), "errors.not_found": ("Bien introuvable.", "הנכס לא נמצא.", "Property not found."), "errors.not_active": ("Seuls les biens actifs ou sous offre peuvent avoir une affiche.", "רק נכסים פעילים או בהצעה יכולים לקבל מודעה.", "Only active or under-offer properties can have a poster."),
 "errors.insufficient_credits": ("Crédits IA insuffisants.", "אין מספיק קרדיטי AI.", "Not enough AI credits."), "errors.provider_missing": ("Ce niveau nécessite un fournisseur d'images IA.", "רמה זו דורשת ספק תמונות AI.", "This level requires an AI image provider."),
 "errors.render_failed": ("Le rendu a échoué. Les crédits ont été restitués.", "היצירה נכשלה. הקרדיטים הוחזרו.", "Rendering failed. Credits were refunded."), "errors.no_format": ("Choisissez au moins un format.", "בחרו לפחות פורמט אחד.", "Choose at least one format."),
})
add("props", {"poster": ("Créer une affiche", "יצירת מודעה", "Create a poster")})
for lang_i, lang in enumerate(["fr", "he", "en"]):
    path = f"messages/{lang}.json"
    data = json.load(open(path, encoding="utf-8"))
    for key, vals in T.items():
        node = data
        parts = key.split(".")
        for p in parts[:-1]:
            node = node.setdefault(p, {})
            assert isinstance(node, dict), key
        node[parts[-1]] = vals[lang_i]
    json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2); open(path, "a").write("\n")
print(len(T), "clés fusionnées")
