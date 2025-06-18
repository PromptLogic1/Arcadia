# Agent A5: Infrastructure Test Migration

## Overview
Extract error handling, resilience, and performance monitoring logic from E2E tests into unit and integration tests.

## Current E2E Tests to Analyze
- `/tests/infrastructure/error-boundaries.spec.ts`
- `/tests/infrastructure/async-error-boundaries.spec.ts`
- `/tests/infrastructure/redis-resilience.spec.ts`
- `/tests/infrastructure/network-failures.spec.ts`
- `/tests/infrastructure/performance-monitoring.spec.ts`
- `/tests/infrastructure/api-errors.spec.ts`

## Business Logic to Extract

### 1. Error Boundary Logic (Unit Tests)
**From**: `error-boundaries.spec.ts`, `async-error-boundaries.spec.ts`
**Extract to**: `src/lib/error-handling/test/unit/error-boundaries.test.ts`
- Error classification logic
- Error recovery strategies
- Fallback component logic
- Error logging decisions
- User message generation

### 2. Redis Resilience (Unit Tests)
**From**: `redis-resilience.spec.ts`
**Extract to**: `src/lib/redis/test/unit/resilience.test.ts`
- Connection retry logic
- Circuit breaker patterns
- Fallback strategies
- Queue management
- Connection pooling logic

### 3. API Error Handling (Unit Tests)
**From**: `api-errors.spec.ts`
**Extract to**: `src/lib/api/test/unit/error-handling.test.ts`
- HTTP status code mapping
- Error response formatting
- Retry logic
- Rate limit handling
- Timeout handling

### 4. Performance Monitoring (Unit Tests)
**From**: `performance-monitoring.spec.ts`
**Extract to**: `src/lib/monitoring/test/unit/performance.test.ts`
- Metric collection logic
- Threshold calculations
- Alert triggering logic
- Performance budgets
- Metric aggregation

### 5. Network Resilience (Integration Tests)
**From**: `network-failures.spec.ts`
**Extract to**: `src/lib/network/test/integration/resilience.test.ts`
- Offline detection
- Request queuing
- Sync strategies
- Cache fallbacks
- Progressive enhancement

## Test Structure to Create

```
src/lib/
├── error-handling/test/
│   └── unit/
│       ├── error-boundaries.test.ts
│       ├── error-classification.test.ts
│       └── recovery-strategies.test.ts
├── redis/test/
│   ├── unit/
│   │   ├── resilience.test.ts
│   │   ├── circuit-breaker.test.ts
│   │   └── connection-pool.test.ts
│   └── integration/
│       └── redis-failover.test.ts
├── api/test/
│   └── unit/
│       ├── error-handling.test.ts
│       ├── retry-logic.test.ts
│       └── rate-limiting.test.ts
└── monitoring/test/
    └── unit/
        ├── performance.test.ts
        ├── metrics.test.ts
        └── alerting.test.ts
```

## Implementation Steps

1. **Extract error boundary logic**
   - Test error classification
   - Test recovery strategies
   - Test fallback rendering
2. **Extract Redis resilience**
   - Test retry mechanisms
   - Test circuit breakers
   - Test connection pools
3. **Extract API error handling**
   - Test status code handling
   - Test retry logic
   - Test error formatting
4. **Extract monitoring logic**
   - Test metric collection
   - Test threshold detection
   - Test alert triggers
5. **Update E2E tests**
   - Keep critical path tests
   - Test user-visible errors
   - Remove implementation tests

## E2E Tests to Keep (Simplified)
- Application handles network offline
- Error boundaries show user-friendly messages
- API errors don't crash application
- Performance degradation is handled
- Redis failures don't break app

## Success Criteria
- All error handling logic unit tested
- Resilience patterns tested in isolation
- Monitoring logic has predictable tests
- E2E tests reduced by 75% in size
- Infrastructure code has 90%+ coverage

## Priority: HIGH
Critical for application stability and reliability.