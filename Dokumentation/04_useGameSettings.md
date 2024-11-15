# useGameSettings

## Primäre Verantwortung
Hook für die Verwaltung und Persistierung aller spielbezogenen Einstellungen und Regeln.

## 1. State Management

### 1.1 Hauptstates
- **teamMode**: Team-basiertes vs. Einzelspieler-Spiel
- **lockout**: Exklusive Feldmarkierung
- **soundEnabled**: Audio-Feedback
- **winConditions**: Siegbedingungen
  - line: Linienvervollständigung
  - majority: Mehrheitsbesitz
- **timeLimit**: Spielzeitbegrenzung

### 1.2 Default Settings
- Standardeinstellungen für schnellen Spielstart
- Spieltyp-spezifische Defaults
- Persistierte User-Präferenzen

## 2. Kernfunktionen

### 2.1 Settings-Operationen
- **updateSettings**: Batch-Update von Einstellungen
- **toggleTeamMode**: Team-Modus umschalten
- **toggleLockout**: Lockout-Modus umschalten
- **toggleSound**: Sound ein/ausschalten
- **updateWinConditions**: Siegbedingungen anpassen
- **updateTimeLimit**: Zeitlimit setzen

### 2.2 Persistenz
- Lokales Speichern von Einstellungen
- Laden gespeicherter Präferenzen
- Synchronisation mit Backend

## 3. Validierung

### 3.1 Einstellungsprüfung
- Gültige Wertebereiche
- Regelkonflikte
- Kompatibilitätsprüfung

### 3.2 Konsistenzprüfung
- Abhängigkeiten zwischen Einstellungen
- Spielmodus-Kompatibilität
- Regelwerk-Integrität

## 4. Integration

### 4.1 Hook-Schnittstellen
- useBingoGame
- useSession
- usePlayerManagement

### 4.2 Event-Handling
- Settings-Change Events
- Mode-Switch Events
- Reset Events

## ❌ Nicht zuständig für
- Spiellogik
- UI-Rendering
- Datenbank-Operationen
- Spieler-Management