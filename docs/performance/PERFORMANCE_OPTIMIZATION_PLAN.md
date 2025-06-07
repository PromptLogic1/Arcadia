# Performance-Optimierungsplan für Arcadia

**Erstellt am**: 7. Juni 2025  
**Status**: Detaillierter Schritt-für-Schritt Plan  
**Geschätzte Dauer**: 6-8 Wochen  
**Ziel**: Bundle Size von 2.4MB auf <500KB reduzieren, TTI < 3s

## Zusammenfassung der aktuellen Performance-Probleme

### 1. Bundle-Size-Analyse
- **Gesamt Bundle**: ~2.4MB (Ziel: <500KB)
- **Größte Chunks**:
  - Framework: 180KB
  - Main Bundle: 136KB
  - Mehrere Chunks über 100KB
- **Hauptprobleme**:
  - Keine Code-Splitting-Strategie
  - Alle Icons/Komponenten werden gebündelt
  - Heavy Dependencies (Framer Motion, alle Radix UI Komponenten)
  - Keine Tree-Shaking-Optimierung

### 2. Kritische Performance-Metriken
- **First Load JS**: 2.4MB (Ziel: <200KB)
- **TTI**: ~8s (Ziel: <3s)
- **FCP**: ~3s (Ziel: <1s)
- **Keine Virtualisierung** für große Listen
- **Keine optimierten Bilder**

### 3. Architektur-Probleme
- 40% des Codes folgt nicht den Best Practices
- Direct Supabase calls in Components
- useEffect für Data Fetching statt TanStack Query
- Zustand Stores mit Server Data

## Detaillierter Optimierungsplan

### Phase 1: Quick Wins (Woche 1-2)

#### 1.1 Code Splitting für Routen (2-3 Tage)
```typescript
// Vorher: Alle Routen werden gebündelt
import ChallengeHub from '@/features/challenge-hub/components/challenge-hub'

// Nachher: Dynamisches Laden
const ChallengeHub = dynamic(
  () => import('@/features/challenge-hub/components/challenge-hub'),
  { 
    loading: () => <LoadingSpinner />,
    ssr: true 
  }
)
```

**Betroffene Dateien**:
- `/app/challenge-hub/[boardId]/page.tsx`
- `/app/play-area/bingo/page.tsx`
- `/app/community/page.tsx`
- `/app/settings/page.tsx`
- `/app/user/edit/page.tsx`

**Erwartete Einsparung**: ~400KB vom Initial Bundle

#### 1.2 Icon Library Optimierung (1-2 Tage)
```typescript
// Vorher: Import aller Icons
import { Icon1, Icon2 } from 'react-icons/md'
import * as Icons from 'lucide-react'

// Nachher: Spezifische Imports
import Icon1 from 'react-icons/md/MdDashboard'
import { Dashboard } from 'lucide-react/dist/esm/icons/dashboard'
```

**Erwartete Einsparung**: ~200KB

#### 1.3 Heavy Component Lazy Loading (2-3 Tage)
```typescript
// Komponenten die lazy geladen werden sollten:
const BingoGrid = dynamic(() => import('./BingoGrid'))
const CardLibrary = dynamic(() => import('./CardLibrary'))
const CommunityFilters = dynamic(() => import('./CommunityFilters'))
const CreateDiscussionForm = dynamic(() => import('./CreateDiscussionForm'))
```

**Erwartete Einsparung**: ~300KB

### Phase 2: Bundle Optimierung (Woche 3-4)

#### 2.1 Tree Shaking & Import Optimierung
```javascript
// next.config.ts Erweiterung
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
      'react-icons',
      'framer-motion',
      '@radix-ui/react-*',
      'date-fns',
    ],
  },
  // Webpack optimization
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework chunk
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // UI Components
            ui: {
              name: 'ui',
              test: /[\\/]components[\\/]ui[\\/]/,
              chunks: 'all',
              priority: 30,
            },
            // Vendor chunks
            vendor: {
              name(module) {
                const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)?.[1];
                return `vendor-${packageName.replace('@', '')}`;
              },
              test: /[\\/]node_modules[\\/]/,
              chunks: 'all',
              priority: 20,
            },
          },
        },
      };
    }
    return config;
  },
}
```

