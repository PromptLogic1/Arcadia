# useSession

## Primäre Verantwortung
Hook für das Management des Spielsession-Lifecycles und die Koordination der Spieler-Teilnahme.

## 1. State Management

### 1.1 Hauptstates
- **session**: Aktuelle Spielsession
- **loading**: Ladezustand
- **error**: Fehlerzustand
- **players**: Verbundene Spieler

### 1.2 Session Properties
- ID
- Status
- Startzeit
- Letzte Aktivität
- Spieler-Liste
- Board-Zustand

## 2. Kernfunktionen

### 2.1 Session-Lifecycle
- **createSession**: Neue Session erstellen
- **joinSession**: Session beitreten
- **leaveSession**: Session verlassen
- **endSession**: Session beenden

### 2.2 State-Synchronisation
- **updateSessionState**: State aktualisieren
- **broadcastUpdates**: Änderungen verteilen
- **handleDisconnect**: Verbindungsabbrüche
- **reconnectPlayer**: Wiederbeitritt

## 3. Realtime-Funktionen

### 3.1 Subscription-Management
- Supabase Channel Setup
- Event-Handling
- State-Synchronisation
- Presence-Management

### 3.2 Konfliktbehandlung
- Concurrent Updates
- State-Merging
- Reconnect-Logik
- Timeout-Handling

## 4. Integration

### 4.1 Hook-Schnittstellen
- usePlayerManagement
- useGameSettings
- useBingoGame

### 4.2 Event-System
- Session Events
- Player Events
- State Events
- Error Events

## ❌ Nicht zuständig für
- Spiellogik
- UI-Rendering
- Settings-Verwaltung
- Board-Generierung