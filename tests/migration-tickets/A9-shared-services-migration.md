# Agent A9: Shared Services Test Migration

## Overview
Extract shared utilities, services, and cross-cutting concerns from E2E tests into unit and integration tests.

## Current E2E Tests to Analyze
- Tests using shared services across features
- Validation utilities used in multiple places
- Common UI patterns and behaviors
- Shared state management logic
- Cross-feature integrations

## Business Logic to Extract

### 1. Validation Utilities (Unit Tests)
**From**: Various E2E tests using validation
**Extract to**: `src/lib/validation/test/unit/`
- Zod schema validation tests
- Common validation patterns
- Error message formatting
- Custom validators
- Composite validations

### 2. Service Response Handling (Unit Tests)
**From**: API interaction tests
**Extract to**: `src/lib/services/test/unit/`
- ServiceResponse utilities
- Error transformation logic
- Success/failure handling
- Type narrowing helpers
- Response mapping

### 3. Cache Management (Unit Tests)
**From**: Tests involving caching
**Extract to**: `src/lib/cache/test/unit/`
- Cache key generation
- TTL calculations
- Invalidation patterns
- Cache warming logic
- Stale-while-revalidate

### 4. Logger and Monitoring (Unit Tests)
**From**: Error and monitoring tests
**Extract to**: `src/lib/logger/test/unit/`
- Log level filtering
- Error serialization
- Context enrichment
- Performance tracking
- Metric collection

### 5. UI Store Patterns (Unit Tests)
**From**: Tests involving Zustand stores
**Extract to**: `src/lib/stores/test/unit/`
- Store initialization
- State persistence
- Middleware behavior
- Selector patterns
- Action composition

## Test Structure to Create

```
src/lib/
├── validation/test/unit/
│   ├── schemas.test.ts
│   ├── validators.test.ts
│   └── error-formatting.test.ts
├── services/test/unit/
│   ├── service-response.test.ts
│   ├── error-handling.test.ts
│   └── type-guards.test.ts
├── cache/test/
│   ├── unit/
│   │   ├── cache-keys.test.ts
│   │   ├── ttl-logic.test.ts
│   │   └── invalidation.test.ts
│   └── integration/
│       └── redis-cache.test.ts
├── logger/test/unit/
│   ├── log-levels.test.ts
│   ├── error-serialization.test.ts
│   └── context.test.ts
└── stores/test/unit/
    ├── store-patterns.test.ts
    ├── persistence.test.ts
    └── middleware.test.ts
```

## Implementation Steps

1. **Extract validation logic**
   - Test all shared schemas
   - Test custom validators
   - Test error formatting
2. **Extract service patterns**
   - Test response handling
   - Test error transformation
   - Test type guards
3. **Extract cache logic**
   - Test key generation
   - Test TTL logic
   - Test invalidation
4. **Extract logging logic**
   - Test log filtering
   - Test serialization
   - Test context handling
5. **Update E2E tests**
   - Remove utility testing
   - Focus on integration
   - Keep user flows

## Shared Patterns to Test

### 1. Form Handling Pattern
```typescript
// Test form validation composition
// Test error display logic
// Test submission handling
```

### 2. API Call Pattern
```typescript
// Test loading states
// Test error handling
// Test retry logic
```

### 3. Real-time Update Pattern
```typescript
// Test subscription management
// Test conflict resolution
// Test reconnection logic
```

### 4. Permission Check Pattern
```typescript
// Test role-based access
// Test feature flags
// Test conditional rendering
```

## Success Criteria
- All shared utilities have unit tests
- Service patterns tested in isolation
- Cache logic fully tested
- Logger behavior predictable
- Store patterns documented and tested

## Priority: HIGH
Foundation for all other features - should be migrated early.

## Special Considerations
- These tests enable other agents' work
- Should be migrated in parallel with A1
- Create shared test utilities for other agents
- Document patterns for consistency