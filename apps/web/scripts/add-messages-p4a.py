# Fusionne des clés (fr, he, en) dans messages/*.json — garantit la parité des 3 langues.
import json, sys
T = {}
def add(prefix, rows):
    for k, v in rows.items(): T[f"{prefix}.{k}"] = v
add("integrations", {
 "title": ("Intégrations", "אינטגרציות", "Integrations"), "sub": ("API publique, webhooks et widget pour le site de l'agence.", "API ציבורי, קרסי רשת וווידג׳ט לאתר הסוכנות.", "Public API, webhooks and widget for the agency website."), "forbidden": ("Réservé aux administrateurs.", "שמור למנהלים.", "Administrators only."),
 "keys": ("Clés d'API", "מפתחות API", "API keys"), "keyOnce": ("Copiez cette clé maintenant : elle ne sera plus jamais affichée.", "העתיקו את המפתח עכשיו: הוא לא יוצג שוב.", "Copy this key now: it will never be shown again."), "keyName": ("Nom de la clé (ex. site web)", "שם המפתח (למשל אתר)", "Key name (e.g. website)"),
 "scopeProps": ("Lire les biens publiés", "קריאת נכסים שפורסמו", "Read published properties"), "scopeLeads": ("Créer des leads", "יצירת לידים", "Create leads"), "createKey": ("Créer la clé", "יצירת מפתח", "Create key"), "revoke": ("Révoquer", "ביטול", "Revoke"), "revoked": ("Révoquée", "בוטל", "Revoked"),
 "lastUsed": ("utilisée le {date}", "שימוש אחרון {date}", "last used {date}"), "neverUsed": ("jamais utilisée", "טרם נעשה שימוש", "never used"),
 "embedTitle": ("Widget pour votre site", "ווידג׳ט לאתר שלכם", "Widget for your website"), "embedHint": ("Collez ce code dans votre site : biens publiés et formulaire de contact qui crée un lead dans le CRM.", "הדביקו קוד זה באתר: נכסים שפורסמו וטופס יצירת קשר שיוצר ליד במערכת.", "Paste this code into your site: published properties and a contact form that creates a lead in the CRM."),
 "webhooks": ("Webhooks", "קרסי רשת", "Webhooks"), "addHook": ("Ajouter le webhook", "הוספת קרס רשת", "Add webhook"), "delete": ("Supprimer", "מחיקה", "Delete"), "deliveries": ("{ok} livrés · {ko} en échec", "{ok} נמסרו · {ko} נכשלו", "{ok} delivered · {ko} failed"),
 "hookHint": ("HTTPS uniquement. Chaque envoi est signé (en-tête X-MultiDeploy-Signature, HMAC-SHA256) et retenté avec délai croissant.", "HTTPS בלבד. כל שליחה חתומה (כותרת X-MultiDeploy-Signature, HMAC-SHA256) ומנוסה שוב בהשהיה גוברת.", "HTTPS only. Each delivery is signed (X-MultiDeploy-Signature header, HMAC-SHA256) and retried with increasing delay."),
 "errors.forbidden": ("Droits insuffisants.", "אין הרשאה.", "Insufficient rights."), "errors.plan": ("Cette option n'est pas incluse dans votre plan.", "אפשרות זו אינה כלולה בתוכנית שלכם.", "This option is not included in your plan."), "errors.scopes": ("Choisissez au moins une portée.", "בחרו לפחות הרשאה אחת.", "Choose at least one scope."),
 "errors.invalid_url": ("L'URL doit commencer par https://.", "הכתובת חייבת להתחיל ב-https://.", "The URL must start with https://."), "errors.blocked": ("Cette adresse n'est pas autorisée.", "כתובת זו אינה מותרת.", "This address is not allowed."),
})
add("embed", {"empty": ("Aucun bien publié pour le moment.", "אין נכסים מפורסמים כרגע.", "No published property at the moment."), "contact": ("Nous contacter", "צרו קשר", "Contact us"), "name": ("Nom", "שם", "Name"), "phone": ("Téléphone", "טלפון", "Phone"), "message": ("Votre message", "ההודעה שלכם", "Your message"),
 "consent": ("J'accepte d'être recontacté(e) et de recevoir des sélections de biens.", "אני מסכים/ה שיחזרו אליי ולקבל בחירות נכסים.", "I agree to be contacted and to receive property selections."), "send": ("Envoyer", "שליחה", "Send"), "thanks": ("Merci ! Nous vous recontactons très vite.", "תודה! נחזור אליכם בהקדם.", "Thank you! We will contact you shortly."),
 "needContact": ("Indiquez un téléphone ou un e-mail.", "יש להזין טלפון או אימייל.", "Please provide a phone or email."), "tooMany": ("Trop de demandes, réessayez plus tard.", "יותר מדי בקשות, נסו שוב מאוחר יותר.", "Too many requests, try again later.")})
add("data", {"title": ("Données", "נתונים", "Data"), "sub": ("Portabilité et droits des personnes.", "ניוד נתונים וזכויות הפרט.", "Portability and data-subject rights."), "forbidden": ("Réservé aux administrateurs.", "שמור למנהלים.", "Administrators only."),
 "exportText": ("Téléchargez toutes les données de l'agence (biens, clients, critères, affaires, activités, tâches) au format CSV dans une archive ZIP.", "הורידו את כל נתוני הסוכנות (נכסים, לקוחות, קריטריונים, עסקאות, פעילויות, משימות) בפורמט CSV בארכיון ZIP.", "Download all agency data (properties, clients, criteria, deals, activities, tasks) as CSV files in a ZIP archive."),
 "exportBtn": ("Exporter les données", "ייצוא נתונים", "Export data"), "rights": ("Pour répondre à une demande d'accès ou d'effacement d'un client, utilisez les actions sur sa fiche (export JSON, effacement).", "למענה לבקשת גישה או מחיקה של לקוח, השתמשו בפעולות בכרטיס שלו (ייצוא JSON, מחיקה).", "To answer a client's access or erasure request, use the actions on their record (JSON export, erasure).")})
add("audit", {"title": ("Journal d'audit", "יומן ביקורת", "Audit log"), "sub": ("Créations, modifications et suppressions des fiches sensibles (200 dernières).", "יצירות, שינויים ומחיקות של כרטיסים רגישים (200 אחרונות).", "Creations, changes and deletions of sensitive records (last 200)."), "forbidden": ("Réservé aux administrateurs.", "שמור למנהלים.", "Administrators only."),
 "when": ("Date", "תאריך", "Date"), "who": ("Qui", "מי", "Who"), "action": ("Action", "פעולה", "Action"), "entity": ("Objet", "אובייקט", "Object"), "detail": ("Détail", "פרטים", "Detail"), "all": ("Tout", "הכול", "All"), "filter": ("Filtrer", "סינון", "Filter")})
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
