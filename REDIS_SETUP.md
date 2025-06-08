# Redis Upstash Setup - Quick Start Guide

## 🚀 What's Been Implemented

I've implemented a minimal but complete Redis Upstash setup for the Arcadia project following best practices:

### ✅ Completed Features

1. **Redis Client Configuration** (`src/lib/redis.ts`)
2. **Basic Redis Service** (`src/services/redis.service.ts`)
3. **Rate Limiting Service** (`src/services/rate-limiting.service.ts`)
4. **Test API Route** (`src/app/api/redis-test/route.ts`)
5. **Comprehensive Implementation Guide** (`docs/guides/REDIS_UPSTASH_IMPLEMENTATION.md`)

## 🔧 Next Steps to Get Started

### 1. Set Up Upstash Redis Database

1. Go to [https://console.upstash.com/redis](https://console.upstash.com/redis)
2. Create a new Redis database
3. Copy the REST URL and Token from the database details

### 2. Configure Environment Variables

Update `.env.local` with your Upstash credentials:

```bash
# Replace these with your actual Upstash values
UPSTASH_REDIS_REST_URL=https://active-hen-47300.upstash.io
UPSTASH_REDIS_REST_TOKEN=AbjEAAIjcDFjMDI1ODliYmI0NTk0ZmQzOTRkMjU3OWMxYWNkNWJmYnAxMA
```

### 3. Test the Implementation

Run the development server:

```bash
npm run dev
```

Test the Redis setup:

```bash
# Test GET endpoint (basic Redis operations + rate limiting)
curl http://localhost:3000/api/redis-test

# Test POST endpoint (counters + auth rate limiting)
curl -X POST http://localhost:3000/api/redis-test
```

## 📋 What Each Service Does

### Redis Service (`redis.service.ts`)

- **Basic operations**: set, get, delete, exists, increment, expire
- **Cache service**: getOrSet pattern with TTL
- **Error handling**: ServiceResponse pattern with proper logging

### Rate Limiting Service (`rate-limiting.service.ts`)

- **API Rate Limiting**: 100 requests/minute (sliding window)
- **Auth Rate Limiting**: 5 attempts/minute (fixed window)
- **Upload Rate Limiting**: Token bucket for burst handling
- **Game Session Limiting**: 10 sessions/minute

### Test API Route (`api/redis-test/route.ts`)

- Tests Redis connection
- Demonstrates basic operations
- Shows rate limiting in action
- Returns comprehensive test results

## 🎯 Perfect Starting Point

This implementation provides:

- ✅ **Type Safety**: All operations strictly typed
- ✅ **Error Handling**: ServiceResponse pattern
- ✅ **Logging**: Comprehensive logging with Sentry integration
- ✅ **Rate Limiting**: Multiple strategies for different use cases
- ✅ **Caching**: LRU cache patterns with TTL
- ✅ **Testing**: Working test endpoint to verify setup

## 🔄 How to Scale Up

### Immediate Next Steps:

1. **Configure environment variables** with your Upstash credentials
2. **Test the setup** using the API endpoints
3. **Integrate rate limiting** into existing API routes
4. **Add caching** to expensive operations

### Future Enhancements:

1. **Session Management**: User sessions in Redis
2. **Real-time Presence**: Online user tracking
3. **Queue System**: Background job processing
4. **Analytics**: Custom metrics and monitoring

## 🛠 Usage Examples

### Basic Caching

```typescript
import { cacheService } from '@/services';

const cached = await cacheService.getOrSet(
  cacheService.createKey('bingo-boards', userId),
  () => fetchUserBoards(userId),
  300 // 5 minutes TTL
);
```

### Rate Limiting API Routes

```typescript
import { withRateLimit } from '@/services';

export async function POST(request: NextRequest) {
  return withRateLimit(
    request,
    async () => {
      // Your API logic here
      return await createGameSession(data);
    },
    'gameSession' // Use game session rate limiting
  );
}
```

### Direct Redis Operations

```typescript
import { redisService } from '@/services';

// Store user preference
await redisService.set(
  `user:${userId}:preferences`,
  userPreferences,
  86400 // 24 hours
);

// Get user preference
const prefs = await redisService.get(`user:${userId}:preferences`);
```

## 📚 Documentation

- **Full Implementation Guide**: `docs/guides/REDIS_UPSTASH_IMPLEMENTATION.md`
- **Rate Limiting Docs**: [Upstash Ratelimit](https://upstash.com/docs/redis/sdks/ratelimit-ts)
- **Redis Client Docs**: [Upstash Redis](https://upstash.com/docs/redis/sdks/ts)

---

**Ready to use!** Just configure your environment variables and you'll have a production-ready Redis setup that scales perfectly from this minimal example. 🎉
