# useLayout

## Primäre Verantwortung
Hook für responsive Layouts und dynamische UI-Anpassungen.

## 1. State Management

### 1.1 Hauptstates
- **breakpoint**: Aktueller Breakpoint
- **isMobile**: Mobile-View-Status
- **isTablet**: Tablet-View-Status
- **isDesktop**: Desktop-View-Status

### 1.2 Layout Properties
- Grid-Layout
- Spacing
- Typography
- Container-Größen

## 2. Kernfunktionen

### 2.1 Layout-Berechnungen
- **getGridLayout**: Grid-Parameter berechnen
- **getResponsiveSpacing**: Abstände berechnen
- **getFluidTypography**: Responsive Schriftgrößen
- **getContainerWidth**: Container-Breiten

### 2.2 Responsive Anpassungen
- **handleResize**: Resize-Events verarbeiten
- **updateBreakpoint**: Breakpoint aktualisieren
- **adjustLayout**: Layout anpassen
- **preventLayoutShift**: CLS vermeiden

## 3. Performance

### 3.1 Optimierungen
- Debounced Resize
- Cached Calculations
- Minimal Re-Renders
- RAF-Optimierung

### 3.2 Cleanup
- Event Listener
- Cache
- Timeouts

## ❌ Nicht zuständig für
- Spiellogik
- State-Management
- Datenbank-Interaktion
- Session-Verwaltung