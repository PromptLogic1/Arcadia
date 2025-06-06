# API Rate Limiting Strategy

## Overview

This document outlines the rate limiting strategy implemented across all API routes in the Arcadia application. Rate limiting is critical for:

- Preventing abuse and DDoS attacks
- Ensuring fair resource usage
- Maintaining API stability
- Protecting against brute force attacks

## Implementation Status

### ✅ Completed

- Basic rate limiter class created
- Rate limiting added to critical routes:
  - `/api/discussions` (GET/POST)
  - `/api/bingo/sessions` (POST)
  - `/api/bingo/sessions/join-by-code` (POST)
  - `/api/bingo/sessions/[id]/mark-cell` (POST)
  - `/api/bingo/sessions/[id]/complete` (POST)
  - `/api/submissions` (POST)
- Advanced rate limiting middleware created

### ❌ TODO

- Migrate all routes to use the new middleware
- Implement Redis-based storage for production
- Add user-based rate limiting (in addition to IP-based)
- Implement sliding window algorithm
- Add rate limit bypass for admin users

## Rate Limit Configurations

### Authentication Routes

- **Limit**: 5 requests per 15 minutes
- **Routes**: Login, signup, password reset
- **Reason**: Prevent brute force attacks

### Data Creation Routes

- **Limit**: 10 requests per minute
- **Routes**: Create board, create discussion, create session
- **Reason**: Prevent spam while allowing legitimate usage

### Data Reading Routes

- **Limit**: 30 requests per minute
- **Routes**: GET boards, GET discussions, GET sessions
- **Reason**: Allow frequent reads while preventing scraping

### Game Action Routes

- **Limit**: 60 requests per minute
- **Routes**: Mark cell, join session, update game state
- **Reason**: Support real-time gameplay without abuse

### Expensive Operations

- **Limit**: 3 requests per 5 minutes
- **Routes**: AI generation, bulk operations
- **Reason**: Protect server resources

## Headers

All rate-limited responses include:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1640995200000
Retry-After: 45 (only on 429 responses)
```

## Error Response

When rate limit is exceeded:

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again in 45 seconds.",
  "retryAfter": 45
}
```

Status Code: `429 Too Many Requests`

## Implementation Example

### Using the Simple Rate Limiter

```typescript
import { RateLimiter } from '@/lib/rate-limiter';

const rateLimiter = new RateLimiter();

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (await rateLimiter.isLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Handle request...
}
```

### Using the Advanced Middleware

```typescript
import {
  createRateLimitedHandler,
  RATE_LIMIT_CONFIGS,
} from '@/lib/rate-limiter-middleware';

export const POST = createRateLimitedHandler(
  RATE_LIMIT_CONFIGS.create,
  async request => {
    // Handle request...
  }
);
```

## Production Considerations

### Current Implementation

- In-memory storage (not suitable for multiple instances)
- IP-based identification only
- Fixed window algorithm

### Production Requirements

1. **Redis Storage**: Implement Redis adapter for distributed rate limiting
2. **User-based Limits**: Add authenticated user rate limits
3. **Sliding Window**: Implement sliding window for smoother rate limiting
4. **Custom Keys**: Support custom key generation (user ID + IP)
5. **Monitoring**: Add metrics and alerting for rate limit violations

### Redis Implementation (TODO)

```typescript
// Example Redis-based rate limiter
class RedisRateLimiter {
  constructor(private redis: Redis) {}

  async checkLimit(
    key: string,
    limit: number,
    window: number
  ): Promise<boolean> {
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, window);
    }
    return current <= limit;
  }
}
```

## Security Best Practices

1. **Always validate IP addresses**: Use multiple headers to prevent spoofing
2. **Implement gradual backoff**: Increase delays for repeat offenders
3. **Log violations**: Track and analyze rate limit violations
4. **Whitelist trusted IPs**: Allow higher limits for known good actors
5. **Implement CAPTCHA**: Add CAPTCHA for repeated violations

## Monitoring

Track these metrics:

- Rate limit violations per endpoint
- Unique IPs hitting limits
- Average request rate per endpoint
- Peak traffic times
- Suspicious patterns (distributed attacks)

## Future Enhancements

1. **Dynamic Limits**: Adjust limits based on server load
2. **Tiered Limits**: Different limits for free/premium users
3. **Cost-based Limiting**: Limit based on computational cost
4. **Geo-based Rules**: Different limits for different regions
5. **Machine Learning**: Detect and prevent sophisticated attacks
