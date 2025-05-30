# usePlayerManagement

## Primäre Verantwortung

Hook für die Verwaltung von Spielern, Teams und deren Eigenschaften während einer Spielsession.

## 1. State Management

### 1.1 Hauptstates

- **players**: Array aktiver Spieler
- **teamNames**: Namen der Teams
- **teamColors**: Farben der Teams
- **currentPlayer**: Aktiver Spieler

### 1.2 Spieler-Properties

- ID
- Name
- Farbe
- Team-Zugehörigkeit
- Status

## 2. Kernfunktionen

### 2.1 Spieler-Verwaltung

- **addPlayer**: Neuen Spieler hinzufügen
- **removePlayer**: Spieler entfernen
- **updatePlayerInfo**: Spielerdaten aktualisieren
- **switchTeam**: Team-Wechsel durchführen

### 2.2 Team-Management

- **updateTeamName**: Team umbenennen
- **updateTeamColor**: Team-Farbe ändern
- **balanceTeams**: Teams ausgleichen
- **validateTeamSize**: Team-Größen prüfen

## 3. Validierung

### 3.1 Spieler-Validierung

- Eindeutige Namen
- Verfügbare Farben
- Maximale Spieleranzahl
- Team-Balance

### 3.2 Team-Validierung

- Eindeutige Team-Namen
- Farb-Konflikte
- Team-Größen-Limits
- Berechtigungen

## 4. Integration

### 4.1 Hook-Schnittstellen

- useSession
- useGameSettings
- useBingoGame

### 4.2 Event-Handling

- Spieler-Join/Leave Events
- Team-Change Events
- Status-Updates

## ❌ Nicht zuständig für

- Spiellogik
- UI-Rendering
- Session-Management
- Settings-Verwaltung
