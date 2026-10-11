# Code-Format PT17

Stand: 11.10.2026 · Karten v1.7 · Bereich 2 besitzt diese Datei. Ein Tipp pro Karte, keine Stufen, kein „kann ich nicht beurteilen“. Gedankenexperimente haben jetzt auch einen Tipp über die andere Person.

Ein Code pro Paarung: Er enthält den Teil über sich und den Teil über genau eine andere Person. Wer mit mehreren spielt, hat mehrere Codes mit demselben Teil über sich. Ein Code entsteht erst, wenn beide Teile fertig sind. Codes verschiedener Präfixe werden nie gemischt. Die Auswertung erkennt ältere Codes (PT13 bis PT16) und weist freundlich darauf hin.

## Aufbau

```
PT17 . <Header> . <Nutzdaten>
```

| Teil | Inhalt |
|---|---|
| `PT17` | Versionspräfix |
| Header | JSON, UTF-8, Base64url ohne Padding |
| Nutzdaten | 168 Bit, 21 Byte, Base64url ohne Padding (28 Zeichen) |

Base64url: `+` wird `-`, `/` wird `_`, `=` am Ende entfällt. Namen stehen nur kodiert, nicht verschlüsselt. Ein Code ist rund 60 bis 65 Zeichen lang.

## Header

```json
{"n":"Anna","p":"Ben"}
```

| Feld | Bedeutung |
|---|---|
| `n` | Name der Person, die den Code erzeugt hat |
| `p` | Name der anderen Person, wie `n` ihn eingetippt hat |

Unverändert seit PT15. Das gewählte Pronomen (er/sie) steht nicht im Code. Die Auswertung prüft über Kreuz: `n` des einen Codes gleich `p` des anderen, tolerant gegenüber Leerzeichen sowie Groß- und Kleinschreibung.

## Nutzdaten

Bits in Reihenfolge, höchstwertiges Bit zuerst (MSB first), in 8er-Gruppen zu Bytes gepackt.

| Bit | Inhalt |
|---|---|
| 0–27 | Teil über sich: 28 Antworten, je 1 Bit |
| 28–55 | Teil über die andere Person: 28 Tipps, je 1 Bit |
| 56–111 | Zeitklassen Teil über sich: 28 × 2 Bit |
| 112–167 | Zeitklassen Teil über die andere Person: 28 × 2 Bit |

Keine Füllbits: 168 Bit sind genau 21 Byte.

**Antwort und Tipp, 1 Bit:** `0` = A, `1` = B. A und B wie in fragen.json (`a` und `z`). Die zufällige Reihenfolge der Antwortkarten auf dem Bildschirm hat keinen Einfluss.

**Zeitklasse, 2 Bit:** Bearbeitungszeit pro Karte, über Vor- und Zurückblättern aufaddiert. Einstiegsbildschirme zählen nicht.

| Klasse | Zeit |
|---|---|
| 0 | unter 2 s |
| 1 | 2 bis unter 5 s |
| 2 | 5 bis unter 15 s |
| 3 | ab 15 s |

## Kartenreihenfolge

Index = Position in `karten` in fragen.json, also die Spielreihenfolge. Alltagskarten und Gedankenexperimente stehen gemischt. Die Blöcke (6 Karten, 4 Gedanken, 5 Karten, 4 Gedanken, 6 Karten, 3 Gedanken) stehen in `bloecke` und gliedern Fortschrittsbalken, Nachtmodus und Einstiege. Ob eine Karte ein Gedankenexperiment ist, steht in `typ`.

| Index | Karte |
|---|---|
| 0–5 | Allein, Geld übrig, Spülmaschine, Geschenk, Urlaub, Trauriger Film |
| 6–9 | Hundert Tage, Lügen, Noch einmal, Danach |
| 10–14 | Bauch oder Kopf, Neue Wohnung, Warten, Geschafft, Kritik |
| 15–18 | Der Traum, Löschen, Die Pille, Eins von beiden |
| 19–24 | Ungeklärt, Nach der Beerdigung, Umarmung, Diagnose, Was berührt, Zwischen uns |
| 25–27 | Was alle denken, Grabstein, Verstehen |

## Grenzen

- „Unbeantwortet“ ist nicht von A unterscheidbar. Die App lässt keinen Code ohne alle Antworten entstehen.
- Die Länge der Nutzdaten ist fest. Ein Code mit anderer Länge ist ungültig.
