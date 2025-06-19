# Shared Services Test Infrastructure

This directory contains the core testing infrastructure and utilities for the Arcadia project. It provides a foundation for consistent, type-safe, and maintainable testing across all features.

## Overview

The test infrastructure is designed to:

- Provide reusable mocks and test data factories
- Ensure type safety in all test scenarios
- Standardize testing patterns across the codebase
- Support comprehensive edge case testing
- Enable efficient test setup and teardown

## Structure

```
src/lib/test/
├── README.md                     # This file
├── mocks/
│   └── supabase.mock.ts         # Supabase client mocks
├── factories/
│   └── index.ts                 # Test data factories
├── test-utils.ts                # Common testing utilities
├── api-handlers.test.ts         # ServiceResponse pattern tests
├── date-utils.test.ts           # Date utility function tests
├── validation-helpers.test.ts    # Runtime validation tests
└── type-guards.test.ts          # Type guard tests

src/services/test/
└── service-response.test.ts     # Service layer pattern tests
```

## Key Components

### Supabase Mocks (`mocks/supabase.mock.ts`)

Provides comprehensive mocking for Supabase operations:

```typescript
import {
  createMockSupabaseClient,
  MockQueryBuilder,
} from '@/lib/test/mocks/supabase.mock';

const mockSupabase = createMockSupabaseClient();
// Use in your tests...
```

**Features:**

- Type-safe mock implementations
- Chainable query builder methods
- Realistic response patterns
- Error simulation capabilities

### Test Data Factories (`factories/index.ts`)

Generates consistent test data:

```typescript
import { factories } from '@/lib/test/factories';

const user = factories.user({ email: 'custom@example.com' });
const board = factories.bingoBoard({ difficulty: 'hard' });
const { board, cards } = factories.boardWithCards();
```

**Available Factories:**

- `user()` - User data
- `bingoBoard()` - Bingo boards
- `bingoCard()` - Bingo cards
- `bingoSession()` - Game sessions
- `sessionPlayer()` - Session participants
- `boardWithCards()` - Complex board + cards
- `sessionWithPlayers()` - Session + players

### Test Utilities (`test-utils.ts`)

Common testing helpers:

```typescript
import { render, expectServiceSuccess, mockFetch } from '@/lib/test/test-utils';

// Custom render with providers
const { getByText } = render(<MyComponent />);

// Service response assertions
expectServiceSuccess(response);

// Mock network requests
const fetchMock = mockFetch([
  { url: '/api/users', response: { users: [] } }
]);
```

## Testing Patterns

### Service Layer Testing

All services should follow the ServiceResponse pattern:

```typescript
describe('UserService', () => {
  let mockSupabase: MockSupabaseClient;
  let service: UserService;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new UserService(mockSupabase);
  });

  it('should return user data', async () => {
    const mockUser = factories.user();
    // Setup mock...

    const result = await service.getUser(mockUser.id);
    expectServiceSuccess(result);
    expect(result.data).toEqual(mockUser);
  });
});
```

### Component Testing

Use the custom render function with providers:

```typescript
import { render, screen } from '@/lib/test/test-utils';

describe('UserProfile', () => {
  it('should display user information', () => {
    const user = factories.user();
    render(<UserProfile user={user} />);

    expect(screen.getByText(user.username)).toBeInTheDocument();
  });
});
```

### Validation Testing

Test runtime validation thoroughly:

```typescript
import { validateUserData } from '@/lib/validation/validators';

describe('validateUserData', () => {
  it('should validate correct user data', () => {
    const user = factories.user();
    const result = validateUserData(user);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(user);
  });

  it('should reject invalid data', () => {
    const result = validateUserData({ invalid: 'data' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing required fields');
  });
});
```

## Mock Patterns

### Supabase Query Mocking