#### 2.2 Dependency Replacement
```json
// package.json Änderungen
{
  "dependencies": {
    // Ersetze heavy dependencies
    "framer-motion": "REMOVE", // 150KB - nur wo nötig
    "date-fns": "REPLACE mit date-fns-tz", // Kleinere Alternative
    "@tanstack/react-virtual": "ADD", // Für Virtualisierung
    "lightweight-charts": "ADD", // Statt heavy chart libraries
  }
}
```

#### 2.3 Radix UI Selective Import
```typescript
// Erstelle wrapper für Radix UI
// src/components/ui/radix-imports.ts
export { Dialog, DialogContent, DialogTrigger } from '@radix-ui/react-dialog'
export { Popover, PopoverContent, PopoverTrigger } from '@radix-ui/react-popover'
// Nur importieren was verwendet wird
```

### Phase 3: Performance Features (Woche 5-6)

#### 3.1 Virtualisierung implementieren
```typescript
// src/components/ui/virtual-list.tsx
import { useVirtualizer } from '@tanstack/react-virtual'

export function VirtualList<T>({ 
  items, 
  renderItem,
  estimateSize = 50 
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 5
  })

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Zu virtualisierende Listen**:
- `/features/bingo-boards/components/CardLibrary.tsx`
- `/features/community/components/DiscussionCard.tsx`
- `/features/play-area/components/SessionCard.tsx`

#### 3.2 Image Optimization
```typescript
// src/components/ui/optimized-image.tsx
import Image from 'next/image'
import { useState } from 'react'

export function OptimizedImage({ 
  src, 
  alt, 
  ...props 
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  
  return (
    <div className="relative">
      {isLoading && <Skeleton className="absolute inset-0" />}
      <Image
        src={src}
        alt={alt}
        loading="lazy"
        placeholder="blur"
        blurDataURL={generateBlurDataURL()}
        onLoad={() => setIsLoading(false)}
        {...props}
      />
    </div>
  )
}
```

#### 3.3 Service Worker für Caching
```javascript
// public/sw.js
const CACHE_NAME = 'arcadia-v1'
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/bundle.js',
  // Statische Assets
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  )
})
```

### Phase 4: Datenbank & API Optimierung (Woche 6-7)

#### 4.1 Datenbank-Indizes
```sql
-- Kritische Indizes für Performance
CREATE INDEX idx_bingo_boards_user_created 
  ON bingo_boards(created_by, created_at DESC);

CREATE INDEX idx_bingo_sessions_status_created 
  ON bingo_sessions(status, created_at DESC);

CREATE INDEX idx_session_players_session_user 
  ON bingo_session_players(session_id, user_id);

CREATE INDEX idx_bingo_cards_board 
  ON bingo_cards(board_id, position);

-- Composite indexes für häufige Queries
CREATE INDEX idx_boards_public_featured 
  ON bingo_boards(is_public, is_featured, created_at DESC);
