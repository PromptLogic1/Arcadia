# useBoardGenerator

## Primäre Verantwortung

Hook für die dynamische Generierung und Balancierung von Bingo-Boards unter Berücksichtigung von Tags, Schwierigkeitsgraden und Spieleinstellungen.

## 1. State Management

### 1.1 Generator Settings

- **boardSize**: 3x3 bis 6x6 Felder
- **difficulty**: Verteilung der Schwierigkeitsgrade
  - Easy (T5-T3)
  - Normal (T4-T1)
  - Hard (T3-T1)
- **selectedTags**: Set aktiver Tags für die Generierung
- **timeLimit**: Optionale Zeitbegrenzung

### 1.2 Generator Stats

- **generationTime**: Dauer der Board-Generierung
- **attemptsCount**: Anzahl der Generierungsversuche
- **balanceScore**: Bewertung der Board-Balance

## 2. Kernfunktionen

### 2.1 Board-Generierung

- **generateBoard**: Hauptfunktion zur Board-Erstellung
  - Kartenpool-Filterung nach Tags
  - Schwierigkeitsverteilung
  - Balance-Prüfung
  - Retry-Logik bei unausgewogenen Boards

### 2.2 Tag-Management

- **toggleTag**: Tag-Auswahl aktivieren/deaktivieren
- **validateTags**: Prüfung der Tag-Kompatibilität
- **updateTagWeights**: Gewichtung der Tags anpassen

### 2.3 Balance-Kontrolle

- **checkLineBalance**: Prüfung der Linien-Balance
- **checkBoardBalance**: Gesamtboard-Balance validieren
- **optimizeDistribution**: Verteilung optimieren

## 3. Performance-Optimierung

### 3.1 Caching

- Zwischenspeichern häufiger Konstellationen
- Caching von Tag-Kombinationen
- Wiederverwendung von Teilberechnungen

### 3.2 Algorithmus-Effizienz

- Early-Exit bei nicht erfüllbaren Kriterien
- Effiziente Datenstrukturen
- Optimierte Suchstrategien

## 4. Fehlerbehandlung

### 4.1 Validierung

- **Input-Validierung**: Prüfung der Generator-Parameter
- **Balance-Validierung**: Sicherstellen der Board-Ausgewogenheit
- **Tag-Validierung**: Überprüfung der Tag-Kompatibilität

### 4.2 Error Recovery

- Automatische Wiederholungsversuche
- Fallback auf Default-Einstellungen
- Benutzerfreundliche Fehlermeldungen

## 5. Integration

### 5.1 Service-Nutzung

- BoardGeneratorService
- BalanceService
- TagValidationService

### 5.2 Hook-Schnittstellen

- useGameSettings
- useTagSystem
- useGameAnalytics

## 6. Cleanup & Ressourcen

### 6.1 Ressourcen-Management

- Cache-Bereinigung
- Memory-Optimierung
- Performance-Monitoring

### 6.2 State-Reset

- Settings zurücksetzen
- Stats zurücksetzen
- Cache leeren

## ❌ Nicht zuständig für

- Spiellogik
- UI-Rendering
- Datenbank-Interaktion
- Session-Management
