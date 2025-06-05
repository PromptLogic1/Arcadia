# Sentry Integration Guide

**Created**: January 2025  
**Status**: Partially Implemented  
**Priority**: Critical for Production Monitoring

## Overview

Sentry is integrated but NOT fully configured. You have the code, but without proper environment variables and testing, it's just dead weight in your bundle.

## Architecture

### Integration Points

```
1. Error Boundaries → Sentry.captureException()
2. Logger → Sentry breadcrumbs & error capture
3. API Routes → Automatic instrumentation
4. Client-side → Session replay on errors
5. Tunnel → Bypass ad blockers
```

## Configuration Files

### 1. Client Configuration
**Location**: `sentry.client.config.ts`

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,         // 10% in production
  replaysSessionSampleRate: 0.1,  // 10% of sessions
  replaysOnErrorSampleRate: 1.0,  // 100% on errors
  tunnel: '/api/sentry-tunnel',   // Bypass ad blockers
});
```

### 2. Server Configuration
**Location**: `sentry.server.config.ts`

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
});
```

### 3. Edge Configuration
**Location**: `sentry.edge.config.ts`

For edge runtime (middleware, edge API routes).

## Environment Variables

Add to `.env.local`:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_KEY@o0.ingest.sentry.io/0
SENTRY_ORG=your-org
SENTRY_PROJECT=arcadia
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_PROJECT_IDS=your-project-id
SENTRY_KEY=your-public-key

# Optional
NEXT_PUBLIC_SENTRY_RELEASE=1.0.0
NEXT_PUBLIC_SENTRY_DEV_ENABLED=false  # Enable in dev
```

## Error Boundary Integration

### BaseErrorBoundary
Captures all component-level errors with context:

```typescript
Sentry.withScope((scope) => {
  scope.setContext('errorBoundary', {
    level,
    errorId,
    errorCount,
  });
  scope.setTag('errorBoundary', true);
  scope.setTag('errorBoundary.level', level);
  
  const sentryId = Sentry.captureException(error, {
    contexts: {
      react: { componentStack },
    },
  });
});
```

### RootErrorBoundary
Captures critical errors with maximum severity:

```typescript
scope.setLevel('fatal');
scope.setTag('critical', true);
```

## Sentry Tunnel (Ad Blocker Bypass)

**Location**: `src/app/api/sentry-tunnel/route.ts`

Routes Sentry requests through your domain:
- Validates project IDs to prevent abuse
- Forwards requests to Sentry
- Maintains error tracking for 100% of users

## Utility Functions

**Location**: `src/lib/sentry-utils.ts`

### Key Functions:

1. **setSentryUser(user)**
   - Sets user context for all errors
   - Automatically called on auth changes

2. **addSentryContext()**
   - Adds build info, browser info, network info
   - Called on app initialization

3. **captureErrorWithContext(error, context, level)**
   - Captures errors with custom context
   - Used for service-level errors

4. **trackTransaction(name, operation, callback)**
   - Performance monitoring wrapper
   - Tracks operation duration and status

## Logger Integration

The logger automatically sends errors to Sentry:

```typescript
logger.error('API failed', error, { userId, endpoint });
// → Captures to Sentry with context

logger.warn('High memory usage');
// → Creates Sentry breadcrumb

logger.info('User action', { action: 'clicked' });
// → Adds breadcrumb for debugging
```

## Usage Examples

### 1. Manual Error Capture

```typescript
import * as Sentry from '@sentry/nextjs';

try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: 'bingo-board' },
    level: 'error',
  });
}
```

### 2. Adding Context

```typescript
import { addSentryContext, setSentryUser } from '@/lib/sentry-utils';

// On app init
addSentryContext();

// On login
setSentryUser({ id: user.id, email: user.email });
```

### 3. Performance Monitoring

```typescript
import { trackTransaction } from '@/lib/sentry-utils';

await trackTransaction(
  'create-bingo-board',
  'user-action',
  async () => {
    return await createBoard(data);
  }
);
```

### 4. Custom Breadcrumbs

```typescript
import { addBreadcrumb } from '@/lib/sentry-utils';

addBreadcrumb(
  'Game started',
  'game',
  { sessionId, playerCount },
  'info'
);
```

## Monitoring Dashboard

### Key Metrics to Track:

1. **Error Rate**
   - By error boundary level
   - By route/feature
   - By user segment

2. **Performance**
   - Page load times
   - API response times
   - Real-time subscription latency

3. **User Impact**
   - Unique users affected
   - Session crash rate
   - Error frequency per user

### Alerts to Configure:

1. **Critical Alerts**
   - Root error boundary triggers
   - Error rate > 1% of sessions
   - New error types in production

2. **Performance Alerts**
   - Page load > 3 seconds
   - API timeout rate > 0.1%
   - Memory usage anomalies

## Best Practices

### 1. Error Context

Always provide context when capturing errors:

```typescript
// ❌ Bad
throw new Error('Failed');

// ✅ Good
throw new Error(`Failed to load board ${boardId}: ${response.status}`);
```

### 2. User Privacy

Don't send sensitive data:

```typescript
// ❌ Bad
Sentry.setContext('user', { 
  email: user.email,
  password: user.password // NEVER!
});

// ✅ Good
Sentry.setContext('user', { 
  id: user.id,
  plan: user.subscription_tier
});
```

### 3. Fingerprinting

Group similar errors:

```typescript
scope.setFingerprint([
  'database-error',
  error.code, // e.g., 'PGRST116'
  'supabase'
]);
```

### 4. Breadcrumbs

Add breadcrumbs for user actions:

```typescript
// Before critical operations
addBreadcrumb('Starting game', 'game', { mode: 'multiplayer' });

