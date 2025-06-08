# Redis Upstash Implementation Guide

## ✅ IMPLEMENTATION STATUS: COMPLETE

**Redis Upstash is FULLY IMPLEMENTED and production-ready in Arcadia.**

This guide documents the completed implementation of Redis Upstash in the Arcadia project. All core features are implemented including distributed caching, multiple rate limiting algorithms, and production-ready error handling.

## Implementation Overview

Redis Upstash is now fully integrated for rate limiting, caching, and session management following modern serverless patterns and CLAUDE.md compliance.

## Architecture Principles

### 1. Serverless-First Design

- Use Upstash Redis REST API for serverless compatibility
- Compatible with Vercel, Netlify, Cloudflare Workers
- No connection pooling needed (HTTP-based)

### 2. Type Safety & Validation

- All Redis operations strictly typed
- Zod validation for all Redis payloads
- ServiceResponse pattern for error handling

### 3. Service Layer Pattern

```typescript
// Service Layer - Pure functions, no state
export const redisService = {
  async get<T>(key: string): Promise<ServiceResponse<T | null>> {
    // Redis operations only
    // Validate with Zod
    // Return ServiceResponse
  },
};

// UI State - No Redis data in Zustand stores
// Server State - TanStack Query for Redis data
```

## ✅ COMPLETED IMPLEMENTATION

### ✅ Phase 1: Core Infrastructure (COMPLETE)

1. ✅ **Redis Client** (`/src/lib/redis.ts`) - Upstash Redis with singleton pattern, connection pooling, retry logic
2. ✅ **Redis Service** (`/src/services/redis.service.ts`) - Type-safe operations with Zod validation and ServiceResponse pattern
3. ✅ **Environment Configuration** - Full setup with production-ready configuration
4. ✅ **Type Definitions** - Complete TypeScript integration with zero `any` types

### ✅ Phase 2: Rate Limiting (COMPLETE)

1. ✅ **Rate Limiting Service** (`/src/services/rate-limiting.service.ts`) - Multiple algorithms:
   - API: 100 requests/minute (sliding window)
   - Auth: 5 attempts/minute (fixed window)
   - Upload: Token bucket (10 tokens, 30s refill)
   - Game sessions: 10 sessions/minute
2. ✅ **Middleware Integration** (`/src/lib/rate-limiter-middleware.ts`) - Next.js middleware with fail-open pattern
3. ✅ **API Integration** - Production routes using Redis rate limiting

### ✅ Phase 3: Distributed Caching (COMPLETE)

1. ✅ **Cache Service** (`/src/lib/cache.ts`) - Redis-based distributed caching with TTL strategies
2. ✅ **Cache Invalidation** - Pattern-based invalidation with graceful degradation
3. ✅ **Performance Optimization** - LRU cache with TTL for heavy operations
4. ✅ **Test Integration** - Comprehensive test endpoint at `/api/redis-test`

### ✅ Phase 4: Advanced Features (COMPLETE)

1. ✅ **Real-time Presence** (`/src/services/redis-presence.service.ts`) - TTL-based presence with Redis pub/sub
2. ✅ **Pub/Sub for Multiplayer** (`/src/services/redis-pubsub.service.ts`) - Event publishing with polling fallback
3. ✅ **Distributed Locks** (`/src/services/redis-locks.service.ts`) - Atomic locks with automatic expiration
4. ✅ **Queue Operations** (`/src/services/redis-queue.service.ts`) - Priority queues with retry logic

## Environment Configuration

### Required Environment Variables

```bash
# .env.local
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Optional: Analytics and monitoring
UPSTASH_REDIS_ANALYTICS=false
```

### Vercel Configuration

```bash
# Set via Vercel CLI or dashboard
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
```

## Best Practices

### 1. Client Initialization

```typescript
// ✅ Recommended: Use fromEnv() for automatic configuration
import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

// ✅ Alternative: Explicit configuration for custom setups
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

### 2. Rate Limiting Patterns

```typescript
import { Ratelimit } from '@upstash/ratelimit';

// ✅ Sliding window for API routes
const apiLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  prefix: '@arcadia/api',
  analytics: true,
});

