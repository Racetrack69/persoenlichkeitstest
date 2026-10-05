# Code-Format PT14

Stand: 05.10.2026 · Itemliste v1.4 · Bereich 2 besitzt diese Datei.

Ein Code pro Person. Er entsteht erst, wenn beide Teile fertig sind: der Teil über sich selbst und der Teil über die andere Person. Codes verschiedener Präfixe werden nie gemischt.

## Aufbau

```
PT14 . <Header> . <Nutzdaten>
```

| Teil | Inhalt |
|---|---|
| `PT14` | Versionspräfix |
| Header | JSON, UTF-8, Base64url ohne Padding |
| Nutzdaten | 288 Bit = 36 Byte, Base64url ohne Padding (48 Zeichen) |

Base64url: `+` wird `-`, `/` wird `_`, `=` am Ende entfällt. Namen stehen nur kodiert, nicht verschlüsselt.

## Header

```json
{"n":"Anna","p":"Ben"}
```

| Feld | Bedeutung |
|---|---|
| `n` | Name der Person, die den Code erzeugt hat |
| `p` | Name der anderen Person, wie `n` ihn eingetippt hat |

Die Auswertung prüft über Kreuz: `n` des einen Codes gleich `p` des anderen, tolerant gegenüber Leerzeichen sowie Groß- und Kleinschreibung.

## Nutzdaten

Bits in Reihenfolge, höchstwertiges Bit zuerst (MSB first), in 8er-Gruppen zu Bytes gepackt. 288 Bit füllen 36 Byte genau, es gibt keine Füllbits.

| Bit | Inhalt |
|---|---|
| 0–32 | Selbstteil: 33 Antworten, je 1 Bit |
| 33–40 | Gedankenexperimente G1–G8, je 1 Bit |
| 41–139 | Teil über die andere Person: 33 Antworten, je 3 Bit |
| 140–221 | Zeitklassen Selbstteil: 41 × 2 Bit, erst 33 Fragen, dann 8 Gedanken |
| 222–287 | Zeitklassen Teil über die andere Person: 33 × 2 Bit |

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
| 0–7 | 1 Alltag |
| 8–15 | 2 Unter Druck |
| 16–26 | 3 Nähe und Rückzug |
| 27–32 | 4 Das große Ganze |

Index = Nummer in der Itemliste minus 1. Es gibt kein Kontroll-Item mehr.

## Grenzen

- Das Limit von 5 Mal „kann ich nicht beurteilen" setzt nur die Oberfläche durch. Der Decoder warnt bei mehr.
- Im Selbstteil ist „unbeantwortet" nicht von Option A unterscheidbar. Die App lässt keinen Code ohne alle Antworten entstehen.
