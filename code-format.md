# Code-Format PT15

Stand: 06.10.2026 · Itemliste v1.5 · Bereich 2 besitzt diese Datei. Aufbau wie PT14, nur mit 24 Fragen und 6 Gedankenexperimenten.

Ein Code pro Person. Er entsteht erst, wenn beide Teile fertig sind: der Teil über sich selbst und der Teil über die andere Person. Codes verschiedener Präfixe werden nie gemischt.

## Aufbau

```
PT15 . <Header> . <Nutzdaten>
```

| Teil | Inhalt |
|---|---|
| `PT15` | Versionspräfix |
| Header | JSON, UTF-8, Base64url ohne Padding |
| Nutzdaten | 210 Bit, 27 Byte, Base64url ohne Padding (36 Zeichen) |

Base64url: `+` wird `-`, `/` wird `_`, `=` am Ende entfällt. Namen stehen nur kodiert, nicht verschlüsselt.

## Header

```json
{"n":"Anna","p":"Ben"}
```

| Feld | Bedeutung |
|---|---|
| `n` | Name der Person, die den Code erzeugt hat |
| `p` | Name der anderen Person, wie `n` ihn eingetippt hat |

Das gewählte Pronomen (er/sie) steht nicht im Code, es betrifft nur die Anzeige auf dem eigenen Handy. Die Auswertung prüft über Kreuz: `n` des einen Codes gleich `p` des anderen, tolerant gegenüber Leerzeichen sowie Groß- und Kleinschreibung.

## Nutzdaten

Bits in Reihenfolge, höchstwertiges Bit zuerst (MSB first), in 8er-Gruppen zu Bytes gepackt. Die letzten 6 Bit sind Füllbits (0).

| Bit | Inhalt |
|---|---|
| 0–23 | Selbstteil: 24 Antworten, je 1 Bit |
| 24–29 | Gedankenexperimente G1–G6, je 1 Bit |
| 30–101 | Teil über die andere Person: 24 Antworten, je 3 Bit |
| 102–161 | Zeitklassen Selbstteil: 30 × 2 Bit, erst 24 Fragen, dann 6 Gedanken |
| 162–209 | Zeitklassen Teil über die andere Person: 24 × 2 Bit |
| 210–215 | Füllbits (0) |

**Antwort, 1 Bit:** `0` = Option A, `1` = Option B, wie in der Itemliste. Die zufällige Reihenfolge der Karten auf dem Bildschirm hat keinen Einfluss.

**Antwort über die andere Person, 3 Bit:** `0` A sicher, `1` B sicher, `2` A unsicher, `3` B unsicher, `4` kann ich nicht beurteilen. `5` bis `7` sind ungültig.

**Zeitklasse, 2 Bit:** Bearbeitungszeit pro Karte, über Vor- und Zurückblättern aufaddiert. Einstiegsbildschirme zählen nicht.

| Klasse | Zeit |
|---|---|
| 0 | unter 2 s |
| 1 | 2 bis unter 5 s |
| 2 | 5 bis unter 15 s |
| 3 | ab 15 s |

## Itemreihenfolge

| Index | Block |
|---|---|
| 0–5 | 1 Alltag miteinander |
| 6–11 | 2 Wenn es schwierig wird |
| 12–17 | 3 Was du brauchst |
| 18–23 | 4 Wie du durchs Leben gehst |

Index = Nummer in der Itemliste minus 1.

## Grenzen

- Das Limit von 4 Mal „kann ich nicht beurteilen" setzt nur die Oberfläche durch. Der Decoder warnt bei mehr.
- Im Selbstteil ist „unbeantwortet" nicht von Option A unterscheidbar. Die App lässt keinen Code ohne alle Antworten entstehen.