// On state changes
addBreadcrumb('Player joined', 'game', { playerId });
```

## Testing Sentry Integration

### 1. Test Error Capture

Visit `/test-error-boundaries` and trigger errors to verify:
- Errors appear in Sentry dashboard
- Context is properly attached
- User info is present

### 2. Test Tunnel

Check Network tab:
- Sentry requests go to `/api/sentry-tunnel`
- No requests to sentry.io domains
- Errors still captured with ad blockers

### 3. Test in Development

```bash
# Enable Sentry in development
NEXT_PUBLIC_SENTRY_DEV_ENABLED=true npm run dev
```

## Common Issues

### 1. Errors Not Appearing

- Check DSN is correct
- Verify environment variables
- Check `beforeSend` isn't filtering
- Ensure tunnel is working

### 2. Missing Context

- Call `setSentryUser` on auth
- Add `addSentryContext` on init
- Check scope is properly set

### 3. High Volume

- Adjust `tracesSampleRate`
- Filter common/expected errors
- Use `ignoreErrors` config

## Maintenance

### Regular Tasks:

1. **Weekly**
   - Review new error types
   - Check error trends
   - Update fingerprinting rules

2. **Monthly**
   - Analyze performance metrics
   - Review user impact
   - Optimize sampling rates

3. **Quarterly**
   - Update Sentry SDK
   - Review ignored errors
   - Audit data retention

## Cost Management

To control Sentry costs:

1. **Sampling**
   ```typescript
   tracesSampleRate: 0.1  // Start at 10%
   replaysSessionSampleRate: 0.05  // 5% for replays
   ```

2. **Filtering**
   - Ignore expected errors
   - Filter by environment
   - Limit breadcrumb data

3. **Quotas**
   - Set monthly quotas
   - Configure spike protection
   - Use rate limiting

## Integration Checklist

- [x] Install @sentry/nextjs
- [x] Create config files (client, server, edge)
- [x] Update error boundaries
- [x] Integrate with logger
- [x] Set up tunnel endpoint
- [x] Add utility functions
- [ ] Configure environment variables (NOT DONE)
- [ ] Set up Sentry project (NOT DONE)
- [ ] Configure alerts (NOT DONE)
- [ ] Test ANYTHING (NOT DONE)
- [ ] Monitor in production (NOT DONE)

## Reality Check

### What's Actually Done:
- ✅ Code is written
- ✅ Error boundaries call Sentry
- ✅ Logger calls Sentry
- ✅ Tunnel endpoint exists

### What's NOT Done (And Will Break):
- ❌ **NO environment variables** = Sentry initialization fails silently
- ❌ **NO Sentry project** = Nowhere to send errors
- ❌ **NO testing** = No idea if any of this works
- ❌ **NO user context** = setSentryUser() never called
- ❌ **NO source maps** = Useless error stacks in production
- ❌ **NO performance baseline** = Could be killing your app speed

### Current State:
1. **Sentry adds ~50KB to your bundle**
2. **Errors show "Sentry ID: undefined" to users**
3. **Tunnel endpoint returns 401 (no project IDs)**
4. **Zero errors are being captured**
5. **You're literally shipping dead code**

## What MUST Happen Before Production:

### 1. Actually Create a Sentry Account
```bash
# This isn't automatic
# Go to sentry.io
# Sign up
# Create a project
# Get your DSN
```

### 2. Add REAL Environment Variables
```bash
# .env.local (NOT .env.example)
NEXT_PUBLIC_SENTRY_DSN=https://ACTUAL_KEY@o0.ingest.sentry.io/ACTUAL_PROJECT
SENTRY_ORG=your-actual-org
SENTRY_PROJECT=your-actual-project
SENTRY_AUTH_TOKEN=your-actual-token
SENTRY_PROJECT_IDS=your-actual-id
```

### 3. Initialize User Context (It's Manual!)
```typescript
// This doesn't happen automatically
// In your auth provider:
import { setSentryUser, addSentryContext } from '@/lib/sentry-utils';

// You need to CALL these:
useEffect(() => {
  addSentryContext(); // App init
  if (user) {
    setSentryUser(user); // On login
  }
}, [user]);
```

### 4. Test That It Actually Works
```bash
# Not optional
npm run dev
# Visit /test-error-boundaries
# Trigger ALL error types
# Check Sentry dashboard has errors
# Test with ad blocker enabled
```

### 5. Configure Source Maps
```bash
# Without this, production errors are unreadable
# Add to next.config.ts
# Configure Sentry CLI
# Test deployment process
```

## Cost Reality:

With current config:
- 10% of ALL requests tracked = $$
- Session replay on 10% of visits = $$$
- 100% replay on errors = $$$$
- No filtering = bankruptcy

**Free tier**: 5K errors/month
**Your current setup**: Could hit that in hours

## The Brutal Truth:

Right now you have:
1. **50KB of unused JavaScript**
2. **Error boundaries that log to nowhere**
3. **A tunnel that rejects everything**
4. **Zero monitoring capability**

It's like installing a security system and never turning it on. The code exists but provides ZERO value until properly configured and tested.

## Minimum Viable Sentry:

1. Create account (30 mins)
2. Add environment variables (5 mins)
3. Test basic error capture (30 mins)
4. Deploy and verify (1 hour)

Total: ~2 hours to make this actually work

Without this, you're shipping broken monitoring code that helps nobody.