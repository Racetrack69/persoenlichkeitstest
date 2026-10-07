#!/usr/bin/env python3
"""Setzt die Karten aus fragen.json in index.html und auswertung.html ein (zwischen DATEN-ANFANG und DATEN-ENDE).
Aufruf im Projektordner: python3 build.py"""
import json, re, sys
d = json.load(open("fragen.json", encoding="utf-8"))
FELDER = ["t", "qs", "qo", "a", "z", "ka", "kz", "ao", "zo", "g"]
items = [{k: x[k] for k in FELDER} for x in d["items"]]
ged = [{k: g[k] for k in ("t", "q", "a", "z", "g")} for g in d["gedanken"]]
assert sum(d["runden"]) == len(items), "runden passt nicht zur Zahl der Karten"
# Kurzformen für die Sprech- und Denkblasen der Auswertung: kurz, ohne Ich, ohne Pronomen.
# Sie stehen in Bens Denkblase über Anna, ein Ich oder ein er/sie wäre dort missverständlich.
for x in items:
    for k in ("ka", "kz"):
        v = x[k]
        assert v.strip() and len(v) <= 24, ("Kurzform leer oder zu lang (max. 24 Zeichen)", x["t"], k, v)
        assert not re.search(r"\b(ich|mich|mir|mein(e|er|em|en|es)?|du|dich|dir|dein(e|er|em|en|es)?|er|sie|ihn|ihm|ihr(e|er|em|en|es)?|sein(e|er|em|en|es))\b", v, re.I), ("Kurzform mit Ich oder Pronomen", x["t"], k, v)
        assert "{" not in v and not v.endswith("."), ("Kurzform ohne Platzhalter und ohne Schlusspunkt", x["t"], k, v)
for x in items + ged:
    for k, v in x.items():
        assert "—" not in v and "–" not in v, ("Gedankenstrich", v)
        bad = set(re.findall(r"\{([^}]*)\}", v)) - {"n", "Er", "er", "ihn", "ihm", "sein"}
        assert not bad, ("unbekannter Platzhalter", bad, v)
def js(arr):
    return "[\n" + ",\n".join(" " + json.dumps(x, ensure_ascii=False) for x in arr) + "\n]"
block = ("/* DATEN-ANFANG */\nvar RUNDEN=" + json.dumps(d["runden"]) + ";\nvar ITEMS=" + js(items) +
         ";\nvar GEDANKEN=" + js(ged) + ";\n/* DATEN-ENDE */")
for fn in ("index.html", "auswertung.html"):
    s = open(fn, encoding="utf-8").read()
    s2, n = re.subn(r"/\* DATEN-ANFANG \*/.*?/\* DATEN-ENDE \*/", lambda m: block, s, flags=re.S)
    if n != 1:
        sys.exit(fn + ": Marker nicht gefunden")
    open(fn, "w", encoding="utf-8").write(s2)
print("Karten eingesetzt:", len(items), "Karten,", len(ged), "Gedankenexperimente")
