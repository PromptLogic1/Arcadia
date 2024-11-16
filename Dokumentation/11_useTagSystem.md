# useTagSystem

## Primäre Verantwortung
Hook für die Verwaltung und Validierung des Tag-Systems, einschließlich Core-Tags und Community-Tags. Stellt Funktionen für Tag-Management, Validierung und Community-Interaktionen bereit.

## 1. State Management

### 1.1 Tag States
- **coreTags**: Entwickler-definierte Tags (Universal & Game-spezifisch)
- **communityTags**: Von der Community erstellte Tags
- **proposedTags**: Tags im Vorschlagsprozess
- **selectedTags**: Aktuell ausgewählte Tags
- **loading**: Ladezustand
- **error**: Fehlerzustand

### 1.2 Statistiken
- **usageStats**: Tag-Nutzungsstatistiken
- **votingStats**: Abstimmungsstatistiken
- **popularTags**: Häufig verwendete Tags

## 2. Kernfunktionen

### 2.1 Tag-Operationen
- **addTag**: Neuen Tag vorschlagen
- **removeTag**: Tag entfernen (nur eigene/vorgeschlagene)
- **updateTag**: Tag-Informationen aktualisieren
- **selectTag**: Tag für Board auswählen
- **deselectTag**: Tag von Board entfernen

### 2.2 Validierung
- **validateTag**: Prüft Tag auf Gültigkeit
- **checkDuplicates**: Erkennt ähnliche/doppelte Tags
- **validateUsage**: Prüft Nutzungsanforderungen
- **validateVoting**: Prüft Abstimmungsregeln

### 2.3 Community-Funktionen
- **voteTag**: Für/gegen Tag stimmen
- **reportTag**: Problematischen Tag melden
- **subscribeTag**: Tag für Updates folgen
- **getTagHistory**: Tag-Änderungsverlauf abrufen

## 3. Automatisierung

### 3.1 Periodische Prozesse
- Archivierung inaktiver Tags
- Aktualisierung von Tag-Statistiken
- Überprüfung von Vorschlägen
- Bereinigung ungültiger Tags

### 3.2 Event-Handling
- Tag-Änderungen
- Abstimmungsergebnisse
- Status-Updates
- Fehler und Warnungen

## 4. Integration

### 4.1 Hook-Schnittstellen
- useBoardGenerator
- useGameSettings
- useSession

### 4.2 Service-Integration
- TagValidationService
- TagManagementService
- DatabaseService

## 5. Caching & Performance

### 5.1 Caching-Strategien
- Häufig verwendete Tags
- Validierungsergebnisse
- Statistiken

### 5.2 Batch-Operationen
- Bulk-Updates
- Verzögerte Validierung
- Gruppierte Datenbankoperationen

## ❌ Nicht zuständig für
- UI-Rendering
- Routing/Navigation
- Authentifizierung
- Direkte Datenbankzugriffe
- Board-Generierung
