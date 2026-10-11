#!/usr/bin/env python3
"""Setzt die Karten aus fragen.json in index.html und auswertung.html ein (zwischen DATEN-ANFANG und DATEN-ENDE).
Aufruf im Projektordner: python3 build.py
Prüft vorher die Karten und bricht bei Fehlern ab, ohne etwas zu schreiben."""
import json, re, sys

d = json.load(open("fragen.json", encoding="utf-8"))
karten, bloecke = d["karten"], d["bloecke"]
PFLICHT = ["key", "t", "typ", "qs", "qo", "a", "z", "ao", "zo", "ka", "kz"]
PLATZHALTER = {"n", "Er", "er", "ihn", "ihm", "sein", "Sein"}
# Kurzformen stehen in Bens Denkblase über Anna, ein Ich oder ein er/sie wäre dort missverständlich.
PRONOMEN = re.compile(r"\b(ich|mich|mir|mein(e|er|em|en|es)?|du|dich|dir|dein(e|er|em|en|es)?|er|sie|ihn|ihm|ihr(e|er|em|en|es)?|sein(e|er|em|en|es)?|sich|wir|uns)\b", re.I)

fehler = []
def f(*x): fehler.append(" ".join(str(y) for y in x))

if sum(b["n"] for b in bloecke) != len(karten):
    f("Blöcke ergeben", sum(b["n"] for b in bloecke), "Karten, fragen.json hat", len(karten))
i = 0
for b in bloecke:
    if b["typ"] not in ("karte", "gedanke"):
        f("Unbekannter Blocktyp", b["typ"])
    for k in karten[i:i + b["n"]]:
        if k.get("typ") != b["typ"]:
            f(k.get("key"), "steht in einem Block vom Typ", b["typ"], "ist aber", k.get("typ"))
    i += b["n"]
keys = set()
for k in karten:
    name = k.get("key", "?")
    for feld in PFLICHT:
        if not str(k.get(feld, "")).strip():
            f(name, "Feld fehlt:", feld)
    if name in keys:
        f(name, "key doppelt")
    keys.add(name)
    for feld, v in k.items():
        if isinstance(v, str) and ("—" in v or "–" in v):
            f(name, "Gedankenstrich in", feld)
        bad = set(re.findall(r"\{([^}]*)\}", str(v))) - PLATZHALTER
        if bad:
            f(name, "unbekannter Platzhalter", bad, "in", feld)
    for feld in ("qs", "a", "z", "g"):
        if "{" in k.get(feld, ""):
            f(name, feld, "ist die Fassung für dich und darf keine Platzhalter haben")
    for feld in ("ka", "kz"):
        v = k.get(feld, "")
        if not v.strip() or len(v) > 24:
            f(name, "Kurzform leer oder zu lang (max. 24 Zeichen):", feld, v)
        if PRONOMEN.search(v):
            f(name, "Kurzform mit Ich oder Pronomen:", feld, v)
        if "{" in v or v.endswith("."):
            f(name, "Kurzform ohne Platzhalter und ohne Schlusspunkt:", feld, v)
    if k.get("ka") == k.get("kz"):
        f(name, "Kurzformen A und B gleich")
if fehler:
    print("fragen.json hat Fehler, nichts geschrieben:")
    for x in fehler:
        print("  -", x)
    sys.exit(1)

FELDER = ["t", "qs", "qo", "a", "z", "ao", "zo", "ka", "kz"]
def zeile(k):
    o = {feld: k[feld] for feld in FELDER}
    o["gd"] = 1 if k["typ"] == "gedanke" else 0
    o["g"] = k.get("g", "")
    return " " + json.dumps(o, ensure_ascii=False)
block = ("/* DATEN-ANFANG */\nvar BLOECKE=" + json.dumps(bloecke, ensure_ascii=False) + ";\nvar KARTEN=[\n" +
         ",\n".join(zeile(k) for k in karten) + "\n];\n/* DATEN-ENDE */")
for fn in ("index.html", "auswertung.html"):
    s = open(fn, encoding="utf-8").read()
    s2, n = re.subn(r"/\* DATEN-ANFANG \*/.*?/\* DATEN-ENDE \*/", lambda m: block, s, flags=re.S)
    if n != 1:
        sys.exit(fn + ": Marker nicht gefunden")
    open(fn, "w", encoding="utf-8").write(s2)
ng = sum(1 for k in karten if k["typ"] == "gedanke")
print("Karten eingesetzt:", len(karten) - ng, "Karten,", ng, "Gedankenexperimente,", len(bloecke), "Blöcke")
