# Iteration 4 Test Plan - RankForge

## Übersicht
Dieses Dokument definiert die Tests, die für Iteration 4 erfüllt werden müssen. Die Tests sind nach Priorität geordnet und in 5 Bereiche unterteilt.

---

## 🔴 PRIORITÄT 1: Large Page Handling (Critical)

### Warum zuerst?
-Timeout-Probleme sind kritisch und blockieren große Seiten
-10min Timeout ist Hard-Requirement für 200+ Seiten

### Test-Cases

#### TC-LP-01: Timeout Detection (200 Seiten)
- **Akzeptanzkriterien:** 
  - Crawl mit 200 Seiten starten
  - Nach 10 Minuten muss Timeout ausgelöst werden
  - Timeout-Fehler wird korrekt zurückgegeben
- **Erwartetes Ergebnis:** Request timeout nach 10min mit aussagekräftiger Fehlermeldung

#### TC-LP-02: Fallback to Homepage-Only
- **Akzeptanzkriterien:**
  - Wenn Timeout auftritt, soll automatisch ein Fallback auf Homepage-Audit versucht werden
  - User wird über Fallback informiert
- **Erwartetes Ergebnis:** Einzelne Seite (Homepage) wird erfolgreich gecrawlt auch wenn Full-Crawl timeout

#### TC-LP-03: Progress Indicator während Crawl
- **Akzeptanzkriterien:**
  - Fortschrittsanzeige zeigt % der gecrawlten Seiten
  - Aktualisiert sich alle 5-10 Sekunden
  - Zeigt "X of Y pages" Information
- **Erwartetes Ergebnis:** Progress Bar in UI sichtbar und aktuell

#### TC-LP-04: Cancel Running Audit
- **Akzeptanzkriterien:**
  - API-Endpoint zum Abbrechen eines laufenden Audits
  - Abbruch innerhalb von 2 Sekunden wirksam
  - Keine Zombie-Prozesse nach Abbruch
- **Erwartetes Ergebnis:** Audit wird gestoppt, Ressourcen freigegeben

#### TC-LP-05: Large Page Performance (200 Seiten in <10min)
- **Akzeptanzkriterien:**
  - 200 Seiten innerhalb von 10 Minuten (oder Timeout)
  - Durchschnittlich <3 Sekunden pro Seite
- **Erwartetes Ergebnis:** Entweder fertig in <10min oder sauberer Timeout

---

## 🟠 PRIORITÄT 2: Scoring Refinements

### Test-Cases

#### TC-SR-01: Grade Storage in Database
- **Akzeptanzkriterien:**
  - Grade (A-F) wird in DB gespeichert
  - Bei Abfrage wird Grade korrekt zurückgegeben
  - Grade entspricht Score (A=90-100, B=80-89, etc.)
- **Erwartetes Ergebnis:** Grade-Spalte in Audit-Tabelle gefüllt

#### TC-SR-02: Per-Page Scores vs Global Score
- **Akzeptanzkriterien:**
  - Jede Seite hat eigenen Score (0-100)
  - Globaler Score ist Durchschnitt aller Seiten-Scores
  - Separate Speicherung in DB
- **Erwartetes Ergebnis:** page_scores Tabelle mit individuellen Werten

#### TC-SR-03: Grade Boundaries Calibration (SEOptimer-Match)
- **Akzeptanzkriterien:**
  - Abweichung von SEOptimer max. ±5 Punkte
  - Test-Seiten mit bekanntem SEOptimer-Score vergleichen
  - Grade-Boundaries: A≥90, B≥80, C≥70, D≥60, F<60
- **Erwartetes Ergebnis:** ±5 Punkte Genauigkeit zu SEOptimer

#### TC-SR-04: Score Calculation Accuracy
- **Akzeptanzkriterien:**
  - Gleiche URL liefert bei gleichem Input gleiche Scores
  - Scores sind reproduzierbar
- **Erwartetes Ergebnis:** Deterministische Berechnung

