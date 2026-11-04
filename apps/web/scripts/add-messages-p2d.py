# Fusionne des clés (fr, he, en) dans messages/*.json — garantit la parité des 3 langues.
import json, sys
T = {}
def add(prefix, rows):
    for k, v in rows.items(): T[f"{prefix}.{k}"] = v
add("common", {"dictate": ("Dicter", "הכתבה", "Dictate"), "scan": ("Scanner un papier", "סריקת דף", "Scan a paper")})
add("intake", {
 "title": ("Saisie assistée", "הזנה מסייעת", "Assisted entry"), "sub": ("Dictez ou photographiez : vous relisez et validez avant l'enregistrement.", "הכתיבו או צלמו: תבדקו ותאשרו לפני השמירה.", "Dictate or photograph: you review and confirm before saving."),
 "modes.voice": ("Dicter", "הכתבה", "Dictate"), "modes.scan": ("Scanner un papier", "סריקת דף", "Scan a paper"), "modes.text": ("Coller un texte", "הדבקת טקסט", "Paste text"), "targets.contact": ("Client", "לקוח", "Client"), "targets.property": ("Bien", "נכס", "Property"),
 "voiceHintContact": ("Dites : nom, téléphone, ce que cherche le client, budget, villes, mamad/parking…", "אמרו: שם, טלפון, מה הלקוח מחפש, תקציב, ערים, ממ״ד/חניה…", "Say: name, phone, what the client wants, budget, cities, safe room/parking…"),
 "voiceHintProperty": ("Dites : type, pièces, surface, étage, rue et ville, prix, équipements…", "אמרו: סוג, חדרים, שטח, קומה, רחוב ועיר, מחיר, מאפיינים…", "Say: type, rooms, area, floor, street and city, price, features…"),
 "record": ("Enregistrer", "הקלטה", "Record"), "redo": ("Refaire", "מחדש", "Redo"), "stop": ("Terminer", "סיום", "Stop"), "analyze": ("Analyser", "ניתוח", "Analyze"), "analyzing": ("Analyse…", "מנתח…", "Analyzing…"),
 "micDenied": ("Accès au micro refusé : autorisez-le dans le navigateur ou collez un texte.", "הגישה למיקרופון נדחתה: אפשרו בדפדפן או הדביקו טקסט.", "Microphone access denied: allow it in the browser or paste text."),
 "sttMissing": ("Transcription vocale non configurée sur cet environnement : utilisez « Coller un texte ».", "תמלול קולי לא הוגדר בסביבה זו: השתמשו ב״הדבקת טקסט״.", "Speech transcription is not configured in this environment: use “Paste text”."),
 "visionMissing": ("Lecture de documents (vision) non configurée sur cet environnement.", "קריאת מסמכים (ראייה) לא הוגדרה בסביבה זו.", "Document reading (vision) is not configured in this environment."),
 "scanHint": ("Photographiez une fiche manuscrite ou imprimée, bien éclairée, à plat. Les champs incertains seront signalés.", "צלמו דף כתוב או מודפס, מואר היטב ושטוח. שדות לא ודאיים יסומנו.", "Photograph a handwritten or printed sheet, well lit and flat. Uncertain fields will be flagged."),
 "choosePhoto": ("Choisir ou prendre une photo", "בחירה או צילום תמונה", "Choose or take a photo"),
 "textHint": ("Collez une transcription, un message WhatsApp ou vos notes : les champs sont extraits automatiquement.", "הדביקו תמלול, הודעת WhatsApp או הערות: השדות יחולצו אוטומטית.", "Paste a transcript, a WhatsApp message or your notes: fields are extracted automatically."),
 "textExampleContact": ("Ex. : Dana Lévi cherche un 4 pièces à Raanana, budget 4 millions, il lui faut un mamad. Tél 050-123-4567", "לדוגמה: דנה לוי מחפשת דירת 4 חדרים ברעננה, תקציב עד 4 מיליון, חייבת ממ״ד. טלפון 050-123-4567", "E.g.: Dana Levi is looking for a 4-room apartment in Ra'anana, budget up to 4 million, needs a safe room. Phone 050-123-4567"),
 "textExampleProperty": ("Ex. : 4 pièces à vendre, 112 m², étage 3 sur 6, rue Ahuza 24 à Raanana, prix 3 450 000 ₪, mamad, ascenseur", "לדוגמה: דירת 4 חדרים למכירה, 112 מ״ר, קומה 3 מתוך 6, אחוזה 24 ברעננה, מחיר 3,450,000 ₪, ממ״ד, מעלית", "E.g.: 4-room apartment for sale, 112 sqm, floor 3 of 6, Ahuza 24 Ra'anana, price 3,450,000 ₪, safe room, elevator"),
 "privacy": ("Rien n'est enregistré avant votre validation. Les enregistrements audio ne sont pas conservés.", "דבר לא נשמר לפני אישורכם. הקלטות שמע אינן נשמרות.", "Nothing is saved before you confirm. Audio recordings are not kept."),
 "errors.empty": ("Rien à analyser.", "אין מה לנתח.", "Nothing to analyze."), "errors.forbidden": ("Droits insuffisants.", "אין הרשאה.", "Insufficient rights."), "errors.stt_not_configured": ("Transcription vocale non configurée.", "תמלול קולי לא הוגדר.", "Speech transcription not configured."),
 "errors.vision_not_configured": ("Lecture de documents non configurée.", "קריאת מסמכים לא הוגדרה.", "Document reading not configured."), "errors.insufficient_credits": ("Crédits IA insuffisants.", "אין מספיק קרדיטי AI.", "Not enough AI credits."),
 "errors.too_large": ("Fichier trop volumineux.", "הקובץ גדול מדי.", "File too large."), "errors.bad_image": ("Image illisible.", "תמונה לא קריאה.", "Unreadable image."), "errors.provider_failed": ("L'analyse a échoué (crédits restitués). Réessayez ou collez un texte.", "הניתוח נכשל (הקרדיטים הוחזרו). נסו שוב או הדביקו טקסט.", "Analysis failed (credits refunded). Try again or paste text."), "errors.bad_audio": ("Audio illisible.", "שמע לא קריא.", "Unreadable audio."),
 "reviewTitle": ("Vérifier avant d'enregistrer", "בדיקה לפני שמירה", "Review before saving"), "reviewSub": ("Pré-rempli automatiquement ({provider}). Rien n'est enregistré tant que vous n'avez pas validé.", "מולא אוטומטית ({provider}). דבר לא נשמר עד לאישורכם.", "Pre-filled automatically ({provider}). Nothing is saved until you confirm."),
 "discard": ("Abandonner", "ביטול", "Discard"), "sourceImage": ("Document source", "מסמך מקור", "Source document"), "transcript": ("Transcription", "תמלול", "Transcript"),
 "reviewNote": ("Les champs marqués « à vérifier » ont été déduits avec moins de certitude. Survolez la coche verte pour voir l'extrait source.", "שדות המסומנים ״לבדיקה״ נקבעו בוודאות נמוכה יותר. העבירו עכבר על הוי הירוק לצפייה בקטע המקור.", "Fields marked “verify” were inferred with lower confidence. Hover the green tick to see the source excerpt."),
 "verify": ("À vérifier", "לבדיקה", "Verify"), "evidence": ("Dans la source :", "במקור:", "In the source:"), "missing": ("Il manque : {fields}", "חסר: {fields}", "Missing: {fields}"), "propertyVerify": ("Certains champs sont à vérifier : relisez attentivement avant d'enregistrer.", "יש שדות לבדיקה: קראו בעיון לפני השמירה.", "Some fields need checking: read carefully before saving."),
 "fields.first_name": ("nom", "שם", "name"), "fields.phone": ("téléphone", "טלפון", "phone"), "fields.price": ("prix", "מחיר", "price"), "fields.city_id": ("ville", "עיר", "city"),
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
