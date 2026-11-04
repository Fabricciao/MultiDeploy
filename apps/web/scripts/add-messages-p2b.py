# Fusionne des clés (fr, he, en) dans messages/*.json — garantit la parité des 3 langues.
import json, sys
T = {}
def add(prefix, rows):
    for k, v in rows.items(): T[f"{prefix}.{k}"] = v
add("brand", {
 "title": ("Charte graphique", "מיתוג", "Brand identity"), "sub": ("Appliquée à l'interface, aux affiches et aux e-mails de l'agence.", "מוחלת על הממשק, המודעות והאימיילים של הסוכנות.", "Applied to the agency's interface, posters and emails."),
 "forbidden": ("Réservé aux administrateurs.", "שמור למנהלים.", "Administrators only."),
 "analyzeTitle": ("Importer depuis votre site", "ייבוא מהאתר שלכם", "Import from your website"), "url": ("Adresse du site", "כתובת האתר", "Website address"), "analyze": ("Analyser", "ניתוח", "Analyze"), "analyzing": ("Analyse…", "מנתח…", "Analyzing…"),
 "analyzed": ("Analyse terminée : {name}", "הניתוח הסתיים: {name}", "Analysis complete: {name}"), "logoFound": ("logo détecté", "זוהה לוגו", "logo found"),
 "analyzeHint": ("Nous lisons la page d'accueil (couleur du thème, variables CSS, polices, logo). Vous pouvez tout ajuster avant d'appliquer.", "אנחנו קוראים את דף הבית (צבע ערכת הנושא, משתני CSS, גופנים, לוגו). אפשר לכוונן הכול לפני ההחלה.", "We read your home page (theme colour, CSS variables, fonts, logo). You can adjust everything before applying."),
 "colors": ("Couleurs", "צבעים", "Colors"), "primary": ("Primaire", "ראשי", "Primary"), "secondary": ("Secondaire", "משני", "Secondary"), "accent": ("Accent", "הדגשה", "Accent"),
 "adjusted": ("Pour rester lisible (contraste AA), l'interface utilisera {color} (contraste {ratio}:1).", "לשם קריאות (ניגודיות AA) הממשק ישתמש ב-{color} (ניגודיות {ratio}:1).", "To stay readable (AA contrast), the interface will use {color} (contrast {ratio}:1)."),
 "radius": ("Arrondi", "עיגול פינות", "Corner radius"), "density": ("Densité", "צפיפות", "Density"), "densities.comfortable": ("Confortable", "מרווחת", "Comfortable"), "densities.standard": ("Standard", "רגילה", "Standard"), "densities.compact": ("Compacte", "דחוסה", "Compact"),
 "logoFonts": ("Logo et polices", "לוגו וגופנים", "Logo and fonts"), "logo": ("Logo", "לוגו", "Logo"), "fontLatin": ("Police latine", "גופן לטיני", "Latin font"), "fontHebrew": ("Police hébraïque", "גופן עברי", "Hebrew font"),
 "legalContact": ("Mentions légales et contact", "הערות משפטיות ויצירת קשר", "Legal notice and contact"), "legal": ("Mention légale", "הערה משפטית", "Legal notice"),
 "legalHint": ("Apposée sur chaque affiche (n° de licence de courtier, conditions…). À faire valider par votre conseil.", "מתווספת לכל מודעה (מס׳ רישיון מתווך, תנאים…). יש לאמת מול היועץ המשפטי.", "Printed on every poster (broker licence no., terms…). Have it validated by your counsel."),
 "phone": ("Téléphone", "טלפון", "Phone"), "website": ("Site web", "אתר", "Website"), "apply": ("Appliquer la charte", "החלת המיתוג", "Apply brand"), "saved": ("Charte appliquée.", "המיתוג הוחל.", "Brand applied."),
 "version": ("Version {v}", "גרסה {v}", "Version {v}"), "preview": ("Aperçu en direct", "תצוגה מקדימה חיה", "Live preview"), "previewNote": ("Les couleurs de statut (succès, alerte, erreur) restent fixes pour la lisibilité.", "צבעי הסטטוס (הצלחה, אזהרה, שגיאה) נשארים קבועים לשם קריאות.", "Status colours (success, warning, error) stay fixed for readability."),
 "sampleAgency": ("Votre agence", "הסוכנות שלכם", "Your agency"), "sampleButton": ("Nouveau bien", "נכס חדש", "New property"), "sampleChip": ("Vente", "מכירה", "Sale"), "sampleChip2": ("Raanana", "רעננה", "Ra'anana"), "sampleRow": ("Appartement {n}", "דירה {n}", "Apartment {n}"), "sampleStatus": ("Actif", "פעיל", "Active"),
 "errors.forbidden": ("Droits insuffisants.", "אין הרשאה.", "Insufficient rights."), "errors.url_required": ("Saisissez l'adresse de votre site.", "הזינו את כתובת האתר.", "Enter your website address."),
 "errors.invalid_url": ("Adresse invalide.", "כתובת לא תקינה.", "Invalid address."), "errors.blocked": ("Cette adresse n'est pas autorisée.", "כתובת זו אינה מותרת.", "This address is not allowed."), "errors.timeout": ("Le site met trop de temps à répondre.", "האתר מגיב לאט מדי.", "The site took too long to respond."),
 "errors.too_large": ("Page trop volumineuse.", "הדף גדול מדי.", "Page too large."), "errors.bad_type": ("Ce n'est pas une page web.", "זה לא דף אינטרנט.", "Not a web page."), "errors.http": ("Le site a répondu par une erreur.", "האתר החזיר שגיאה.", "The site returned an error."), "errors.failed": ("Impossible de lire ce site.", "לא ניתן לקרוא את האתר.", "Could not read this site."),
 "errors.invalid_color": ("Couleur invalide (format #rrggbb).", "צבע לא תקין (פורמט #rrggbb).", "Invalid colour (#rrggbb format)."), "errors.logo_too_large": ("Logo trop lourd (3 Mo max).", "הלוגו גדול מדי (עד 3MB).", "Logo too large (3 MB max)."), "errors.logo_invalid": ("Logo illisible.", "הלוגו לא קריא.", "Unreadable logo."),
})
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