// ✅ Fixed window for authentication
const authLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(5, '60 s'),
  prefix: '@arcadia/auth',
});
```

### 3. Error Handling

```typescript
// ✅ Use ServiceResponse pattern
export async function getRateLimitStatus(
  identifier: string
): Promise<ServiceResponse<RateLimitResponse>> {
  try {
    const result = await ratelimit.limit(identifier);

    return {
      success: true,
      data: {
        allowed: result.success,
        limit: result.limit,
        remaining: result.remaining,
        resetTime: result.reset,
      },
    };
  } catch (error) {
    log.error('Rate limit check failed', { error, identifier });

    return {
      success: false,
      error: {
        code: 'RATE_LIMIT_ERROR',
        message: 'Rate limiting temporarily unavailable',
      },
    };
  }
}
```

### 4. Key Naming Conventions

```typescript
// ✅ Consistent key prefixes
const PREFIXES = {
  RATE_LIMIT: '@arcadia/rate-limit',
  CACHE: '@arcadia/cache',
  SESSION: '@arcadia/session',
  PRESENCE: '@arcadia/presence',
  QUEUE: '@arcadia/queue',
} as const;

// ✅ Structured key formats
const createKey = (prefix: string, ...parts: string[]) =>
  `${prefix}:${parts.join(':')}`;

// Examples:
// @arcadia/rate-limit:api:user:123
// @arcadia/cache:bingo-board:abc-def-123
// @arcadia/session:game:xyz-789
```

### 5. Caching Strategy

```typescript
// ✅ TTL-based caching with fallback
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<ServiceResponse<T>> {
  try {
    // Try cache first
    const cached = await redis.get(key);
    if (cached) {
      return { success: true, data: cached as T };
    }

    // Fetch fresh data
    const fresh = await fetcher();

    // Cache with TTL
    await redis.setex(key, ttlSeconds, JSON.stringify(fresh));

    return { success: true, data: fresh };
  } catch (error) {
    log.error('Cache operation failed', { error, key });

    // Fallback to direct fetch
    try {
      const fallback = await fetcher();
      return { success: true, data: fallback };
    } catch (fetchError) {
      return {
        success: false,
        error: {
          code: 'CACHE_AND_FETCH_FAILED',
          message: 'Data unavailable',
        },
      };
    }
  }
}
```

## Integration Points

### 1. API Route Protection

```typescript
// middleware.ts
import { rateLimit } from '@/lib/redis/rate-limiting';

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { allowed } = await rateLimit.check(ip);

  if (!allowed) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  return NextResponse.next();
}
```

### 2. Session Management

```typescript
// lib/redis/sessions.ts
export const sessionService = {
  async create(
    userId: string,
    data: SessionData
  ): Promise<ServiceResponse<string>> {
    const sessionId = generateId();
    const key = createKey(PREFIXES.SESSION, sessionId);

    await redis.setex(
      key,
      SESSION_TTL,
      JSON.stringify({
        userId,
        ...data,
        createdAt: Date.now(),
      })
    );

    return { success: true, data: sessionId };
  },

  async get(sessionId: string): Promise<ServiceResponse<SessionData | null>> {
    const key = createKey(PREFIXES.SESSION, sessionId);
    const data = await redis.get(key);

    return { success: true, data: data as SessionData | null };
  },
};
```

### 3. Real-time Presence

```typescript
// lib/redis/presence.ts
export const presenceService = {
  async setOnline(
    userId: string,
    metadata: PresenceMetadata
  ): Promise<ServiceResponse<void>> {
    const key = createKey(PREFIXES.PRESENCE, userId);

    await redis.setex(
      key,
      PRESENCE_TTL,
      JSON.stringify({
        ...metadata,
        lastSeen: Date.now(),
      })
    );

    return { success: true, data: undefined };
  },

  async getOnlineUsers(
    gameId: string
  ): Promise<ServiceResponse<PresenceMetadata[]>> {
    const pattern = createKey(PREFIXES.PRESENCE, '*');
    const keys = await redis.keys(pattern);

    const users = await Promise.all(keys.map(key => redis.get(key)));

    return {
      success: true,
      data: users.filter(Boolean) as PresenceMetadata[],
    };
  },
};
```

## Performance Considerations

### 1. Connection Optimization

- Use Redis.fromEnv() for automatic connection management
- HTTP-based, no connection pooling needed
- Built-in retry and timeout handling

### 2. Data Serialization

- Use JSON for complex objects
- Consider MessagePack for high-volume data
- Compress large payloads when necessary

### 3. Memory Management

- Set appropriate TTLs for all keys
- Use EXPIRE for temporary data
- Monitor memory usage via Upstash dashboard

## Monitoring & Analytics

### 1. Built-in Analytics

```typescript
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true, // ✅ Enable Upstash analytics
});
```

### 2. Custom Metrics

```typescript
// Track Redis operations for monitoring
export async function trackOperation(operation: string, success: boolean) {
  const key = createKey('@arcadia/metrics', operation, 'count');
  await redis.incr(key);

  if (!success) {
    const errorKey = createKey('@arcadia/metrics', operation, 'errors');
    await redis.incr(errorKey);
  }
}
```

## Security Best Practices

### 1. Environment Variables

- Never commit Redis credentials to git
- Use Vercel/platform environment variables
- Rotate tokens regularly

### 2. Data Validation

- Validate all data before storing in Redis
- Use Zod schemas for type safety
- Sanitize user inputs

### 3. Access Control

- Use different Redis instances for different environments
- Implement key namespacing by feature
- Monitor access patterns via analytics

## Advanced Features Documentation

### Real-time Presence Service

```typescript
import { redisPresenceService } from '@/services/redis-presence.service';

