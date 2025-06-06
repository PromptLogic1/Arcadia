# Monitoring Guide

## Overview

This guide covers application monitoring, error tracking, performance monitoring, and alerting strategies for the Arcadia project.

## Current Monitoring Stack

### Sentry (Implemented ✅)

Error tracking and performance monitoring are configured with Sentry.

#### Configuration Files

- `instrumentation-client.ts` - Client-side error tracking
- `instrumentation-server.ts` - Server-side error tracking
- `src/instrumentation.ts` - Shared instrumentation

#### Key Features Enabled

- Error tracking with source maps
- Performance monitoring
- Session replay on errors
- User context tracking
- Custom error boundaries

### Monitoring Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Sentry    │────▶│  Alerts     │
│   Errors    │     │   Cloud     │     │  (Email)    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Server    │     │  Dashboard  │     │   Slack     │
│   Errors    │     │   & Stats   │     │ (Optional)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Error Tracking

### Client-Side Errors

```typescript
// Automatic error capture
window.addEventListener('unhandledrejection', event => {
  Sentry.captureException(event.reason);
});

// Manual error capture
try {
  riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: 'checkout',
      user_action: 'payment_submit',
    },
  });
}
```

### Server-Side Errors

```typescript
// API route error handling
export async function POST(request: Request) {
  try {
    const result = await processRequest(request);
    return Response.json(result);
  } catch (error) {
    Sentry.captureException(error, {
      extra: {
        request_url: request.url,
        method: 'POST',
      },
    });
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Error Boundaries

All critical components are wrapped with error boundaries:

```typescript
// Already implemented in:
// - src/components/error-boundaries/BaseErrorBoundary.tsx
// - src/components/error-boundaries/RouteErrorBoundary.tsx
// - src/components/error-boundaries/RealtimeErrorBoundary.tsx
```

## Performance Monitoring

### Web Vitals Tracking

```typescript
// app/components/WebVitalsReporter.tsx
import { useReportWebVitals } from 'next/web-vitals';

export function WebVitalsReporter() {
  useReportWebVitals(metric => {
    // Send to analytics
    Sentry.captureMessage('Web Vital', {
      level: 'info',
      extra: {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
      },
    });
  });

  return null;
}
```

### Custom Performance Metrics

```typescript
// Track specific operations
export function trackPerformance(operation: string) {
  const transaction = Sentry.startTransaction({
    name: operation,
    op: 'custom',
  });

  return {
    finish: () => transaction.finish(),
    setData: (key: string, value: any) => transaction.setData(key, value),
  };
}

// Usage
const perf = trackPerformance('board-generation');
const board = await generateBoard(config);
perf.setData('cardCount', board.cards.length);
perf.finish();
```

### Database Query Monitoring

```typescript
// lib/supabase-instrumented.ts
export async function instrumentedQuery(
  queryFn: () => Promise<any>,
  queryName: string
) {
  const span = Sentry.getCurrentHub().getScope()?.getSpan()?.startChild({
    op: 'db.query',
    description: queryName,
  });

  try {
    const result = await queryFn();
    span?.setStatus('ok');
    return result;
  } catch (error) {
    span?.setStatus('internal_error');
    throw error;
  } finally {
    span?.finish();
  }
}
```

## Application Metrics

### Health Checks

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: 'unknown',
    redis: 'unknown',
    sentry: 'unknown',
  };

  // Database check
  try {
    await supabase.from('users').select('count').single();
    checks.database = 'healthy';
  } catch {
    checks.database = 'unhealthy';
  }

  // Sentry check
  try {
    // Verify Sentry is configured
    if (Sentry.getCurrentHub().getClient()) {
      checks.sentry = 'healthy';
    }
  } catch {
    checks.sentry = 'unhealthy';
  }

  const allHealthy = Object.values(checks).every(v => v === 'healthy');

  return Response.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
    {
      status: allHealthy ? 200 : 503,
    }
  );
}
```

### Custom Metrics

```typescript
// lib/metrics.ts
class MetricsCollector {
  private metrics: Map<string, number[]> = new Map();

  record(metric: string, value: number) {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }
    this.metrics.get(metric)!.push(value);
  }

  getStats(metric: string) {
    const values = this.metrics.get(metric) || [];
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: sorted[Math.floor(values.length * 0.5)],
      p95: sorted[Math.floor(values.length * 0.95)],
      p99: sorted[Math.floor(values.length * 0.99)],
    };
  }
}

export const metrics = new MetricsCollector();
```

## Logging Strategy

### Structured Logging

```typescript
// lib/logger.ts (already implemented)
import { logger } from '@/lib/logger';

// Use structured logging
logger.info('User action', {
  userId: user.id,
  action: 'create_board',
  boardId: board.id,
  timestamp: Date.now(),
});

logger.error('API Error', {
  error: error.message,
  stack: error.stack,
  endpoint: '/api/boards',
  userId: context.userId,
});
```

### Log Levels

