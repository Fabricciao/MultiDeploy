# Fusionne des clés (fr, he, en) dans messages/*.json — garantit la parité des 3 langues.
import json, sys
T = {"media.errors.quota": ("quota de stockage du plan atteint", "מכסת האחסון של התוכנית מוצתה", "plan storage quota reached")}
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
