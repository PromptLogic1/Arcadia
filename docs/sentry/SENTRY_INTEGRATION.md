# Sentry Integration Guide

## Overview

Sentry is fully integrated into the Arcadia project for error tracking, performance monitoring, and session replay. This guide covers the complete setup and configuration.

## Current Configuration Status ✅

### 1. **Environment Variables** ✅
All required Sentry environment variables are configured in `.env.local`:

```env
# Core Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://8a7405c4a79496d81249714a3c9ad8c6@o4509444949934080.ingest.de.sentry.io/4509444951244880
SENTRY_ORG=prompt-logic-gmbh
SENTRY_PROJECT=javascript-nextjs
SENTRY_AUTH_TOKEN=your-auth-token-here

# Optional Settings
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
NEXT_PUBLIC_SENTRY_RELEASE=auto-generated-by-sentry
NEXT_PUBLIC_SENTRY_DEV_ENABLED=false  # Set to true to enable in development
```

### 2. **Instrumentation** ✅
- **Client-side**: `instrumentation-client.ts` - Handles browser error tracking with session replay
- **Server-side**: `instrumentation-server.ts` - Handles server and API route errors
- **Edge Runtime**: Supported via `src/instrumentation.ts`

### 3. **Error Boundaries** ✅
Multiple levels of error boundaries integrated with Sentry:
- `RootErrorBoundary` - Catches critical app-wide errors
- `BaseErrorBoundary` - Reusable boundary for components
- `RouteErrorBoundary` - Route-specific error handling
- `RealtimeErrorBoundary` - Handles real-time connection errors

### 4. **Tunnel Route** ✅
Ad-blocker bypass configured at `/monitoring` route to ensure error tracking works for all users.

### 5. **Source Maps** ✅
Automatically uploaded during build process for better error stack traces.

## Features Enabled

### Error Tracking
- Automatic error capture from all routes
- Detailed stack traces with source maps
- User context and breadcrumbs
- Custom error filtering

### Performance Monitoring
- Page load performance
- API route performance
- Database query tracking
- Real-time performance metrics

### Session Replay
- 10% of all sessions recorded
- 100% of sessions with errors recorded
- Privacy-focused with text masking

### Release Tracking
- Automatic release detection
- Error regression tracking
- Deploy tracking with Vercel

## Usage Examples

### Manual Error Capture

```typescript
import * as Sentry from '@sentry/nextjs';

// Capture an exception
try {
  riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: 'payment',
    },
    extra: {
      orderId: order.id,
    },
  });
}

// Capture a message
Sentry.captureMessage('Payment processing started', 'info');
```

### Custom Context

```typescript
import * as Sentry from '@sentry/nextjs';

// Set user context
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});

// Add custom tags
Sentry.setTag('feature', 'bingo-board');

// Add breadcrumbs
Sentry.addBreadcrumb({
  message: 'User clicked start game',
  category: 'user-action',
  level: 'info',
});
```

### Performance Tracking

```typescript
import * as Sentry from '@sentry/nextjs';

// Track custom transaction
const transaction = Sentry.startTransaction({
  name: 'process-bingo-game',
  op: 'task',
});

Sentry.getCurrentHub().configureScope(scope => scope.setSpan(transaction));

// Your operation here
await processBingoGame();

transaction.finish();
```

## Environment-Specific Configuration

### Development
- Errors logged to console
- Source maps available
- Set `NEXT_PUBLIC_SENTRY_DEV_ENABLED=true` to send to Sentry

### Production
- Full error tracking enabled
- 10% transaction sampling
- Session replay enabled
- Source maps uploaded

## Monitoring Dashboard

Access your Sentry dashboard at: https://de.sentry.io/organizations/prompt-logic-gmbh/projects/javascript-nextjs/

### Key Metrics to Monitor
1. **Error Rate** - Should stay below 1%
2. **Transaction Duration** - P95 should be < 3s
3. **Crash Free Sessions** - Target > 99.5%
4. **User Misery Score** - Keep below 0.05

## Troubleshooting

### Errors Not Appearing in Sentry

1. Check DSN is correctly set in `.env.local`
2. Verify ad-blocker is not blocking requests (tunnel route should bypass this)
3. Check browser console for Sentry initialization errors
4. Ensure `SENTRY_AUTH_TOKEN` is set for source map uploads

### Source Maps Not Working

1. Verify `SENTRY_AUTH_TOKEN` is set
2. Check build logs for upload confirmation
3. Ensure release name matches between client and Sentry

### Performance Issues

1. Reduce `tracesSampleRate` if too many transactions
2. Disable session replay for high-traffic pages
3. Use `beforeSend` to filter unnecessary errors

## Best Practices

1. **Don't Log Sensitive Data**
   - Never log passwords, tokens, or PII
   - Use `beforeSend` to scrub sensitive data

2. **Use Appropriate Log Levels**
   - `fatal` - App crashes
   - `error` - Handled errors
   - `warning` - Deprecations
   - `info` - Important events

3. **Add Context**
   - Always include relevant context
   - Use tags for filtering
   - Add breadcrumbs for user actions

4. **Monitor Performance**
   - Track critical user paths
   - Monitor API performance
   - Set up alerts for degradation

## Integration Checklist

- [x] Environment variables configured
- [x] Client-side instrumentation
- [x] Server-side instrumentation  
- [x] Error boundaries integrated
- [x] Tunnel route configured
- [x] Source maps uploading
- [x] Release tracking enabled
- [x] Performance monitoring active
- [x] Session replay configured
- [x] Custom error filtering

## Next Steps

1. Set up alerts in Sentry dashboard
2. Configure issue ownership rules
3. Integrate with your notification system
4. Set up custom dashboards for key metrics
5. Configure data retention policies

## Support

For issues with Sentry integration:
1. Check the [Sentry Next.js docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
2. Review error logs in browser/server console
3. Contact Sentry support for platform issues