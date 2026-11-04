# Fusionne des clés (fr, he, en) dans messages/*.json — garantit la parité des 3 langues.
import json, sys
T = {
 "clients.privacy.title": ("Données personnelles", "נתונים אישיים", "Personal data"), "clients.privacy.export": ("Exporter les données (JSON)", "ייצוא נתונים (JSON)", "Export data (JSON)"),
 "clients.privacy.confirm": ("Je confirme l'effacement définitif des données personnelles de ce client", "אני מאשר/ת מחיקה סופית של הנתונים האישיים של לקוח זה", "I confirm permanent erasure of this client's personal data"), "clients.privacy.erase": ("Effacer les données personnelles", "מחיקת הנתונים האישיים", "Erase personal data"),
 "clients.privacy.hint": ("Droit d'accès et d'effacement : l'effacement est irréversible ; l'historique commercial est conservé sans donnée personnelle.", "זכות עיון ומחיקה: המחיקה בלתי הפיכה; ההיסטוריה המסחרית נשמרת ללא נתונים אישיים.", "Right of access and erasure: erasure is irreversible; commercial history is kept without personal data."),
}
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