// Join board presence
const presence = await redisPresenceService.joinBoardPresence(
  'board-123',
  'user-456',
  {
    displayName: 'John Doe',
    avatar: 'https://example.com/avatar.jpg',
  },
  {
    role: 'player',
    isHost: false,
    activity: 'playing',
  }
);

// Update presence status
await redisPresenceService.updateUserPresence('board-123', 'user-456', 'away', {
  activity: 'editing',
});

// Get all users on board
const boardPresence = await redisPresenceService.getBoardPresence('board-123');
```

### Distributed Locks Service

```typescript
import { redisLocksService } from '@/services/redis-locks.service';

// Acquire lock manually
const lock = await redisLocksService.acquireLock({
  id: 'game-initialization',
  leaseDuration: 30000, // 30 seconds
  holder: 'instance-1',
});

if (lock.success && lock.data.acquired) {
  // Critical section
  await performCriticalOperation();

  // Release lock
  await redisLocksService.releaseLock('game-initialization', 'instance-1');
}

// Use withLock helper for automatic management
const result = await redisLocksService.withLock(
  'user-session-123',
  async () => {
    // This code runs with exclusive access
    return await processUserSession();
  },
  { leaseDuration: 15000 }
);
```

### Pub/Sub Messaging Service

```typescript
import { redisPubSubService } from '@/services/redis-pubsub.service';

// Publish game event
await redisPubSubService.publishGameEvent({
  type: 'cell_marked',
  gameId: 'game-123',
  userId: 'user-456',
  data: { cellId: 'B3', value: 'marked' },
});

// Publish chat message
await redisPubSubService.publishChatMessage({
  userId: 'user-456',
  username: 'John',
  message: 'Good game everyone!',
  gameId: 'game-123',
});

// Get recent events (serverless-friendly polling)
const events = await redisPubSubService.getRecentEvents(
  'game-123',
  Date.now() - 60000
);

// Get chat history
const chatHistory = await redisPubSubService.getChatHistory('game-123', 50);
```

### Queue Operations Service

```typescript
import { redisQueueService } from '@/services/redis-queue.service';

// Add job to queue
const jobId = await redisQueueService.addJob(
  'email-notifications',
  'send-welcome-email',
  {
    userId: 'user-123',
    email: 'user@example.com',
    template: 'welcome',
  },
  {
    priority: 8,
    delay: 5000, // 5 second delay
    maxAttempts: 3,
  }
);

// Process jobs
await redisQueueService.processJobs('email-notifications', async job => {
  // Process the job
  await sendEmail(job.payload);
  return { emailSent: true };
});

// Get queue statistics
const stats = await redisQueueService.getQueueStats('email-notifications');
console.log(stats.data); // { pending: 5, processing: 2, completed: 10, failed: 1 }
```

### Integration Example

```typescript
// Complete multiplayer game session example
import {
  redisLocksService,
  redisPresenceService,
  redisPubSubService,
  redisQueueService,
} from '@/services';

