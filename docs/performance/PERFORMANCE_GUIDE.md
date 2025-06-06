# Performance Optimization Guide

**Current Status**: ⚠️ POOR  
**Bundle Size**: 2.4MB (target: <500KB)  
**Test Coverage**: 0%  
**Last Updated**: January 2025

## Performance Overview

The application currently has significant performance issues that will impact user experience and scalability.

## Current Performance Metrics

| Metric                       | Current  | Target   | Status        |
| ---------------------------- | -------- | -------- | ------------- |
| Bundle Size                  | 2.4MB    | <500KB   | ❌ Critical   |
| First Load JS                | 2.4MB    | <200KB   | ❌ Critical   |
| TTI (Time to Interactive)    | ~8s      | <3s      | ❌ Poor       |
| FCP (First Contentful Paint) | ~3s      | <1s      | ❌ Poor       |
| Memory Usage                 | High     | Moderate | ⚠️ Warning    |
| API Response Times           | Variable | <200ms   | ⚠️ Needs Work |

## Critical Performance Issues

### 1. Bundle Size (2.4MB)

**Problem**: Massive JavaScript bundle causing slow initial loads  
**Impact**: Users on slower connections experience 10+ second load times  
**Solutions**:

#### Code Splitting

```typescript
// Use dynamic imports for heavy components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false
});
```

#### Tree Shaking

```typescript
// Import only what you need
import { debounce } from 'lodash-es'; // ✅ Good
import _ from 'lodash'; // ❌ Bad - imports entire library
```

#### Bundle Analysis

```bash
npm run analyze
# Review which packages are contributing to size
# Remove or replace heavy dependencies
```

### 2. No Virtualization

**Problem**: Lists render all items at once  
**Impact**: Browser crashes with 100+ items  
**Solution**: Implement virtualization

