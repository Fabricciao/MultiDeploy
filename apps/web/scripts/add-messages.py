# Fusionne des clés (fr, he, en) dans messages/*.json — garantit la parité des 3 langues.
import json, sys
T = {
# ── common
"common.add": ("Ajouter", "הוספה", "Add"), "common.all": ("Tous", "הכול", "All"), "common.apply": ("Appliquer", "החלה", "Apply"),
"common.edit": ("Modifier", "עריכה", "Edit"), "common.new": ("Nouveau", "חדש", "New"), "common.newClient": ("Nouveau client", "לקוח חדש", "New client"),
"common.newProperty": ("Nouveau bien", "נכס חדש", "New property"), "common.next": ("Suivant", "הבא", "Next"), "common.prev": ("Précédent", "הקודם", "Previous"),
"common.no": ("Non", "לא", "No"), "common.yes": ("Oui", "כן", "Yes"), "common.reset": ("Réinitialiser", "איפוס", "Reset"), "common.save": ("Enregistrer", "שמירה", "Save"), "common.saving": ("Enregistrement…", "שומר…", "Saving…"),
"roles.owner": ("Propriétaire", "בעלים", "Owner"), "roles.admin": ("Administrateur", "מנהל", "Admin"), "roles.agent": ("Agent", "סוכן", "Agent"), "roles.assistant": ("Assistant(e)", "עוזר/ת", "Assistant"), "roles.viewer": ("Lecture seule", "קריאה בלבד", "Read-only"),
# ── today
"today.hello": ("Bonjour {name}", "בוקר טוב, {name}", "Good morning, {name}"),
"today.kpi.activeProps": ("Biens actifs", "נכסים פעילים", "Active properties"), "today.kpi.contacts": ("Clients", "לקוחות", "Clients"),
"today.kpi.openDeals": ("Affaires ouvertes", "עסקאות פתוחות", "Open deals"), "today.kpi.weighted": ("Valeur pondérée", "ערך משוקלל", "Weighted value"),
"today.tasks.done": ("Marquer comme faite", "סימון כבוצע", "Mark as done"), "today.tasks.overdue": ("En retard", "באיחור", "Overdue"),
"today.matches.title": ("Nouveaux biens avec clients intéressés", "נכסים חדשים עם לקוחות מתאימים", "New properties with matching clients"),
"today.matches.empty": ("Aucun nouveau bien ne correspond à un client pour l'instant.", "אין כרגע נכסים חדשים שמתאימים ללקוחות.", "No new property matches a client yet."),
"today.matches.clients": ("{count, plural, one {# client} other {# clients}}", "{count, plural, one {לקוח #} two {# לקוחות} other {# לקוחות}}", "{count, plural, one {# client} other {# clients}}"),
# ── send
"send.matchingClients": ("Clients correspondants", "לקוחות מתאימים", "Matching clients"), "send.matchingProperties": ("Biens correspondants", "נכסים מתאימים", "Matching properties"),
"send.noClients": ("Aucun client ne correspond à ce bien pour l'instant.", "אין כרגע לקוחות שמתאימים לנכס זה.", "No client matches this property yet."),
"send.noProperties": ("Aucun bien disponible ne correspond (ou tous ont déjà été envoyés).", "אין נכסים זמינים שמתאימים (או שכולם כבר נשלחו).", "No matching property available (or all were already sent)."),
"send.onlyActive": ("Seuls les biens actifs peuvent être envoyés.", "ניתן לשלוח רק נכסים פעילים.", "Only active properties can be sent."),
"send.email": ("E-mail", "אימייל", "Email"), "send.messagePlaceholder": ("Message personnel (optionnel)", "הודעה אישית (אופציונלי)", "Personal message (optional)"),
"send.send": ("Envoyer la sélection", "שליחת הבחירה", "Send selection"), "send.sending": ("Envoi…", "שולח…", "Sending…"), "send.openWhatsapp": ("Ouvrir WhatsApp", "פתיחת WhatsApp", "Open WhatsApp"),
"send.dryRunNote": ("Mode test : aucun e-mail réel n'est parti (clé d'envoi non configurée). L'envoi est journalisé.", "מצב בדיקה: לא נשלח אימייל אמיתי (מפתח שליחה לא הוגדר). השליחה נרשמה ביומן.", "Test mode: no real email was sent (sending key not configured). The send is logged."),
"send.result.sent": ("Envoyé", "נשלח", "Sent"), "send.result.dry_run": ("Test (non envoyé)", "בדיקה (לא נשלח)", "Test (not sent)"), "send.result.failed": ("Échec", "נכשל", "Failed"),
"send.result.blocked_consent": ("Bloqué : pas de consentement", "נחסם: אין הסכמה", "Blocked: no consent"), "send.result.blocked_no_contact_info": ("Coordonnée manquante", "פרט קשר חסר", "Missing contact detail"), "send.result.link": ("Lien prêt", "קישור מוכן", "Link ready"),
"send.errors.forbidden": ("Vous n'avez pas le droit d'envoyer.", "אין לך הרשאה לשלוח.", "You are not allowed to send."), "send.errors.nothing_selected": ("Sélectionnez au moins un destinataire.", "בחרו לפחות נמען אחד.", "Select at least one recipient."),
# ── form errors
"form.errors.invalid_number": ("Nombre invalide.", "מספר לא תקין.", "Invalid number."), "form.errors.half_rooms": ("Utilisez des demi-pièces (3, 3,5, 4…).", "השתמשו בחצאי חדרים (3, 3.5, 4…).", "Use half rooms (3, 3.5, 4…)."),
"form.errors.invalid_date": ("Date invalide.", "תאריך לא תקין.", "Invalid date."), "form.errors.active_needs_price_city": ("Un bien actif doit avoir un prix et une ville.", "נכס פעיל חייב מחיר ועיר.", "An active property needs a price and a city."),
"form.errors.name_required": ("Saisissez au moins un nom.", "יש להזין לפחות שם אחד.", "Enter at least one name."), "form.errors.invalid_phone": ("Numéro de téléphone invalide.", "מספר טלפון לא תקין.", "Invalid phone number."),
"form.errors.invalid_email": ("Adresse e-mail invalide.", "כתובת אימייל לא תקינה.", "Invalid email address."), "form.errors.rooms_range": ("Le minimum dépasse le maximum.", "המינימום גדול מהמקסימום.", "Minimum exceeds maximum."),
"form.errors.duplicate_phone": ("Ce numéro existe déjà dans votre agence.", "המספר הזה כבר קיים בסוכנות שלכם.", "This number already exists in your agency."), "form.errors.forbidden": ("Action non autorisée.", "פעולה לא מורשית.", "Action not allowed."),
# ── deals
"deals.title": ("Affaires", "עסקאות", "Deals"), "deals.sub": ("{count} affaires ouvertes · valeur pondérée {weighted}", "{count} עסקאות פתוחות · ערך משוקלל {weighted}", "{count} open deals · weighted value {weighted}"),
"deals.moveFailed": ("Impossible de déplacer l'affaire (droits insuffisants).", "לא ניתן להעביר את העסקה (אין הרשאה).", "Could not move the deal (insufficient rights)."), "deals.moveTo": ("Déplacer vers…", "העברה אל…", "Move to…"),
"deals.noProperty": ("Aucun bien lié", "אין נכס מקושר", "No linked property"), "deals.wonLine": ("Conclu : {count} affaires · {value}", "נסגרו: {count} עסקאות · {value}", "Won: {count} deals · {value}"),
# ── public
"public.title": ("Votre sélection de biens", "בחירת הנכסים שלך", "Your property selection"), "public.subtitle": ("Sélectionnés pour vous par {agent}.", "נבחרו עבורך על ידי {agent}.", "Selected for you by {agent}."),
"public.contact": ("Une question ? Contactez {agent}", "שאלה? צרו קשר עם {agent}", "A question? Contact {agent}"), "public.call": ("Appeler", "חיוג", "Call"),
"public.legal": ("Les informations sont données à titre indicatif et sous réserve de disponibilité. Les prix peuvent évoluer.", "המידע מובא להמחשה ובכפוף לזמינות. המחירים עשויים להשתנות.", "Information is indicative and subject to availability. Prices may change."),
"public.unsubscribeTitle": ("Ne plus recevoir nos sélections ?", "להפסיק לקבל מאיתנו בחירות נכסים?", "Stop receiving our selections?"), "public.unsubscribeConfirm": ("Confirmer la désinscription", "אישור הסרה", "Confirm unsubscribe"),
"public.unsubscribed": ("Vous êtes désinscrit(e).", "הוסרת מהרשימה.", "You have been unsubscribed."), "public.unsubscribedSub": ("Vous ne recevrez plus nos sélections par e-mail.", "לא תקבלו עוד בחירות נכסים באימייל.", "You will no longer receive our selections by email."),
"public.unsubscribeInvalid": ("Lien invalide ou expiré.", "קישור לא תקין או שפג תוקפו.", "Invalid or expired link."),
}
def add(prefix, rows):
    for k, v in rows.items(): T[f"{prefix}.{k}"] = v
