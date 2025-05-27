export const TIMER_CONSTANTS = {
  // Performance-Einstellungen
  PERFORMANCE_CHECK_INTERVAL: 10000, // 10 Sekunden
  MAX_TICK_HISTORY: 100,            // Maximale Anzahl gespeicherter Ticks
  MAX_DRIFT_THRESHOLD: 1000,        // Maximaler erlaubter Drift in ms

  // Zeit-Limits
  MIN_TIME: 0,                      // Minimale Zeit
  MAX_TIME: 86400,                  // Maximale Zeit (24 Stunden)
  DEFAULT_TIME: 300,                // Standard-Zeit (5 Minuten)

  // Update-Intervalle
  TICK_INTERVAL: 1000,              // Standard-Tick-Intervall (1 Sekunde)
  STATS_UPDATE_INTERVAL: 5000,      // Statistik-Update-Intervall (5 Sekunden)

  // Storage-Keys
  STORAGE_KEY: 'timerState',        // Key für Session Storage
  
  // Event-Namen
  EVENTS: {
    TIMER_UPDATE: 'timerUpdate',
    TIMER_EVENT: 'timerEvent'
  }
} as const 