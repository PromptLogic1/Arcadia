# Arcadia Project: Analyse & Roadmap zur Stabilitäts- und Performance-Optimierung

Dieses Dokument fasst die kritischsten technischen Schwachstellen des Projekts zusammen und skizziert eine Roadmap für deren Behebung in den nächsten drei Sprints.

---

## A. TL;DR – Die kritischsten Schwachstellen

Die größten Risiken liegen in der **Redis/Upstash-Integration** und dem **Error-Handling**.

- **Server-Crash beim Start:** Ohne gültige Upstash-Konfiguration stürzt der Server ab, da der Rate-Limiter den Redis-Client ungeschützt beim App-Import initialisiert.
- **Client-seitige Redis-Fehler:** In einigen Services werden Redis-Operationen fälschlicherweise im Browser-Kontext aufgerufen, was zu Laufzeitfehlern führt.
- **Unvollständige Validierung:** Kritische Umgebungsvariablen für Upstash und Supabase werden nicht beim Start validiert, was zu späten und schwer debugbaren Fehlern führt.
- **Redundantes Error-Logging:** Die Sentry-Integration erfasst manche Fehler potenziell doppelt (z.B. durch Next.js und unsere Error Boundaries), was die Analyse erschwert und Kosten erhöht.

**Sofortmaßnahmen:** Die Redis-Initialisierung muss abgesichert, clientseitige Aufrufe verhindert und die Validierung aller kritischen Umgebungsvariablen sichergestellt werden.

---

## B. Kritische Runtime-Errors

| #   | Fehlerbild / Komponente                                                               | Ursache                                                                                                                                                                            | Sofort-Fix                                                                                                                                                                 | Folge-Risiko                                                                                                         |
| --- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | **Start-up Crash bei fehlendem Upstash** – Applikation beendet sich beim Server-Start | Ungeschützte Initialisierung des RateLimiters ruft `getRedisClient()` schon beim Import auf. Ohne `UPSTASH_REDIS_*` Env-Variablen wirft dies einen Error.                          | Initialisierung konditional gestalten (z.B. erst bei erstem Aufruf oder mit `isRedisConfigured()`-Guard). Alternativ einen Dummy-Client im Dev-Modus bereitstellen.        | Server nicht startbar; keine Rate Limits im Live-Betrieb → **Hohes DoS-Risiko**.                                     |
| 2   | **Redis im Browser-Kontext** – Aufruf von PubSub-/Presence-Funktionen im Client       | Es fehlt ein Guard: `getRedisClient()` wird clientseitig aufgerufen. Dies führt zu einer Exception (`Redis client cannot be initialized in browser`).                              | Strikten Check einbauen (`if (typeof window !== 'undefined')`) in allen Redis-Services, um sicherzustellen, dass diese nur serverseitig genutzt werden.                    | Ungefangene Exceptions im Browser, Störung der UI. ErrorBoundary greift zwar, aber die UX leidet.                    |
| 3   | **Fehlende Env-Validierung für Upstash/Supabase** – Laufzeitfehler bei erstem Zugriff | Anders als DB-URL & SESSION_SECRET werden Upstash- und Supabase-Keys nicht beim Start geprüft. Fehler treten erst bei der ersten Nutzung auf.                                      | `validateServerEnv` um Upstash- und Supabase-Variablen erweitern und beim Server-Start ausführen, um bei fehlenden Keys sofort zu scheitern.                               | Späte Laufzeitfehler, die schwer zu debuggen sind und Features ohne klaren Grund lahmlegen.                          |
| 4   | **Doppelte Fehlererfassung in Sentry**                                                | `GlobalError` (Next.js) und `RootErrorBoundary` (React) senden denselben Fehler an Sentry. Bei Hydrationsfehlern könnten beide greifen.                                            | Sentry-Scope deduplizieren, z.B. über ein Flag im ErrorBoundary. Prüfen, ob die Next/Sentry Auto-Instrumentierung bereits eine Deduplizierung bietet.                      | Erhöhter Sentry-Traffic und Kosten, unklare Dashboards durch Duplikate, potenzieller Performance-Overhead im Client. |
| 5   | **Asynchrone Fallstricke im Strict Mode** – z.B. doppelt initiertes Presence-Tracking | React Strict Mode mountet Komponenten im DEV-Modus doppelt. Asynchrone `useEffect`-Aufrufe (`startTracking()`) können zu Überschneidungen führen (z.B. zwei parallele Heartbeats). | Effekt-Logik robuster gestalten: `useRef` für Cleanup-Funktionen verwenden oder das Tracking über Server Actions initiieren, die nicht vom doppelten Mount betroffen sind. | Unnötige Redis-Calls, mögliche Memory-Leaks (hängengebliebene Intervalle). Geringes Risiko, aber ineffizient.        |

---

## C. Weitere Optimierungen

### Performance

- **Lazy Imports:** Umfangreiche Feature-Module (z.B. Community, Analytics) dynamisch nachladen.
- **List Virtualization:** Lange Listen (Challenges, Boards) mit `react-window` oder `tanstack-virtual` virtualisieren, um Rendering-Lags zu vermeiden.
- **Parallelisierung:** Mehrere Redis-Calls (z.B. in `joinBoardPresence`) mit `Promise.all` parallel statt seriell ausführen.

### Kosten