```typescript
import { VirtualList } from '@tanstack/react-virtual';

function LargeList({ items }) {
  const parentRef = useRef();
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 45,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
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
            {items[virtualItem.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3. Memory Leaks

**Problem**: Realtime subscriptions not cleaned up  
**Impact**: Application slows down over time  
**Solution**: Proper cleanup

```typescript
useEffect(() => {
  const subscription = supabase
    .channel('changes')
    .on(
      'postgres_changes',
      {
        /* ... */
      },
      handler
    )
    .subscribe();

  // CRITICAL: Always cleanup
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

### 4. Unoptimized Images

**Problem**: Large, unoptimized images  
**Solution**: Use Next.js Image component

```typescript
import Image from 'next/image';

// ✅ Optimized
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  placeholder="blur"
  blurDataURL={blurDataUrl}
  priority={isAboveFold}
/>

// ❌ Not optimized
<img src="/hero.jpg" alt="Hero" />
```

## Optimization Strategies

### 1. Lazy Loading

```typescript
// Pages
const LazyPage = dynamic(() => import('./pages/HeavyPage'));

// Components
const LazyModal = dynamic(() => import('./components/Modal'), {
  ssr: false
});

// Images
<Image loading="lazy" ... />
```

### 2. Caching Strategy

#### TanStack Query Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

#### API Response Caching

```typescript
// app/api/data/route.ts
export async function GET(request: Request) {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=59',
    },
  });
}
```

### 3. Database Optimization

#### Add Indexes

```sql
-- Frequently queried columns
CREATE INDEX idx_sessions_code ON bingo_sessions(session_code);
CREATE INDEX idx_players_session ON bingo_session_players(session_id);
CREATE INDEX idx_boards_created ON bingo_boards(created_at DESC);

-- Composite indexes for complex queries
CREATE INDEX idx_sessions_status_created
ON bingo_sessions(status, created_at DESC);
```

#### Query Optimization

```typescript
// ❌ Bad - N+1 query
const boards = await getBoards();
for (const board of boards) {
  board.cards = await getCards(board.id);
}

// ✅ Good - Single query with join
const { data: boards } = await supabase.from('bingo_boards').select(`
    *,
    bingo_cards (*)
  `);
```

### 4. Component Optimization

#### React.memo for Expensive Components

```typescript
const ExpensiveComponent = React.memo(({ data }) => {
  // Complex rendering logic
  return <div>...</div>;
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.data.id === nextProps.data.id;
});
```

#### useMemo for Expensive Calculations

```typescript
function Component({ items }) {
  const sortedItems = useMemo(
    () => items.sort((a, b) => b.score - a.score),
    [items]
  );

  return <List items={sortedItems} />;
}
```

### 5. Web Vitals Optimization

#### Reduce Layout Shift (CLS)

```css
/* Reserve space for dynamic content */
.image-container {
  aspect-ratio: 16 / 9;
  background: #f0f0f0;
}

/* Explicit dimensions */
.card {
  min-height: 200px;
}
```

#### Improve First Input Delay (FID)

```typescript
// Split heavy operations
function heavyOperation(data) {
  return new Promise(resolve => {
    // Break into chunks
    const chunks = splitIntoChunks(data, 100);
    let processed = 0;

    function processChunk() {
      const chunk = chunks[processed++];
      // Process chunk

      if (processed < chunks.length) {
        requestIdleCallback(processChunk);
      } else {
        resolve(results);
      }
    }

    processChunk();
  });
}
```

## Performance Monitoring

### 1. Web Vitals Tracking

```typescript
// app/layout.tsx
import { WebVitalsReporter } from '@/components/WebVitalsReporter';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <WebVitalsReporter />
      </body>
    </html>
  );
}
```

### 2. Custom Performance Metrics

```typescript
// lib/performance.ts
export function measurePerformance(name: string, fn: () => void) {
  performance.mark(`${name}-start`);
  fn();
  performance.mark(`${name}-end`);
  performance.measure(name, `${name}-start`, `${name}-end`);

  const measure = performance.getEntriesByName(name)[0];
  console.log(`${name}: ${measure.duration}ms`);
}
```

### 3. Sentry Performance Monitoring

```typescript
Sentry.init({
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', /^https:\/\/yourserver\.io\/api/],
      routingInstrumentation: Sentry.nextRouterInstrumentation,
    }),
  ],
  tracesSampleRate: 0.1,
});
```

## Bundle Optimization Checklist

- [ ] Enable SWC minification
- [ ] Remove unused dependencies
- [ ] Replace heavy libraries with lighter alternatives
- [ ] Implement code splitting
- [ ] Lazy load routes and components
- [ ] Optimize images with next/image
- [ ] Enable gzip/brotli compression
- [ ] Use CDN for static assets
- [ ] Implement service worker caching
- [ ] Tree shake imports

## API Performance

### 1. Implement Pagination

```typescript
// API route
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const { data, count } = await supabase
    .from('items')
    .select('*', { count: 'exact' })
    .range((page - 1) * limit, page * limit - 1);

  return Response.json({
    data,
    pagination: {
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit),
    },
  });
}
```

### 2. Use Proper HTTP Caching

```typescript
// Static data
headers: {
  'Cache-Control': 'public, max-age=3600, immutable'
}

// Dynamic data
headers: {
  'Cache-Control': 'private, max-age=0, must-revalidate'
}
```

### 3. Optimize Database Queries

```typescript
// Use select to limit fields
const { data } = await supabase
  .from('users')
  .select('id, name, avatar_url') // Only needed fields
  .limit(10);

// Use RPC for complex queries
const { data } = await supabase.rpc('get_user_stats', { user_id: userId });
```

## Deployment Optimizations

### Vercel Configuration

```json
{
  "functions": {
    "app/api/heavy-endpoint/route.ts": {
      "maxDuration": 30
    }
  },
  "images": {
    "domains": ["your-domain.com"],
    "formats": ["image/avif", "image/webp"]
  }
}
```

### Next.js Configuration

```typescript
// next.config.ts
const nextConfig = {
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96],
  },
  experimental: {
    optimizeCss: true,
  },
};
```

## Performance Testing

### Lighthouse CI

```yaml
# .github/workflows/lighthouse.yml
- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v9
  with:
    urls: |
      https://your-site.com
      https://your-site.com/heavy-page
    budgetPath: ./lighthouse-budget.json
```

### Load Testing

```bash
# Using k6
k6 run --vus 100 --duration 30s load-test.js
```

## Action Items

### Immediate (Week 1)

1. Implement code splitting for routes
2. Add lazy loading for heavy components
3. Optimize images with next/image
4. Add basic caching headers

### Short Term (Week 2-3)

1. Implement virtualization for lists
2. Add pagination to all data fetching
3. Optimize bundle size (target: <1MB)
4. Fix memory leaks in realtime subscriptions

### Medium Term (Month 1)

1. Implement service worker
2. Add comprehensive caching strategy
3. Optimize database queries and indexes
4. Achieve <500KB bundle size

### Long Term

1. Implement edge functions for geo-distributed performance
2. Add CDN for all static assets
3. Implement micro-frontends if needed
4. Regular performance audits

## Resources

- [Web.dev Performance Guide](https://web.dev/performance/)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