---

## 🟡 PRIORITÄT 3: UX Improvements

### Test-Cases

#### TC-UX-01: CSV Export Functionality
- **Akzeptanzkriterien:**
  - CSV-Download Button vorhanden
  - Enthält: URL, Score, Grade, Top-Issues pro Seite
  - UTF-8 Kodierung mit BOM für Excel-Kompatibilität
  - Download startet innerhalb von 2 Sekunden
- **Erwartetes Ergebnis:** Vollständige CSV-Datei wird heruntergeladen

#### TC-UX-02: CSV Content Completeness
- **Akzeptanzkriterien:**
  - Alle gecrawlten Seiten in CSV
  - Spalten: URL, Score, Grade, Issues, Recommendations
  - Keine fehlenden Daten
- **Erwartetes Ergebnis:** CSV ist vollständig und parsebar

#### TC-UX-03: Progress Bar - Real-Time Updates
- **Akzeptanzkriterien:**
  - Progress Bar zeigt Fortschritt während Crawl
  - Updates alle 5 Sekunden
  - Zeigt aktuelle Seite / Gesamtzahl
- **Erwartetes Ergebnis:** Progress Bar bewegt sich realistisch

#### TC-UX-04: Progress Bar - Error States
- **Akzeptanzkriterien:**
  - Bei Fehler wird Progress Bar rot/fehlerhaft angezeigt
  - Fehlermeldung wird angezeigt
  - "Retry"-Option verfügbar
- **Erwartetes Ergebnis:** Klare Fehlerkommunikation

#### TC-UX-05: Audit History Display
- **Akzeptanzkriterien:**
  - Liste vergangener Audits
  - Sortiert nach Datum (neueste zuerst)
  - Zeigt: URL, Datum, Score, Seitenanzahl
- **Erwartetes Ergebnis:** History-Seite zeigt alle Audits

---

## 🟢 PRIORITÄT 4: Per-Page Analysis

### Test-Cases

#### TC-PP-01: PageScoreDistribution
- **Akzeptanzkriterien:**
  - Histogramm oder Verteilung der Scores sichtbar
  - Zeigt: Wie viele Seiten haben Score X
  - Min/Max/Durchschnitt angezeigt
- **Erwartetes Ergebnis:** Verteilungsdiagramm in Report

#### TC-PP-02: Sorting by Score (Ascending/Descending)
- **Akzeptanzkriterien:**
  - Seiten nach Score sortierbar
  - Toggle: Höchste zuerst / Niedrigste zuerst
  - Sortierung in <100ms für bis zu 500 Seiten
- **Erwartetes Ergebnis:** Sortierung funktioniert in UI

#### TC-PP-03: Per-Page Issue List
- **Akzeptanzkriterien:**
  - Jede Seite zeigt ihre eigenen Issues
  - Issues nach Severity sortiert (critical → warning → info)
  - Issue-Typ und Empfehlung sichtbar
- **Erwartetes Ergebnis:** Drill-down in einzelne Seiten möglich

#### TC-PP-04: Filter by Grade
- **Akzeptanzkriterien:**
  - Filter: Nur A-Grades anzeigen
  - Filter: Nur D/F-Grades anzeigen (Problemseiten)
  - Kombination mit Sortierung möglich
- **Erwartetes Ergebnis:** Gefilterte Liste korrekt

---

## 🔵 PRIORITÄT 5: USP Features (4 Features)

### USP #1: AI-Powered Fix Suggestions

#### TC-USP1-01: Auto-Fix for Common Issues
- **Akzeptanzkriterien:**
  - Mindestens 3 häufige Issues haben Auto-Fix
  - "Fix"-Button generiert konkreten Code/Text
  - Preview vor Anwendung
- **Erwartetes Ergebnis:** Fix-Vorschlag wird angezeigt