async function initializeGameSession(gameId: string, hostUserId: string) {
  // 1. Acquire lock for game initialization
  return await redisLocksService.withLock(
    `game-init-${gameId}`,
    async () => {
      // 2. Join presence as host
      const presence = await redisPresenceService.joinBoardPresence(
        gameId,
        hostUserId,
        { displayName: 'Game Host' },
        { role: 'host', isHost: true }
      );

      // 3. Publish game start event
      await redisPubSubService.publishGameEvent({
        type: 'game_start',
        gameId,
        userId: hostUserId,
        data: { maxPlayers: 4, timeLimit: 1800 },
      });

      // 4. Queue background tasks
      await redisQueueService.addJob(
        'game-tasks',
        'setup-game-data',
        { gameId, hostUserId },
        { priority: 8 }
      );

      return {
        gameId,
        cleanup: presence.data?.cleanup,
      };
    },
    { leaseDuration: 30000 }
  );
}
```

## ✅ PRODUCTION DEPLOYMENT

### Setup Steps (Required for Production)

1. **Create Upstash Redis Database**

   ```bash
   # Visit https://console.upstash.com/redis
   # Create new database
   # Copy URL and token
   ```

2. **Configure Environment Variables**

   ```bash
   # .env.local
   UPSTASH_REDIS_REST_URL=https://your-database-url.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token-here
   ```

3. **Test Implementation**

   ```bash
   # Test basic Redis functionality
   curl http://localhost:3000/api/redis-test

   # Test advanced features
   curl http://localhost:3000/api/redis-advanced-test

   # Test specific feature
   curl http://localhost:3000/api/redis-advanced-test?feature=locks
   curl http://localhost:3000/api/redis-advanced-test?feature=presence
   curl http://localhost:3000/api/redis-advanced-test?feature=pubsub
   curl http://localhost:3000/api/redis-advanced-test?feature=queue
   ```

4. **Deploy to Production**
   ```bash
   # Set environment variables on your platform
   vercel env add UPSTASH_REDIS_REST_URL
   vercel env add UPSTASH_REDIS_REST_TOKEN
   vercel deploy
   ```

## ✅ MIGRATION STATUS: COMPLETE

### Presence Service Migration

The migration from Supabase-based presence to Redis-based presence is **COMPLETE**. All presence functionality now uses the Redis implementation through a backward-compatible wrapper:

- **Redis Presence Service** (`redis-presence.service.ts`) - Core Redis implementation with TTL-based tracking
- **Unified Presence Service** (`presence-unified.service.ts`) - Backward-compatible wrapper maintaining existing APIs
- **All Components Updated** - Hooks and components use the unified service transparently

No additional migration work is required. The system is fully operational with Redis-based presence tracking.

### Future Enhancements

#### Performance Monitoring (Future - Requires Paid Tier)

While basic Redis operations are fully implemented, advanced monitoring capabilities are available in Upstash's paid tiers:

1. **Prometheus Metrics Integration**

   - Real-time performance metrics via `/monitoring/prometheus` endpoint
   - Latency tracking, command distribution, and throughput analysis
   - Integration with Grafana dashboards

2. **Built-in Analytics Dashboard**

   - Request patterns and usage analytics
   - Performance bottleneck identification
   - Historical data analysis

3. **Custom Metrics Collection**
   - Application-specific metric tracking
   - Business metric correlation with Redis operations
   - Alert configuration for anomalies

**Note**: These monitoring features require an Upstash paid plan. For free tier usage, basic logging and error tracking through our existing Sentry integration provides sufficient observability.

### Implemented Features Summary

All planned Redis features are now fully implemented:

- ✅ Core Redis operations with type safety
- ✅ Multiple rate limiting algorithms
- ✅ Distributed caching with invalidation
- ✅ Real-time presence tracking
- ✅ Pub/Sub messaging
- ✅ Distributed locks
- ✅ Priority queue system

## References

- [Upstash Redis Docs](https://upstash.com/docs/redis)
- [Rate Limiting SDK](https://upstash.com/docs/redis/sdks/ratelimit-ts)
- [Next.js Integration](https://upstash.com/docs/redis/quickstarts/nextjs)
- [Vercel Deployment](https://upstash.com/docs/redis/quickstarts/vercel-functions)
