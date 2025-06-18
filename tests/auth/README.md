# Authentication Tests - Optimized E2E Suite

This directory contains **focused end-to-end tests** for authentication and security features that require real browser behavior and can't be tested in Jest unit tests.

## 🎯 Philosophy: Jest vs Playwright

**Jest Unit Tests** (in `/src/features/auth/test/`):
- Business logic: Login/signup operations, form validation, session management
- Service layer: Auth service methods, OAuth flows, password operations  
- State management: Auth hooks, token validation, rate limiting logic

**Playwright E2E Tests** (this directory):
- **Browser behavior**: Real navigation redirects, route protection
- **Infrastructure integration**: Redis rate limiting, real security headers
- **Security testing**: XSS execution, CSRF protection in browser context

## 📁 Test Files (Essential Only)

### ✅ Kept - Unique E2E Value

#### `auth-guards.spec.ts`
**What it tests**: Real browser route protection behavior
- Actual navigation redirects to login page
- Route protection middleware in browser environment  
- API endpoint access control
- Auth state management across page navigation

**Why E2E**: Can't test real browser navigation and middleware integration in Jest

#### `redis-rate-limiting.spec.ts` 
**What it tests**: Real Redis-based rate limiting integration
- Actual Redis persistence and TTL behavior
- Distributed rate limiting across browser contexts
- Redis failover and resilience testing
- Cross-request rate limit state persistence

**Why E2E**: Requires real Redis connection and browser request patterns

#### `security-vulnerabilities.spec.ts`
**What it tests**: Browser-based security features  
- XSS execution prevention in real browser context
- CSRF protection with real request headers
- Session security and cookie validation
- Input sanitization in browser environment

**Why E2E**: Security vulnerabilities can only be tested in real browser context

### ❌ Removed - Redundant with Jest

- `login-flow.spec.ts` → Covered by Jest `auth-service.test.ts`
- `signup-flow.spec.ts` → Covered by Jest `auth-service.test.ts`  
- `oauth-edge-cases.spec.ts` → Covered by Jest `oauth.test.ts`
- `password-reset.spec.ts` → Covered by Jest `auth-service.test.ts`
- `mfa-authentication.spec.ts` → Covered by Jest (MFA service tests)
- `email-verification.spec.ts` → Covered by Jest `auth-service.test.ts`
- `session-management.spec.ts` → Covered by Jest `session-token.test.ts`
- `email-integration.spec.ts` → Email service logic covered by Jest

## 🚀 Running Tests

```bash
# Run all auth E2E tests
npx playwright test tests/auth/

# Run specific test file
npx playwright test tests/auth/auth-guards.spec.ts

# Run with Redis integration (optional)
USE_REDIS_TESTS=true npx playwright test tests/auth/redis-rate-limiting.spec.ts

# Debug mode
npx playwright test tests/auth/ --debug
```

## 📊 Results of Optimization

### Before Optimization:
- **13 test files** with significant overlap
- **~1500+ lines** of redundant test code
- **Business logic** tested in both Jest and Playwright
- **Maintenance overhead** for duplicate coverage

### After Optimization:
- **3 focused test files** (77% reduction)
- **~600 lines** of essential E2E behavior only
- **Clear separation**: Jest = logic, Playwright = browser behavior  
- **Faster execution** and easier maintenance

## 🛡️ Security Test Coverage

Our security tests cover:

### XSS Prevention
- Script injection in form fields
- DOM-based XSS via URL parameters  
- Stored XSS in user data
- Real browser script execution testing

### CSRF Protection  
- Cross-origin request validation
- CSRF token validation
- Origin header verification
- Referer header validation

### Session Security
- Tampered cookie detection
- Secure cookie attributes
- Session fixation prevention
- Cross-browser session validation

### Input Validation
- SQL injection attempt blocking
- Input length limit enforcement
- Malicious payload sanitization
- Browser-level validation testing

## 🔧 Configuration

### Environment Variables
- `USE_REDIS_TESTS=true` - Enable Redis integration tests (optional)
- `NODE_ENV=production` - Enforces stricter security validations

### Prerequisites
- App running on `http://localhost:3000` (auto-started by Playwright)
- Redis instance (optional, for rate limiting tests)
- Valid Supabase configuration for auth endpoints

## 📋 Test Structure

Each test file follows this pattern:

```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Clear auth state for isolation
    await page.context().clearCookies();
  });

  test('should demonstrate unique browser behavior', async ({ page }) => {
    // Test real browser interactions that can't be unit tested
  });
});
```

## 🎯 Contributing Guidelines

When adding new auth features:

1. **Ask**: "Can this be tested in Jest?" If yes, add unit tests there
2. **E2E only for**: Real browser behavior, infrastructure integration, security
3. **Use proper selectors**: `getByRole`, `getByLabel` for accessibility
4. **Mock external services**: Don't rely on real auth providers in tests  
5. **Clear test state**: Always clean up between tests
6. **Document rationale**: Explain why the test requires E2E

## 🚨 Important Notes

- **Security test failures should block releases**
- **Redis tests are optional** (require `USE_REDIS_TESTS=true`)
- **Focus on browser behavior**, not business logic
- **Tests should be deterministic** and not flaky
- **Mock auth responses** to avoid external dependencies

This optimized test suite focuses on what truly requires end-to-end testing while delegating business logic validation to faster, more reliable Jest unit tests.