#### TC-USP1-02: Code Snippet Generation
- **Akzeptanzkriterien:**
  - Für Title/Meta-Probleme: Code-Snippet generiert
  - Snippet ist copy-paste ready
  - HTML/Markdown korrekt formatiert
- **Erwartetes Ergebnis:** Brauchbare Code-Snippets

### USP #2: Competitor Analysis

#### TC-USP2-01: Side-by-Side Comparison
- **Akzeptanzkriterien:**
  - Zwei URLs eingeben können
  - Vergleichsseite zeigt Score-Differenz
  - Gewinner/Verlierer hervorgehoben
- **Erwartetes Ergebnis:** Vergleichs-UI vorhanden

#### TC-USP2-02: Missing Elements Detection
- **Akzeptanzkriterien:**
  - Zeigt was Competitor hat, eigene Seite nicht
  - z.B. Schema, bestimmte Meta-Tags, etc.
- **Erwartetes Ergebnis:** Gap-Analyse sichtbar

### USP #3: Historical Tracking

#### TC-USP3-01: Score Over Time
- **Akzeptanzkriterien:**
  - Gleiche URL mehrfach gecrawlt
  - Zeitlicher Verlauf sichtbar (Chart)
  - Letzte 10 Audits angezeigt
- **Erwartetes Ergebnis:** History-Chart zeigt Trend

#### TC-USP3-02: Alert on Score Drop
- **Akzeptanzkriterien:**
  - Konfigurierbarer Schwellenwert
  - Notification wenn Score >X Punkte fällt
  - Alert in UI sichtbar
- **Erwartetes Ergebnis:** Alert wird ausgelöst

### USP #4: Multi-Language SEO

#### TC-USP4-01: hreflang Detection
- **Akzeptanzkriterien:**
  - Erkennt hreflang-Tags im HTML
  - Zeigt alle Sprachversionen
  - Validierung: Keine fehlenden reciprocals
- **Erwartetes Ergebnis:** hreflang-Analyse in Report

#### TC-USP4-02: Language/Region Targeting
- **Akzeptanzkriterien:**
  - html lang-Attribut erkannt
  - content-language Header erkannt
  - Warnung bei fehlender Implementierung
- **Erwartetes Ergebnis:** Targeting-Info in SEO-Checks

---

## 📋 Test Matrix

| Bereich | Test-Count | Priorität | Abhängigkeiten |
|---------|------------|-----------|-----------------|
| Large Page | 5 | P1 | Keine |
| Scoring | 4 | P2 | Large Page |
| UX | 5 | P3 | Scoring |
| Per-Page | 4 | P4 | UX |
| USP | 7 | P5 | Basis-Features |

---

## ✅ Abnahme-Kriterien für Iteration 4

### Must-Have (alle P1 Tests bestehen):
- [ ] 200 Seiten Crawl mit 10min Timeout
- [ ] Progress Bar sichtbar
- [ ] CSV Export funktioniert
- [ ] Grades in DB gespeichert
- [ ] Per-Page Scores vorhanden

### Should-Have (≥80% P2-P4 bestehen):
- [ ] Sortierung nach Score
- [ ] PageScoreDistribution
- [ ] Grade Boundaries ±5 zu SEOptimer

### Nice-to-Have (USPs):
- [ ] Mindestens 2 von 4 USPs implementiert
- [ ] AI Fix Suggestions für häufigste Issues

---

## 🎯 Empfohlene Test-Reihenfolge

1. **Woche 1:** Large Page Tests (TC-LP-01 bis TC-LP-05)
2. **Woche 2:** Scoring Tests (TC-SR-01 bis TC-SR-04) + UX Progress Bar
3. **Woche 3:** UX CSV Export + Audit History
4. **Woche 4:** Per-Page Features + USPs

---

## 📝 Notizen

- Integration-Tests vor E2E-Tests priorisieren
- Mock-External-Services für schnellere Tests
- Performance-Tests mit realen 200-Seiten-Sitemaps
- SEOptimer-Testseiten für Scoring-Calibration bereithalten
