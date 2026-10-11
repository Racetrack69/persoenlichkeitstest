# Auswertung: Konzept

Stand: 11.10.2026 · Karten v1.7 · liest PT17 über decoder.js · Bereich 3 besitzt diese Datei.

Kennzeichnung: Unmarkiertes ist entschieden oder umgesetzt. „Annahme“ ist nicht bestätigt, „Vorschlag“ nicht entschieden.

## Rahmen

- Die Auswertung ist eine Sammlung. Sie nimmt beliebig viele Codes auf, verknüpft sie über die Namen und zeigt, welche Paare bereit zum Aufdecken sind.
- Genau zwei Personen decken gemeinsam auf einem Handy auf, das ist Teil des Spiels. Alles läuft lokal im Browser.
- Eigene Codes kommen automatisch aus dem Speicher des Spiels (`pt-v17`, nur lesend), alle anderen werden eingefügt, auch mehrere auf einmal und als ganze WhatsApp-Nachrichten. Codes aus älteren Versionen (PT13 bis PT16) werden übersprungen, mit Hinweis.
- Paare sind komplett, wenn beide Richtungen da sind. Fehlt eine, nennt die Sammlung den fehlenden Code. Spielstand pro Paar (`pt17-auswertung`).
- Gleicher Name mit verschiedenen Antworten über sich: Hinweis, dass es zwei Personen sein könnten oder Teil 1 neu gemacht wurde.
- Die App zieht keine Schlüsse. Sie zeigt, wo zwei Menschen sich gleich oder verschieden sehen, und gibt Anstöße fürs Gespräch.
- Keine Pronomen in der Auswertung, weil er oder sie nicht im Code steht. Es stehen immer die Namen da.

## Ablauf

1. Einstieg: „Wie seht ihr euch?“ Zeigt an einem Beispiel Sprechblase und Denkblase und sagt, dass es keine Bewertung ist.
2. Die drei Karten, bei denen ihr euch am verschiedensten seht. Gedankenexperimente können dabei sein.
3. Ein Trenner, dann die übrigen Karten in Spielreihenfolge. Gedankenexperimente stehen dazwischen, im Nachtmodus, wie beim Spielen.
4. Pro Karte: erst raten und reden (Szene und beide Antwortkarten), dann zweimal aufdecken. Schritt 1 zeigt „Über Anna“, Schritt 2 zusätzlich „Über Ben“, beide bleiben stehen. Nach dem zweiten Aufdecken erscheint die Gesprächsfrage, falls die Karte eine hat (15 von 28).
5. Überblick, dann der Abschluss.
6. Der Spielstand übersteht ein Neuladen.

## Was gezeigt wird

- Aufdecken nach Variante 1: Pro Richtung eine Zeile „Über Anna“. Darin eine Sprechblase „Anna sagt: Erst ankommen“ (was Anna über sich sagt) und darunter eine gestrichelte Denkblase in Bens Farbe „Ben dachte: Gleich los“ (was Ben über Anna getippt hat). Gedachtes steht kursiv. Seit v1.7 ohne Stufe.
- In den Blasen stehen die Kurzformen `ka`/`kz` aus fragen.json, nicht die Ich-Sätze.
- Personenfarben: erste Person Terrakotta, zweite Blau, mit Kürzel im Kreis.
- Rechts neben „Über Anna“: „Seht ihr gleich“ oder „Seht ihr verschieden“ (hervorgehoben). Bei „verschieden“ darunter „Wie kommst du darauf, Ben?“. Lange Namen werden mit „…“ gekürzt.
- Größte Unterschiede: Gewicht pro Richtung 1, wenn Tipp und Antwort verschieden sind. Beide Richtungen werden addiert (0 bis 2). Nur Karten mit Gewicht über 0 kommen in Frage. Gleichstand: die spätere Karte, weil die Karten nach hinten tiefer werden. Annahme: Diese Reihenfolge trifft, was sich für Paare am größten anfühlt.
- Überblick: „Hier seht ihr verschieden“ (pro Richtung als „Anna sagt „Erst ankommen“. Ben dachte „Gleich los“.“), „Hier seht ihr euch beide anders“, „Wo tickt ihr gleich?“ (Antworten über sich) und die Projektionsrate. Lange Listen zeigen vier Einträge, der Rest klappt auf.
- Abschluss: „Gleich gesehen“ als Zählung pro Richtung („17 von 28“). Dazu der Satz „Verschieden gesehen ist kein Fehler, sondern Gesprächsstoff.“
- Zeitklassen stehen im Code, werden aber nur im Feedback gezählt.

## Feedback zu den Karten

- Eigene Ansicht über alle Codes der Sammlung. Pro Karte: Verteilung A/B über sich (jede Person einmal), Tipps richtig (nur wenn Teil 1 der getippten Person in der Sammlung ist), Karten mit über 15 Sekunden. Gedankenexperimente stehen in derselben Liste, markiert.
- „Am auffälligsten“: die fünf Karten mit der höchsten Summe aus Zuschlag „fast alle antworten über sich gleich“ (trennt kaum), Zuschlag „fast alle tippen richtig“ (überrascht kaum) und Anteil über 15 Sekunden. Annahme für „fast alle“: ab 4 Fällen und 85 Prozent.
- Seit v1.7 entfallen die „eher“-Zählung und „nicht beurteilt“. Neu ist „Tipps richtig“, weil die Testspieler zu offensichtliche Karten als langweilig empfunden haben.
- Bei wenigen Codes sind das Hinweise, keine Belege. Das steht auch so in der Ansicht.

## Architektur

- auswertung.html bindet decoder.js ein (`window.PT17`). Der Kern (`AUSW`: sammle, paare, konflikte, personen, feedback, vergleiche, groessteUnterschiede, gleichheit, projektion, beideVerschieden, antwort, kurz, kurzantwort, kuerzel, isG) läuft ohne DOM.
- Die Kartentexte setzt build.py aus fragen.json in beide Seiten ein, inklusive Kurzformen und Blöcken. build.py bricht ab, wenn eine Kurzform fehlt, länger als 24 Zeichen ist, einen Schlusspunkt hat, ein Ich oder Pronomen enthält oder A und B gleich sind.
- Prüfung: `node roundtrip-auswertung.js index.html auswertung.html`. 1000 Paare mit abweichenden Schreibweisen, als WhatsApp-Text eingelesen, verglichen mit den Rohantworten, dazu feste Beispiele für die größten Unterschiede, die Kurzformen und das Feedback. Stand 11.10.: fehlerfrei.
- Browser-Durchlauf (Playwright) zu zweit auf getrennten Handys, Aufdecken auf 390 × 844 und 375 × 667 ohne JS-Fehler. Schlimmster Fall (alle 28 Karten in beide Richtungen verschieden, lange Namen): „Nächste Karte“ ohne Scrollen sichtbar. Auf sehr kleinen Handys (320 × 568) muss man scrollen, wie schon vorher.

## Fertig, wenn

Ein echtes Paar hat auf zwei Handys gespielt, die Codes per WhatsApp getauscht und ohne Hilfe zusammen aufgedeckt.
