# useTimer

## Primäre Verantwortung
Hook für präzises Timing und Countdown-Management im Spiel.

## 1. State Management

### 1.1 Hauptstates
- **time**: Aktuelle Zeit in Sekunden
- **isTimerRunning**: Timer-Status
- **initialTime**: Startzeit für Reset

### 1.2 Timer Controls
- Start/Stop
- Pause/Resume
- Reset
- Format

## 2. Kernfunktionen

### 2.1 Timer-Operationen
- **setTime**: Zeit setzen/aktualisieren
- **setIsTimerRunning**: Timer starten/stoppen
- **formatTime**: Zeit formatieren (HH:MM:SS)
- **resetTimer**: Auf Initialzeit zurücksetzen

### 2.2 Event-Handling
- **onTimeEnd**: Callback bei Zeitablauf
- **onTick**: Regelmäßige Updates
- **onPause**: Pause-Handler
- **onResume**: Resume-Handler

## 3. Performance

### 3.1 Optimierungen
- Präzise Intervalle
- Drift-Kompensation
- Minimale Re-Renders
- Effiziente Updates

### 3.2 Cleanup
- Interval Cleanup
- Event Cleanup
- State Reset

## ❌ Nicht zuständig für
- Spiellogik
- UI-Rendering
- Session-Management
- Spieler-Verwaltung