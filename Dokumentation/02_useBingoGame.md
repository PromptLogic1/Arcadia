# useBingoGame

## Primäre Verantwortung

Hook für Spiellogik und State-Synchronisation im Bingo-Spiel

## 1. State Management

### 1.1 Hauptstates

#### winner

Typ: `null | PlayerId | -1`

- `null`: Kein Gewinner
- `PlayerId`: ID des Gewinners
- `-1`: Unentschieden

#### gamePhase

Typ: `'active' | 'ended'`

- `active`: Spiel läuft
- `ended`: Spiel beendet

#### lastMove

Typ: `{ position: number; row: number; col: number; playerId: string } | null`

Speichert:

- Position im Board
- Koordinaten (row/col)
- Spieler-ID
- Optimiert Gewinnbedingungsprüfung

#### markedFields

Typ: `{ total: number; byPlayer: Record<string, number> }`

Trackt:

- Gesamtanzahl markierter Felder
- Anzahl Felder pro Spieler
- Optimiert Mehrheits- und Unentschieden-Prüfung

### 1.2 Abhängige States

- `board`: Aus useBingoBoard
- `settings`: Aus useGameSettings
- `timeLeft`: Aus useTimer
- `currentPlayer`: Aktiver Spieler

## 2. Gewinnbedingungen

### 2.1 Linien-Sieg

Prüfung basierend auf `lastMove`:

- Horizontale Reihe (lastMove.row)
- Vertikale Spalte (lastMove.col)
- Diagonalen (wenn relevant)
- Sofortiger Sieg bei Vervollständigung

### 2.2 Mehrheits-Sieg (Optional)

- Aktivierung via `settings.majorityWinEnabled`
- Prüfung via `markedFields.byPlayer`
- Gewinner = Spieler mit meisten Feldern

### 2.3 Unentschieden

Bedingungen:

- Board voll (`markedFields.total === boardSize²`)
- Zeit abgelaufen (`timeLeft === 0`)

## 3. Events

### 3.1 Spielzug-Events

#### beforeMove

```typescript
(position: number, playerId: string) => boolean;
```

- Validiert Zug vor Ausführung
- Verhindert ungültige Züge

#### afterMove

```typescript
(move: LastMove) => void
```

- Updated States
- Triggert Gewinnprüfung

### 3.2 Spiel-Ende-Events

#### gameEnd

```typescript
(result: { winner: PlayerId | -1 }) => void
```

- Vereint Sieg und Unentschieden
- Setzt finale States
- Benachrichtigt UI

#### onError

```typescript
(error: GameError) => void
```

- Handhabt kritische Fehler
- Initiiert Recovery wenn nötig

## 4. Performance-Optimierung

### 4.1 Optimierungsstrategien

- Effiziente Board-Datenstruktur
- Optimierte Linienprüfung durch Koordinaten
- Minimale State-Updates
- Direkte Spielerfeld-Zählung

## 5. Fehlerbehandlung

### 5.1 Kritische Validierungen

- Spielerzug-Berechtigung
- Feld-Verfügbarkeit
- Spielstatus

### 5.2 Recovery

- Automatischer Fallback zu aktivem Spiel
- Wiederherstellung letzter valider State
- Klare Fehlermeldungen an UI

## 6. Hook-Integration

### 6.1 Externe Abhängigkeiten

- useTimer: Spielzeitende
- useGameSettings: Spielregeln
- useBingoBoard: Board-Updates

### 6.2 Cleanup

- Aufräumen aller Subscriptions
- Reset aller States
- Clear aller Timeouts