add("props.types", {"apartment": ("Appartement", "דירה", "Apartment"), "garden_apt": ("Appartement jardin", "דירת גן", "Garden apartment"), "duplex": ("Duplex", "דופלקס", "Duplex"), "penthouse": ("Penthouse", "פנטהאוז", "Penthouse"), "house": ("Maison", "בית פרטי", "House"), "cottage": ("Cottage", "קוטג׳", "Cottage"), "land": ("Terrain", "קרקע", "Land"), "office": ("Bureau", "משרד", "Office"), "shop": ("Commerce", "חנות", "Shop")})
add("props.has", {"mamad": ("Mamad", "ממ״ד", "Safe room (mamad)"), "parking": ("Parking", "חניה", "Parking"), "elevator": ("Ascenseur", "מעלית", "Elevator"), "sukkah_balcony": ("Balcon soukka", "מרפסת סוכה", "Sukkah balcony"), "storage": ("Cave / machsan", "מחסן", "Storage"), "ac": ("Climatisation", "מיזוג", "Air conditioning")})
add("props.status", {"draft": ("Brouillon", "טיוטה", "Draft"), "active": ("Actif", "פעיל", "Active"), "under_offer": ("Sous offre", "בהצעה", "Under offer"), "sold": ("Vendu", "נמכר", "Sold"), "rented": ("Loué", "הושכר", "Rented"), "withdrawn": ("Retiré", "הוסר", "Withdrawn"), "expired": ("Expiré", "פג תוקף", "Expired")})
add("props.tx", {"sale": ("Vente", "מכירה", "Sale"), "rent": ("Location", "השכרה", "Rent")})
add("props.mandate", {"exclusive": ("Exclusif", "בלעדיות", "Exclusive"), "non_exclusive": ("Non exclusif", "ללא בלעדיות", "Non-exclusive"), "expiring": ("Expire sous 30 jours", "פוקעת תוך 30 יום", "Expiring within 30 days"), "expired": ("Expiré", "פגה", "Expired"), "expiresIn": ("Expire dans {days} j", "פוקעת בעוד {days} ימים", "Expires in {days} d")})
add("props.sort", {"recent": ("Plus récents", "החדשים ביותר", "Newest"), "price_asc": ("Prix croissant", "מחיר עולה", "Price ascending"), "price_desc": ("Prix décroissant", "מחיר יורד", "Price descending"), "mandate": ("Fin de mandat", "סיום בלעדיות", "Mandate end")})
add("props.relation", {"owner": ("Propriétaire", "בעלים", "Owner"), "tenant": ("Locataire", "שוכר", "Tenant"), "other": ("Contact lié", "איש קשר מקושר", "Linked contact")})
add("props.form.vis", {"hidden": ("Masquée", "מוסתרת", "Hidden"), "neighborhood": ("Quartier seulement", "שכונה בלבד", "Neighborhood only"), "street": ("Rue sans numéro", "רחוב ללא מספר", "Street without number"), "exact": ("Adresse exacte", "כתובת מדויקת", "Exact address")})
add("props.form.reg", {"tabu": ("Tabou", "טאבו", "Tabu"), "minhal": ("Minhal", "מינהל", "Minhal"), "company": ("Société de gestion", "חברה משכנת", "Management company"), "other": ("Autre", "אחר", "Other")})
add("props", {
 "title": ("Biens", "נכסים", "Properties"), "count": ("{count, plural, one {# bien} other {# biens}}", "{count, plural, one {נכס #} two {# נכסים} other {# נכסים}}", "{count, plural, one {# property} other {# properties}}"),
 "new": ("Nouveau bien", "נכס חדש", "New property"), "newTitle": ("Nouveau bien", "נכס חדש", "New property"), "editTitle": ("Modifier le bien", "עריכת נכס", "Edit property"),
 "empty": ("Aucun bien ne correspond à ces filtres.", "אין נכסים שמתאימים למסננים אלה.", "No property matches these filters."),
 "property": ("Bien", "נכס", "Property"), "city": ("Ville", "עיר", "City"), "rooms": ("Pièces", "חדרים", "Rooms"), "area": ("Surface", "שטח", "Area"), "sqm": ("m²", "מ״ר", "sqm"), "floor": ("Étage", "קומה", "Floor"), "price": ("Prix", "מחיר", "Price"),
 "perMonth": ("/ mois", "/ חודש", "/ month"), "statusLabel": ("Statut", "סטטוס", "Status"), "mandateLabel": ("Mandat", "מנדט", "Mandate"), "agent": ("Agent", "סוכן", "Agent"),
 "details": ("Caractéristiques", "מאפיינים", "Details"), "askingPrice": ("Prix demandé", "מחיר מבוקש", "Asking price"), "visits": ("Visites", "ביקורים", "Viewings"), "archive": ("Archiver le bien", "העברת הנכס לארכיון", "Archive property"),
 "noDescription": ("Aucune description. Ajoutez-en une dans la fiche.", "אין תיאור. אפשר להוסיף בעריכה.", "No description. Add one by editing."), "aiNotReviewed": ("Traduit par IA · à relire", "תורגם ע״י AI · לבדיקה", "AI translated · needs review"),
 "photosPlaceholder": ("Les photos seront téléversées dans une prochaine étape ; aperçu illustratif.", "העלאת תמונות תתווסף בשלב הבא; התצוגה להמחשה בלבד.", "Photo upload comes in a later step; illustrative preview."),
 "match.overBudget": ("+{pct} % au-dessus du budget", "{pct}% מעל התקציב", "{pct}% over budget"),
 "filters.q": ("Rechercher (rue, réf., ville…)", "חיפוש (רחוב, מס׳, עיר…)", "Search (street, ref, city…)"), "filters.transaction": ("Transaction", "עסקה", "Transaction"), "filters.allTx": ("Vente et location", "מכירה והשכרה", "Sale and rent"),
 "filters.cities": ("Villes", "ערים", "Cities"), "filters.min": ("Min", "מינ׳", "Min"), "filters.max": ("Max", "מקס׳", "Max"), "filters.features": ("Équipements", "מאפיינים", "Features"), "filters.more": ("Plus", "עוד", "More"),
 "filters.statusLabel": ("Statut", "סטטוס", "Status"), "filters.agent": ("Agent", "סוכן", "Agent"), "filters.mandate": ("Mandat", "מנדט", "Mandate"), "filters.sort": ("Tri", "מיון", "Sort"),
 "form.basics": ("Informations générales", "פרטים כלליים", "General information"), "form.type": ("Type de bien", "סוג נכס", "Property type"), "form.street": ("Rue", "רחוב", "Street"), "form.houseNumber": ("Numéro", "מספר", "Number"),
 "form.addressVisibility": ("Adresse visible sur les supports", "כתובת גלויה בחומרים שיווקיים", "Address shown publicly"), "form.addressVisibilityHint": ("Contrôle ce que voient les clients (e-mails, page publique).", "קובע מה הלקוחות רואים (אימיילים, עמוד ציבורי).", "Controls what clients see (emails, public page)."),
 "form.figures": ("Chiffres", "נתונים", "Figures"), "form.currency": ("Devise", "מטבע", "Currency"), "form.floorsTotal": ("Étages (total)", "סה״כ קומות", "Total floors"), "form.arnona": ("Arnona / mois", "ארנונה לחודש", "Arnona / month"), "form.vaad": ("Va'ad bayit / mois", "ועד בית לחודש", "Building fee / month"),
 "form.registration": ("Enregistrement", "רישום", "Registration"), "form.features": ("Équipements", "מאפיינים", "Features"), "form.mandate": ("Mandat", "מנדט", "Mandate"), "form.mandateEnd": ("Fin du mandat", "סיום המנדט", "Mandate end"),
 "form.internalNotes": ("Notes internes", "הערות פנימיות", "Internal notes"), "form.description": ("Description", "תיאור", "Description"), "form.title": ("Titre", "כותרת", "Title"), "form.descriptionPlaceholder": ("Description (optionnelle)", "תיאור (אופציונלי)", "Description (optional)"),
})
add("clients.kind", {"buyer": ("Acheteur", "קונה", "Buyer"), "seller": ("Vendeur", "מוכר", "Seller"), "landlord": ("Bailleur", "משכיר", "Landlord"), "tenant": ("Locataire", "שוכר", "Tenant"), "investor": ("Investisseur", "משקיע", "Investor"), "lawyer": ("Avocat", "עורך דין", "Lawyer"), "partner": ("Partenaire", "שותף", "Partner"), "other": ("Autre", "אחר", "Other")})
add("clients.aliyah", {"pre_aliyah": ("Pré-alyah", "טרום עלייה", "Pre-aliyah"), "recent": ("Olé récent(e)", "עולה חדש/ה", "Recent oleh"), "resident": ("Résident(e)", "תושב/ת", "Resident"), "none": ("—", "—", "—")})
add("clients.activity", {"created": ("Fiche créée", "הכרטיס נוצר", "Record created"), "unsubscribed": ("Désinscrit des envois", "הוסר מרשימת התפוצה", "Unsubscribed from mailings"), "share": ("Sélection envoyée ({channel})", "נשלחה בחירת נכסים ({channel})", "Selection sent ({channel})"), "stage_change": ("Affaire déplacée d'étape", "העסקה עברה שלב", "Deal moved to another stage")})
add("clients", {
 "title": ("Clients", "לקוחות", "Clients"), "count": ("{count, plural, one {# client} other {# clients}}", "{count, plural, one {לקוח #} two {# לקוחות} other {# לקוחות}}", "{count, plural, one {# client} other {# clients}}"),
 "new": ("Nouveau client", "לקוח חדש", "New client"), "newTitle": ("Nouveau client", "לקוח חדש", "New client"), "editTitle": ("Modifier le client", "עריכת לקוח", "Edit client"),
 "empty": ("Aucun client ne correspond.", "אין לקוחות שמתאימים.", "No client matches."), "name": ("Nom", "שם", "Name"), "phone": ("Téléphone", "טלפון", "Phone"), "typeLabel": ("Type", "סוג", "Type"), "budget": ("Budget", "תקציב", "Budget"),
 "lang": ("Langue", "שפה", "Language"), "lastActivity": ("Dernière activité", "פעילות אחרונה", "Last activity"), "agent": ("Agent", "סוכן", "Agent"), "searching": ("En recherche", "בחיפוש", "Searching"),
 "filters.q": ("Nom, téléphone, e-mail…", "שם, טלפון, אימייל…", "Name, phone, email…"), "filters.kind": ("Type", "סוג", "Type"), "filters.allKinds": ("Tous les types", "כל הסוגים", "All types"), "filters.owner": ("Agent", "סוכן", "Agent"), "filters.allAgents": ("Tous les agents", "כל הסוכנים", "All agents"),
 "call": ("Appeler", "חיוג", "Call"), "optIn": ("Opt-in marketing", "הסכמה לדיוור", "Marketing opt-in"), "noConsent": ("Sans consentement marketing", "ללא הסכמה לדיוור", "No marketing consent"),
 "criteria": ("Critères de recherche", "קריטריוני חיפוש", "Search criteria"), "noCriteria": ("Aucun critère enregistré : le matching est désactivé pour ce client.", "לא הוגדרו קריטריונים: ההתאמה מושבתת ללקוח זה.", "No criteria saved: matching is off for this client."),
 "shares": ("Envois", "שליחות", "Sent selections"), "noShares": ("Aucun envoi pour l'instant.", "עדיין לא נשלח דבר.", "Nothing sent yet."), "sharesLine": ("{n} bien(s) · {channel}", "{n} נכסים · {channel}", "{n} property(ies) · {channel}"), "opened": ("Ouvert", "נפתח", "Opened"),
 "details": ("Coordonnées", "פרטי קשר", "Contact details"), "tasks": ("Tâches", "משימות", "Tasks"), "newTask": ("Nouvelle tâche…", "משימה חדשה…", "New task…"), "due": ("Échéance", "מועד", "Due date"), "toggleTask": ("Terminer la tâche", "סימון משימה", "Complete task"),
 "activityTitle": ("Activité", "פעילות", "Activity"), "addNote": ("Ajouter une note…", "הוספת הערה…", "Add a note…"), "addNoteBtn": ("Ajouter la note", "הוספת הערה", "Add note"),
 "deals": ("Affaires", "עסקאות", "Deals"), "dealValue": ("Valeur (₪)", "שווי (₪)", "Value (₪)"), "openDeal": ("Ouvrir une affaire", "פתיחת עסקה", "Open a deal"), "openExisting": ("Ouvrir la fiche existante", "פתיחת הכרטיס הקיים", "Open the existing record"),
 "form.identity": ("Identité", "זהות", "Identity"), "form.firstName": ("Prénom", "שם פרטי", "First name"), "form.lastName": ("Nom", "שם משפחה", "Last name"), "form.firstNameHe": ("Prénom (hébreu)", "שם פרטי (עברית)", "First name (Hebrew)"), "form.lastNameHe": ("Nom (hébreu)", "שם משפחה (עברית)", "Last name (Hebrew)"),
 "form.phoneHint": ("Format libre : 050-123-4567, +33 6 12 34 56 78…", "פורמט חופשי: 050-123-4567, ‎+33 6 12 34 56 78…", "Any format: 050-123-4567, +33 6 12 34 56 78…"), "form.language": ("Langue préférée", "שפה מועדפת", "Preferred language"), "form.aliyah": ("Statut alyah", "סטטוס עלייה", "Aliyah status"),
 "form.source": ("Source", "מקור", "Source"), "form.kinds": ("Type de contact", "סוג איש קשר", "Contact type"), "form.searchProfile": ("Ce client cherche un bien", "הלקוח מחפש נכס", "This client is looking for a property"),
 "form.budgetMax": ("Budget maximum (₪)", "תקציב מקסימלי (₪)", "Maximum budget (₪)"), "form.roomsMin": ("Pièces min", "חדרים מינ׳", "Min rooms"), "form.roomsMax": ("Pièces max", "חדרים מקס׳", "Max rooms"), "form.mustHave": ("Indispensable", "חובה", "Must have"),
 "form.notes": ("Notes", "הערות", "Notes"), "form.optIn": ("Le client a accepté de recevoir des sélections de biens (e-mail)", "הלקוח הסכים לקבל בחירות נכסים (אימייל)", "The client agreed to receive property selections (email)"),
 "form.optInHint": ("Sans consentement, l'envoi par e-mail est bloqué. Il est enregistré avec la date.", "ללא הסכמה, שליחה באימייל חסומה. ההסכמה נשמרת עם תאריך.", "Without consent, email sending is blocked. Consent is stored with the date."),
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