```

#### 4.2 API Response Caching
```typescript
// src/app/api/utils/cache.ts
export function withCache(
  handler: NextApiHandler,
  options: CacheOptions = {}
) {
  const { 
    maxAge = 60, 
    swr = 59,
    private: isPrivate = false 
  } = options

  return async (req: Request) => {
    const response = await handler(req)
    
    return new Response(response.body, {
      ...response,
      headers: {
        ...response.headers,
        'Cache-Control': isPrivate
          ? `private, max-age=${maxAge}`
          : `public, s-maxage=${maxAge}, stale-while-revalidate=${swr}`
      }
    })
  }
}
```

#### 4.3 Query Optimierung
```typescript
// Optimierte Queries mit Pagination
export async function getBoards({
  page = 1,
  limit = 20,
  userId
}: GetBoardsParams) {
  const offset = (page - 1) * limit
  
  const { data, count } = await supabase
    .from('bingo_boards')
    .select(`
      id,
      title,
      description,
      thumbnail_url,
      created_at,
      user:created_by (
        id,
        username,
        avatar_url
      )
    `, { count: 'exact' })
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
    
  return { data, count, page, limit }
}
```

### Phase 5: Monitoring & Continuous Optimization (Woche 7-8)

#### 5.1 Web Vitals Tracking
```typescript
// src/components/WebVitalsReporter.tsx
import { useReportWebVitals } from 'next/web-vitals'

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    // Send to analytics
    if (window.gtag) {
      window.gtag('event', metric.name, {
        value: Math.round(metric.value),
        metric_id: metric.id,
        metric_value: metric.value,
        metric_delta: metric.delta,
      })
    }
    
    // Send to Sentry
    if (metric.name === 'CLS' && metric.value > 0.1) {
      Sentry.captureMessage('High CLS detected', {
        extra: { metric }
      })
    }
  })
  
  return null
}
```

#### 5.2 Performance Budget
```json
// performance-budget.json
{
  "bundles": [
    {
      "path": "/_next/static/chunks/main-*.js",
      "maxSize": "150KB"
    },
    {
      "path": "/_next/static/chunks/framework-*.js",
      "maxSize": "200KB"
    },
    {
      "path": "/_next/static/chunks/pages/*",
      "maxSize": "100KB"
    }
  ],
  "total": {
    "javascript": "500KB",
    "css": "50KB",
    "fonts": "100KB"
  }
}
```

## Implementierungs-Reihenfolge

### Woche 1-2: Quick Wins
1. Route-based Code Splitting
2. Icon Library Optimierung
3. Heavy Component Lazy Loading
4. Bundle Analyzer Integration

### Woche 3-4: Bundle Optimierung  
1. Tree Shaking Configuration
2. Dependency Audit & Replacement
3. Webpack Optimization
4. CSS Optimization

### Woche 5-6: Core Features
1. List Virtualization
2. Image Optimization
3. Service Worker
4. Prefetching Strategy

### Woche 6-7: Backend Optimierung
1. Database Indexes
2. API Caching
3. Query Optimization
4. Edge Functions für kritische Routen

### Woche 7-8: Monitoring
1. Web Vitals Implementation
2. Performance Budget CI/CD
3. Real User Monitoring
4. A/B Testing für Optimierungen

## Erwartete Ergebnisse

### Bundle Size Reduktion
- **Initial**: 2.4MB → **Ziel**: <500KB
- **Hauptchunks**: <150KB pro Route
- **Vendor Splitting**: Maximale Wiederverwendung

### Performance Metriken
- **FCP**: <1s (von 3s)
- **TTI**: <3s (von 8s)
- **TBT**: <200ms
- **CLS**: <0.1

### User Experience
- Instant Navigation zwischen Routen
- Smooth Scrolling bei großen Listen
- Offline-Fähigkeit für statische Inhalte
- Progressive Enhancement

## Risiken & Mitigationen

### Risiko 1: Breaking Changes
- **Mitigation**: Feature Flags für schrittweise Rollouts
- **Testing**: Umfassende E2E Tests vor jedem Release

### Risiko 2: SEO Impact
- **Mitigation**: SSR für kritische Seiten beibehalten
- **Monitoring**: Core Web Vitals tracking

### Risiko 3: Development Complexity
- **Mitigation**: Klare Dokumentation
- **Training**: Team Workshops für neue Patterns

## Mess-Kriterien

1. **Bundle Size**: Tägliches Monitoring via CI/CD
2. **Core Web Vitals**: Real User Monitoring
3. **Conversion Rate**: A/B Testing
4. **Error Rate**: Sentry Monitoring
5. **User Feedback**: Performance Surveys

## Nächste Schritte

1. **Sofort**: Bundle Analyzer in CI/CD integrieren
2. **Diese Woche**: Mit Route Splitting beginnen
3. **Review**: Wöchentliche Performance Reviews
4. **Iteration**: Basierend auf Metriken anpassen

---

**Hinweis**: Dieser Plan sollte iterativ umgesetzt werden. Nach jeder Phase sollten die Ergebnisse gemessen und der Plan entsprechend angepasst werden.