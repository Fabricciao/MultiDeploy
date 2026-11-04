# Fusionne des clés (fr, he, en) dans messages/*.json — garantit la parité des 3 langues.
import json, sys
T = {}
def add(prefix, rows):
    for k, v in rows.items(): T[f"{prefix}.{k}"] = v
add("media", {
 "empty": ("Aucune photo. Ajoutez-en pour enrichir la fiche, les envois et les affiches.", "אין תמונות. הוסיפו כדי להעשיר את הכרטיס, השליחות והמודעות.", "No photos. Add some to enrich the listing, shares and posters."),
 "cover": ("Photo de couverture", "תמונה ראשית", "Cover photo"), "delete": ("Supprimer", "מחיקה", "Delete"), "choose": ("Choisir des photos", "בחירת תמונות", "Choose photos"),
 "upload": ("Téléverser", "העלאה", "Upload"), "uploading": ("Envoi…", "מעלה…", "Uploading…"), "added": ("{count, plural, one {# photo ajoutée} other {# photos ajoutées}}", "{count, plural, one {נוספה תמונה #} two {נוספו # תמונות} other {נוספו # תמונות}}", "{count, plural, one {# photo added} other {# photos added}}"),
 "hint": ("JPEG, PNG ou WebP, 12 Mo max, 25 photos max. Les données GPS/EXIF sont supprimées automatiquement.", "JPEG, PNG או WebP, עד 12MB, עד 25 תמונות. נתוני GPS/EXIF נמחקים אוטומטית.", "JPEG, PNG or WebP, 12 MB max, 25 photos max. GPS/EXIF data is stripped automatically."),
 "errors.too_large": ("fichier trop lourd", "הקובץ גדול מדי", "file too large"), "errors.not_image": ("ce n'est pas une image", "זה לא קובץ תמונה", "not an image"), "errors.unsupported": ("format non pris en charge", "פורמט לא נתמך", "unsupported format"),
 "errors.too_small": ("image trop petite", "התמונה קטנה מדי", "image too small"), "errors.limit": ("limite de 25 photos atteinte", "הגעתם למגבלת 25 תמונות", "25-photo limit reached"), "errors.failed": ("échec du traitement", "העיבוד נכשל", "processing failed"), "errors.none": ("Aucun fichier valide ou droits insuffisants.", "אין קובץ תקין או שאין הרשאה.", "No valid file or insufficient rights."),
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
