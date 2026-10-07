# Code-Format PT16

Stand: 07.10.2026 · Karten v1.6 · Bereich 2 besitzt diese Datei. Aufbau wie PT15, aber mit vier Stufen pro Antwort.

Ein Code pro Paarung: Er enthält den Teil über sich und den Teil über genau eine andere Person. Wer mit mehreren spielt, hat mehrere Codes mit demselben Teil über sich. Ein Code entsteht erst, wenn beide Teile fertig sind. Codes verschiedener Präfixe werden nie gemischt. Die Auswertung erkennt ältere Codes (PT13 bis PT15) und weist freundlich darauf hin.

## Aufbau

```
PT16 . <Header> . <Nutzdaten>
```

| Teil | Inhalt |
|---|---|
| `PT16` | Versionspräfix |
| Header | JSON, UTF-8, Base64url ohne Padding |
| Nutzdaten | 234 Bit plus 6 Füllbits, 30 Byte, Base64url ohne Padding (40 Zeichen) |

Base64url: `+` wird `-`, `/` wird `_`, `=` am Ende entfällt. Namen stehen nur kodiert, nicht verschlüsselt. Ein Code ist rund 75 bis 80 Zeichen lang.

## Header

```json
{"n":"Anna","p":"Ben"}
```

| Feld | Bedeutung |
|---|---|
| `n` | Name der Person, die den Code erzeugt hat |
| `p` | Name der anderen Person, wie `n` ihn eingetippt hat |

Das gewählte Pronomen (er/sie) steht nicht im Code. Die Namen sind der Schlüssel der Sammlung. Der Einladungslink `index.html?mit=Name` füllt den Namen beim anderen vor. Die Auswertung prüft über Kreuz: `n` des einen Codes gleich `p` des anderen, tolerant gegenüber Leerzeichen sowie Groß- und Kleinschreibung.

## Nutzdaten

Bits in Reihenfolge, höchstwertiges Bit zuerst (MSB first), in 8er-Gruppen zu Bytes gepackt.

| Bit | Inhalt |
|---|---|
| 0–47 | Teil über sich: 24 Antworten, je 2 Bit (Stufe) |
| 48–53 | Gedankenexperimente G1–G6, je 1 Bit |
| 54–125 | Teil über die andere Person: 24 Antworten, je 3 Bit |
| 126–185 | Zeitklassen Teil über sich: 30 × 2 Bit, erst 24 Karten, dann 6 Gedanken |
| 186–233 | Zeitklassen Teil über die andere Person: 24 × 2 Bit |
| 234–239 | Füllbits (0) |

**Stufe, 2 Bit:** `0` ganz klar A, `1` eher A, `2` eher B, `3` ganz klar B. A und B wie in fragen.json (`a` und `z`). Die Seite ist `0` für A (Stufe 0 und 1) und `1` für B (Stufe 2 und 3). Die zufällige Reihenfolge der Karten auf dem Bildschirm hat keinen Einfluss.

**Antwort über die andere Person, 3 Bit:** `0` bis `3` wie die Stufe, `4` kann ich nicht beurteilen. `5` bis `7` sind ungültig.

**Gedankenexperiment, 1 Bit:** `0` = A, `1` = B. Hier gibt es keine Stufen.

**Zeitklasse, 2 Bit:** Bearbeitungszeit pro Karte, über Vor- und Zurückblättern aufaddiert. Einstiegsbildschirme zählen nicht.

| Klasse | Zeit |
|---|---|
| 0 | unter 2 s |
| 1 | 2 bis unter 5 s |
| 2 | 5 bis unter 15 s |
| 3 | ab 15 s |

## Kartenreihenfolge

Index = Kartennummer minus 1, Reihenfolge wie in fragen.json. Die vier Runden (0–5, 6–11, 12–17, 18–23) gliedern nur den Fortschrittsbalken und haben keine inhaltliche Bedeutung.

## Grenzen

- Das Limit von 4 Mal „kann ich nicht beurteilen“ setzt nur die Oberfläche durch. Der Decoder warnt bei mehr.
- Im Teil über sich ist „unbeantwortet“ nicht von „ganz klar A“ unterscheidbar. Die App lässt keinen Code ohne alle Antworten entstehen.