```typescript
// Mock successful query
const mockFrom = mockSupabase.from as jest.Mock;
mockFrom.mockReturnValue({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue(createSupabaseSuccessResponse(mockUser)),
});

// Mock error response
mockFrom.mockReturnValue({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest
    .fn()
    .mockResolvedValue(
      createSupabaseErrorResponse('User not found', 'PGRST116')
    ),
});
```

### Zustand Store Mocking

```typescript
import { createMockZustandStore } from '@/lib/test/test-utils';

const mockStore = createMockZustandStore({
  user: null,
  isLoading: false,
});

// Use mockStore.setState() to update state in tests
```

## Best Practices

### 1. Use Factories for Test Data

❌ **Don't create data inline:**

```typescript
const user = {
  id: 'test-id',
  email: 'test@example.com',
  // ... many fields
};
```

✅ **Use factories:**

```typescript
const user = factories.user({ email: 'test@example.com' });
```

### 2. Test Both Success and Error Cases

❌ **Only test happy path:**

```typescript
it('should get user', async () => {
  const result = await service.getUser('123');
  expect(result.success).toBe(true);
});
```

✅ **Test all scenarios:**

```typescript
it('should get user successfully', async () => {
  // Setup success mock...
  const result = await service.getUser('123');
  expectServiceSuccess(result);
});

it('should handle user not found', async () => {
  // Setup error mock...
  const result = await service.getUser('invalid');
  expectServiceError(result, 'User not found');
});
```

### 3. Use Type Guards and Assertions

✅ **Leverage type safety:**

```typescript
const result = await service.getUser('123');
if (result.success) {
  // TypeScript knows result.data is not null
  expect(result.data.email).toBe('test@example.com');
}
```

### 4. Reset State Between Tests

```typescript
beforeEach(() => {
  resetIdCounter(); // Reset factory counters
  setupSupabaseMock(mockSupabase); // Reset all mocks
});
```

### 5. Test Edge Cases

```typescript
describe('edge cases', () => {
  it('should handle empty arrays', () => {
    // Test with []
  });

  it('should handle null values', () => {
    // Test with null
  });

  it('should handle malformed data', () => {
    // Test with invalid input
  });
});
```

## Performance Testing

Use the performance utility for benchmarking:

```typescript
import { measurePerformance } from '@/lib/test/test-utils';

it('should perform well with large datasets', async () => {
  const results = await measurePerformance(async () => {
    await service.processLargeDataset();
  }, 50);

  expect(results.average).toBeLessThan(100); // < 100ms average
});
```

## Integration with Other Agents

Other development agents can leverage this infrastructure:

1. **Import test utilities:**

   ```typescript
   import { factories, render, expectServiceSuccess } from '@/lib/test/...';
   ```

2. **Use established patterns:**

   - Follow ServiceResponse testing pattern
   - Use factories for all test data
   - Mock Supabase consistently

3. **Extend as needed:**
   - Add new factories to `factories/index.ts`
   - Add new mock patterns to `mocks/`
   - Add new utilities to `test-utils.ts`

## Common Issues and Solutions

### 1. Mock Not Working

**Problem:** Mock returns real data instead of mock data.

**Solution:** Ensure mock is set up before the service call:

```typescript
beforeEach(() => {
  setupSupabaseMock(mockSupabase);
  // Set up specific mocks here
});
```

### 2. Type Errors in Tests

**Problem:** TypeScript errors with mock data.

**Solution:** Use factories which provide correct types:

```typescript
const user = factories.user(); // Properly typed
```

### 3. Test Data Conflicts

**Problem:** Tests interfere with each other.

**Solution:** Reset counters and clean up:

```typescript
beforeEach(() => {
  resetIdCounter();
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test files
npm test -- --testPathPattern="test-utils"
```

## Contributing

When adding new test utilities:

1. Follow existing patterns and naming conventions
2. Add comprehensive JSDoc comments
3. Include usage examples
4. Update this README
5. Ensure type safety throughout

This infrastructure is designed to grow with the project while maintaining consistency and quality across all tests.
