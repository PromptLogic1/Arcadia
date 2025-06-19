# Community Feature Tests

This directory contains unit tests for the Community feature, migrated from E2E tests to focus on business logic testing.

## Test Structure

### Core Business Logic Tests

- **`moderation.test.ts`** - Content moderation algorithms, spam detection, user trust levels
- **`search-service.test.ts`** - Search algorithms, filtering, ranking, and performance
- **`permissions.test.ts`** - User permissions, rate limiting, access control
- **`notification-triggers.test.ts`** - Notification logic, batching, preferences

### Supporting Files

- **`mocks/index.ts`** - Mock implementations for external services
- **`factories/index.ts`** - Test data factories for consistent test data
- **`setup.ts`** - Global test setup and custom matchers
- **`vitest.config.ts`** - Vitest configuration for Community tests

## Business Logic Extracted

### 1. Content Moderation (`moderation.test.ts`)

**From E2E Tests:**

- Spam detection with ML-like confidence scoring
- Rate limiting algorithms (sliding window, token bucket)
- Content filtering and sanitization
- User trust level calculations
- Permission matrix enforcement

**Key Functions Tested:**

- `calculateSpamScore()` - Detects spam patterns with confidence levels
- `moderateContent()` - Applies moderation actions based on user trust
- Pattern matching for multilingual spam, gaming context
- XSS prevention and content sanitization

### 2. Search & Discovery (`search-service.test.ts`)

**From E2E Tests:**

- Complex multi-filter search capabilities
- Search term parsing (quotes, exclusions, operators)
- Result ranking and relevance scoring
- Performance optimization for large datasets

**Key Functions Tested:**

- `parseSearchTerms()` - Handles quoted phrases and exclusions
- `searchDiscussions()` - Performs content search with scoring
- `filterDiscussions()` - Applies filters and sorting
- `rankSearchResults()` - Relevance-based ranking

### 3. Permission System (`permissions.test.ts`)

**From E2E Tests:**

- User trust level calculation
- Action-based permission checking
- Rate limiting with different algorithms
- Context-sensitive permissions

**Key Functions Tested:**

- `getUserTrustLevel()` - Calculates trust based on reputation, age, violations
- `canUserPerformAction()` - Checks permissions for specific actions
- `enforceRateLimits()` - Implements sliding window rate limiting
- Permission inheritance and temporary overrides

### 4. Notification System (`notification-triggers.test.ts`)

**From E2E Tests:**

- Smart notification batching
- User preference handling
- Multi-channel delivery (email, push, in-app)
- Quiet hours and priority levels

**Key Functions Tested:**

- `triggerNotification()` - Creates and sends notifications
- `batchNotifications()` - Groups similar notifications
- `shouldSendNotification()` - Respects user preferences
- Content formatting and localization

## Mock Strategy

### Service Mocks

- **Supabase Client** - Database operations
- **Rate Limiter** - Redis-based rate limiting
- **Notification Service** - Email, push, and in-app notifications
- **Cache Service** - Distributed caching
- **Search Service** - Full-text search

### User Scenarios

Pre-configured user profiles for different trust levels:

- New user (limited permissions)
- Regular user (standard permissions)
- Trusted user (enhanced permissions)
- Moderator (full permissions)
- Banned user (read-only)

## Test Data Factories

### Factory Functions

- `createMockDiscussion()` - Generates realistic discussion data
- `createMockComment()` - Creates comment with threading support
- `createMockUser()` - User profiles with varying trust levels
- `createTestScenario.popularDiscussion()` - Pre-built scenarios

### Batch Factories

- `createMockDiscussions(count)` - Bulk discussion generation
- `createMockCommentThread(depth, children)` - Nested comment trees
- Test scenarios for specific edge cases

## Custom Matchers

```typescript
expect(discussion).toBeValidDiscussion();
expect(comment).toBeValidComment();
expect(spamResult).toHaveSpamScore(0.8);
expect(rateLimitResult).toBeWithinRateLimit();
```

## Running Tests

```bash
# Run all Community tests
npm run test:community

# Run specific test file
npm run test src/features/Community/test/moderation.test.ts

# Run with coverage
npm run test:coverage src/features/Community/test/

# Watch mode for development
npm run test:watch src/features/Community/test/
```

## Integration with CI/CD

These tests are designed to:

- Run quickly (< 30 seconds total)
- Be deterministic and reliable
- Provide comprehensive coverage of business logic
- Catch regressions in core algorithms

## Migration Benefits

### Before (E2E Tests)

- ❌ Slow execution (5+ minutes)
- ❌ Flaky due to UI interactions
- ❌ Limited coverage of edge cases
- ❌ Difficult to debug failures

### After (Unit Tests)

- ✅ Fast execution (< 30 seconds)
- ✅ Reliable and deterministic
- ✅ Comprehensive edge case testing
- ✅ Easy to debug and maintain
- ✅ Better test isolation
- ✅ Mocked external dependencies

## Future Enhancements

1. **Performance Testing** - Add benchmarks for search and moderation
2. **Load Testing** - Test rate limiting under high concurrency
3. **Accessibility Testing** - Validate ARIA compliance
4. **Security Testing** - Advanced XSS and injection testing
5. **Internationalization** - Multi-language content handling

## Contributing

When adding new Community features:

1. Add corresponding unit tests for business logic
2. Update mocks and factories as needed
3. Ensure test coverage meets 80% threshold
4. Add any new custom matchers to `setup.ts`
5. Update this README with new test descriptions
