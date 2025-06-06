# Testing Guide

## Current State

⚠️ **WARNING**: The project currently has **0% test coverage**. This guide outlines how testing _should_ be implemented.

## Testing Strategy

### Test Types

1. **Unit Tests**: Individual functions and components
2. **Integration Tests**: Feature workflows
3. **E2E Tests**: Full user journeys
4. **Performance Tests**: Load and response times

### Testing Stack

- **Jest**: Test runner and framework
- **React Testing Library**: Component testing
- **MSW**: API mocking
- **Playwright**: E2E testing (planned)

## Writing Tests

### Service Layer Tests

Services should have 100% test coverage:

```typescript
// src/services/__tests__/auth.service.test.ts
import { authService } from '../auth.service';
import { createClient } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('should handle successful login', async () => {
      const mockSupabase = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { user: { id: '123' }, session: {} },
            error: null,
          }),
        },
      };
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('should handle login errors', async () => {
      const mockSupabase = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Invalid credentials' },
          }),
        },
      };
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'wrong',
      });

      expect(result.user).toBeNull();
      expect(result.error).toBe('Invalid credentials');
    });
  });
});
```

### Component Tests

Test components with React Testing Library:

```typescript
// src/components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../ui/button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});
```

### Hook Tests

Test custom hooks with @testing-library/react-hooks:

```typescript
// src/hooks/__tests__/useDebounce.test.ts
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  jest.useFakeTimers();

  it('should debounce value updates', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    // Update the value
    rerender({ value: 'updated', delay: 500 });

    // Value shouldn't change immediately
    expect(result.current).toBe('initial');

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Now value should be updated
    expect(result.current).toBe('updated');
  });
});
```

### Store Tests

Test Zustand stores:

```typescript
// src/lib/stores/__tests__/auth-store.test.ts
import { useAuthStore } from '../auth-store';

describe('AuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, session: null });
  });

  it('should set user', () => {
    const user = { id: '123', email: 'test@example.com' };

    useAuthStore.getState().setUser(user);

    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('should clear auth state', () => {
    useAuthStore.setState({
      user: { id: '123', email: 'test@example.com' },
      session: { access_token: 'token' },
    });

    useAuthStore.getState().clearAuth();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().session).toBeNull();
  });
});
```

## Running Tests

### Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.service.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should handle login"
```

### Coverage Reports

Generate and view coverage reports:

```bash
npm test -- --coverage --coverageReporters=html
open coverage/index.html
```

## Test Organization

### File Structure

```
src/
├── components/
│   └── __tests__/
│       └── Button.test.tsx
├── features/
│   └── auth/
│       └── __tests__/
│           ├── LoginForm.test.tsx
│           └── auth-utils.test.ts
├── hooks/
│   └── __tests__/
│       └── useDebounce.test.ts
├── services/
│   └── __tests__/
│       └── auth.service.test.ts
└── lib/
    └── stores/
        └── __tests__/
            └── auth-store.test.ts
```

### Naming Conventions

- Test files: `*.test.ts(x)` or `*.spec.ts(x)`
- Test directories: `__tests__`
- Test descriptions: Use descriptive names
- Use `describe` blocks for grouping
- Start test names with "should" for clarity

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// ❌ Bad - Testing implementation details
it('calls setState with new value', () => {
  // ...
});

// ✅ Good - Testing behavior
it('should update user profile when form is submitted', () => {
  // ...
});
```

### 2. Use Proper Assertions

```typescript
// ❌ Bad - Vague assertions
expect(result).toBeTruthy();

// ✅ Good - Specific assertions
expect(result.user.email).toBe('test@example.com');
expect(result.error).toBeNull();
```

### 3. Keep Tests Independent

Each test should:

- Set up its own data
- Clean up after itself
- Not depend on other tests
- Run in any order

### 4. Mock External Dependencies

```typescript
// Mock Supabase client
jest.mock('@/lib/supabase');

// Mock fetch calls
global.fetch = jest.fn();

// Mock timers when needed
jest.useFakeTimers();
```

### 5. Test Error Cases

Always test:

- Happy path
- Error conditions
- Edge cases
- Invalid inputs

## Integration Testing

### API Integration Tests

```typescript
// src/features/bingo/__tests__/bingo-integration.test.ts
import { createBingoBoard, joinSession } from '../bingo-api';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.post('/api/bingo/boards', (req, res, ctx) => {
    return res(ctx.json({ id: '123', name: 'Test Board' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Bingo Integration', () => {
  it('should create board and join session', async () => {
    const board = await createBingoBoard({ name: 'Test' });
    expect(board.id).toBe('123');

    const session = await joinSession(board.id);
    expect(session.boardId).toBe('123');
  });
});
```

## E2E Testing (Planned)

### Playwright Setup

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can sign up and login', async ({ page }) => {
    await page.goto('/auth/signup');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome')).toBeVisible();
  });
});
```

## Performance Testing

### Component Performance

```typescript
import { render } from '@testing-library/react';
import { measureRender } from './test-utils';

test('BoardGrid renders efficiently', async () => {
  const renderTime = await measureRender(
    <BoardGrid items={generateLargeDataset(1000)} />
  );

  expect(renderTime).toBeLessThan(100); // ms
});
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

## Current Testing Priorities

Given the 0% coverage, prioritize:

1. **Service layer tests** (highest ROI)
2. **Critical hook tests** (useAuth, useSession)
3. **Core component tests** (forms, buttons)
4. **Integration tests** for main flows
5. **E2E tests** for critical paths

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/docs/)
- [Playwright Documentation](https://playwright.dev/)