- **ERROR**: Application errors, failed operations
- **WARN**: Deprecations, performance issues
- **INFO**: Important business events
- **DEBUG**: Detailed debugging information

## Alerting Configuration

### Sentry Alerts

Configure in Sentry dashboard:

1. **Error Rate Alerts**

   - Threshold: >10 errors/minute
   - Duration: 5 minutes
   - Action: Email + Slack

2. **Performance Alerts**

   - P95 response time >3s
   - Apdex score <0.8
   - Action: Email

3. **Crash Free Rate**
   - Sessions crash rate >1%
   - Action: Page on-call

### Custom Alerts

```typescript
// lib/alerting.ts
export async function checkThresholds() {
  const stats = await getSystemStats();

  if (stats.errorRate > 10) {
    await sendAlert({
      severity: 'critical',
      title: 'High Error Rate',
      message: `Error rate: ${stats.errorRate}/min`,
    });
  }

  if (stats.responseTime.p95 > 3000) {
    await sendAlert({
      severity: 'warning',
      title: 'Slow Response Times',
      message: `P95: ${stats.responseTime.p95}ms`,
    });
  }
}
```

## Dashboard Setup

### Key Metrics to Track

1. **Error Metrics**

   - Error rate by type
   - Error rate by page/endpoint
   - User impact (affected users)
   - Error trends

2. **Performance Metrics**

   - Page load times
   - API response times
   - Database query performance
   - WebSocket latency

3. **Business Metrics**
   - Active users
   - Session duration
   - Feature usage
   - Conversion rates

### Sentry Dashboard Configuration

```javascript
// Example dashboard query
{
  "widgets": [
    {
      "title": "Error Rate",
      "query": "event.type:error",
      "display": "line-chart",
      "interval": "5m"
    },
    {
      "title": "Slowest Transactions",
      "query": "event.type:transaction p95()>3s",
      "display": "table"
    },
    {
      "title": "User Sessions",
      "query": "release.session.status:healthy",
      "display": "big-number"
    }
  ]
}
```

## Real User Monitoring (RUM)

### Session Recording

```typescript
// Configured in instrumentation-client.ts
Sentry.init({
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
      // Only record on errors
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
    }),
  ],
});
```

### User Context

```typescript
// Set user context for better debugging
export function setUserContext(user: User) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

// Clear on logout
export function clearUserContext() {
  Sentry.setUser(null);
}
```

## Debugging Production Issues

### Using Breadcrumbs

```typescript
// Add custom breadcrumbs
Sentry.addBreadcrumb({
  category: 'user-action',
  message: 'User clicked start game',
  level: 'info',
  data: {
    gameId: game.id,
    playerCount: players.length,
  },
});
```

### Source Maps

Source maps are automatically uploaded during build:

- Development: Inline source maps
- Production: Uploaded to Sentry

### Debugging Workflow

1. **Error Reported** → Check Sentry dashboard
2. **View Error Details** → Stack trace with source maps
3. **Check Breadcrumbs** → User actions leading to error
4. **View Replay** → See exactly what happened
5. **Check Related Issues** → Pattern recognition

## Monitoring Checklist

### Development

- [ ] Error boundaries on all routes
- [ ] Logging in catch blocks
- [ ] Performance marks for slow operations
- [ ] User context set after auth

### Pre-Production

- [ ] Verify Sentry DSN configured
- [ ] Test error reporting
- [ ] Configure alert rules
- [ ] Set up dashboards
- [ ] Test health endpoints

### Production

- [ ] Monitor error rates
- [ ] Track performance metrics
- [ ] Review user sessions
- [ ] Check alert fatigue
- [ ] Regular dashboard review

## Incident Response

### Severity Levels

1. **P0 - Critical**: Site down, data loss

   - Response: Immediate
   - Alert: Page on-call

2. **P1 - High**: Major feature broken

   - Response: <1 hour
   - Alert: Email + Slack

3. **P2 - Medium**: Performance degradation

   - Response: <4 hours
   - Alert: Email

4. **P3 - Low**: Minor bugs
   - Response: Next business day
   - Alert: Dashboard only

### Response Procedures

1. **Acknowledge** - Respond to alert
2. **Assess** - Check impact and scope
3. **Communicate** - Update status page
4. **Mitigate** - Apply temporary fix
5. **Resolve** - Fix root cause
6. **Review** - Post-mortem

## Future Monitoring Enhancements

### Short Term

- [ ] Add APM (Application Performance Monitoring)
- [ ] Implement custom dashboards
- [ ] Add business metric tracking
- [ ] Set up status page

### Long Term

- [ ] Machine learning for anomaly detection
- [ ] Predictive alerting
- [ ] Distributed tracing
- [ ] Full observability platform

## Resources

- [Sentry Docs](https://docs.sentry.io/)
- [Web Vitals](https://web.dev/vitals/)
- [Monitoring Best Practices](https://www.datadoghq.com/blog/monitoring-101-collecting-data/)
- [SRE Handbook](https://sre.google/sre-book/table-of-contents/)