- **Redis-RPS reduzieren:**
  - Presence-Heartbeat von 30s auf 60s erhöhen.
  - Polling-Frequenz im Client von 5s auf 10-15s drosseln.
  - Upstash Ratelimit Analytics deaktivieren (`analytics: false`).
- **Sentry-Traffic optimieren:**
  - Tunnel-Route nur für kritische Daten nutzen.
  - Session Replay Sampling-Rate weiter senken (z.B. von 10% auf 5%).

### Developer Experience (DX)

- **Einheitliches Fehler-Handling:** Die letzten 3 Services auf das `ServiceResponse`-Pattern umstellen.
- **Dev-Fallbacks für Redis:** Einen optionalen Memory-Mock für Redis einführen, damit das Projekt ohne Upstash-Konfiguration lauffähig ist.
- **Strukturiertes Logging:** `console.error` durch den `logger` ersetzen (bereits ~90% umgesetzt).

### Security

- **Secrets schützen:** Sicherstellen, dass der Supabase Service Key niemals im Client landet (aktuell korrekt umgesetzt).
- **CSP-Header:** Eine `Content-Security-Policy` implementieren, um XSS-Risiken zu minimieren.
- **Rate-Limiting-Audit:** Prüfen, ob alle kritischen API-Routen (insb. Authentifizierung) durch `withRateLimit` geschützt sind.
- **Zusätzliche Verteidigung:** IP-Blocking oder eine WAF für Login-Endpunkte als zweite Verteidigungslinie evaluieren.

---

## D. Metriken

| Metrik                             | Wert                                               | Kommentar                                                                                                |
| ---------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Startup Time** (Server & Client) | Server: ~2,2s <br> Client: ~3-4s (bis interaktiv)  | Hohe Initial-Ladezeit durch großes Bundle ohne Code-Splitting. First Paint bei ~3s+.                     |
| **Redis-RPS** (Anfragen/Sek.)      | ~0,15 pro User (aktiv) <br> Peak >50 bei 30+ Usern | Haupttreiber: Presence-Heartbeat und Polling. Potenzial zur Reduktion vorhanden.                         |
| **Bundle-Size** (Client)           | ~500 KB JS (gzipped)                               | Zu groß für initialen Load. Enthält Sentry SDK, Supabase Client etc. Ziel: <300 KB durch Code-Splitting. |
| **Memory Peak** (Server)           | ~180 MB (Node-Prozess in Prod)                     | Moderater RAM-Verbrauch, da Caching via Redis erfolgt. Keine offensichtlichen Memory-Leaks.              |
| **GC Pause Time**                  | ~20ms (Ø), Spike bis 50ms                          | Keine auffälligen "Stop-the-world"-Pausen. Nicht vordringlich.                                           |

---

## E. Nächste Schritte (Roadmap über 3 Sprints)

### Sprint 1 – Stabilität & Config (Crash-Fixes)

1.  **Redis-Init absichern:** RateLimiting-Service umbauen, sodass eine fehlende Upstash-Config im Dev-Modus nicht zum Absturz führt (try/catch oder Guard).
2.  **Client-Guards einziehen:** In allen Redis-Services einen `if (!isServer)`-Guard hinzufügen, um clientseitige Aufrufe zu verhindern.
3.  **Env-Validierung erweitern:** `validateServerEnv()` um `UPSTASH_REDIS_*` und Supabase-Keys ergänzen und beim Server-Start aufrufen.
4.  **Sentry-Deduplizierung:** Doppelte Fehlererfassung prüfen und ggf. durch Filter im `GlobalError` oder `RootErrorBoundary` beheben.
5.  **Strict-Mode-Fix für Hooks:** Den `usePresence`-Hook anpassen (`useRef`), sodass doppelte Ausführung im DEV-Modus keine Seiteneffekte verursacht.

### Sprint 2 – Performance & Kosten (Optimierungen)

1.  **Listen virtualisieren:** Lange Listen (Challenges, Feeds) mit `react-window` oder Ähnlichem virtualisieren.
2.  **Bundle splitten:** Große Module (Sentry Replay, Analytics) identifizieren (`@next/bundle-analyzer`) und dynamisch laden (`next/dynamic`).
3.  **Redis-Traffic drosseln:** Heartbeat- und Polling-Intervalle erhöhen und `analytics: false` im RateLimiter setzen.
4.  **Datenbank-Indizes prüfen:** Häufige Abfragen (Leaderboards, Statistiken) analysieren und ggf. fehlende DB-Indizes ergänzen.
5.  **Sentry-Tunnel optimieren:** Die `/monitoring`-Route im Dev-Build deaktivieren und Sampling-Raten produktiv anpassen.

### Sprint 3 – DX & Security (Qualitätsschub)

1.  **Service-Pattern abschließen:** Die letzten 3 inkonsistenten Services auf das `ServiceResponse`-Pattern umstellen.
2.  **Vollständige Zod-Abdeckung:** Alle API-Routen ausnahmslos mit Zod-Schemas absichern.
3.  **CSP & Security Headers:** Eine `Content-Security-Policy` und weitere Security-Header (`X-XSS-Protection`, `Referrer-Policy`) definieren.
4.  **Rate Limit Audit:** Alle sicherheitsrelevanten Endpunkte (Login, Registrierung) auf korrekte und strikte Rate Limits prüfen.
5.  **Developer Tooling verbessern:** Dokumentation und Setup für ein lokales Redis (z.B. via Docker) bereitstellen, um die Abhängigkeit von Upstash in der Entwicklung zu reduzieren.
