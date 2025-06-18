# Agent A1: Auth Feature Test Migration

## Overview
Extract business logic from E2E auth tests into unit and integration tests.

## Current E2E Tests to Analyze
- `/tests/auth/login.spec.ts`
- `/tests/auth/signup.spec.ts`
- `/tests/auth/password-reset.spec.ts`
- `/tests/auth/email-verification.spec.ts`
- `/tests/auth/mfa-authentication.spec.ts`
- `/tests/auth/session-management.spec.ts`
- `/tests/auth/redis-rate-limiting.spec.ts`

## Business Logic to Extract

### 1. Form Validation (Unit Tests)
**From**: `login.spec.ts`, `signup.spec.ts`
**Extract to**: `src/features/auth/test/unit/validation.test.ts`
- Email format validation
- Password strength requirements
- Username constraints
- Required field validation

### 2. Rate Limiting Logic (Unit Tests)
**From**: `redis-rate-limiting.spec.ts`
**Extract to**: `src/features/auth/test/unit/rate-limiter.test.ts`
- Rate limit calculations
- Window sliding logic
- Token bucket algorithms
- IP-based limiting rules

### 3. Session Management (Integration Tests)
**From**: `session-management.spec.ts`
**Extract to**: `src/features/auth/test/integration/session.test.ts`
- Session creation/destruction
- Token refresh logic
- Session timeout handling
- Multi-device session logic

### 4. Password Reset Flow (Integration Tests)
**From**: `password-reset.spec.ts`
**Extract to**: `src/features/auth/test/integration/password-reset.test.ts`
- Token generation and validation
- Email sending logic
- Token expiration rules
- Password update process

### 5. MFA Logic (Unit Tests)
**From**: `mfa-authentication.spec.ts`
**Extract to**: `src/features/auth/test/unit/mfa.test.ts`
- TOTP generation/validation
- Backup code generation
- Recovery flow logic
- Device trust management

## Test Structure to Create

```
src/features/auth/test/
├── unit/
│   ├── validation.test.ts
│   ├── rate-limiter.test.ts
│   ├── mfa.test.ts
│   ├── hooks/
│   │   ├── useLoginForm.test.ts
│   │   ├── useSignUpForm.test.ts
│   │   └── usePasswordRequirements.test.ts
│   └── utils/
│       ├── persistence.utils.test.ts
│       └── validation.utils.test.ts
└── integration/
    ├── auth-service.test.ts
    ├── session.test.ts
    ├── password-reset.test.ts
    └── email-verification.test.ts
```

## Implementation Steps

1. **Create test directory structure**
2. **Extract validation logic**
   - Move email validation from E2E to unit tests
   - Test password requirements independently
   - Test form field constraints
3. **Extract rate limiting**
   - Test rate limit algorithms in isolation
   - Mock Redis for unit tests
   - Test different rate limit scenarios
4. **Extract session logic**
   - Test session lifecycle
   - Test token refresh independently
   - Test concurrent session handling
5. **Update E2E tests**
   - Remove business logic assertions
   - Keep only user journey validations
   - Focus on integration between components

## E2E Tests to Keep (Simplified)
- Basic login flow (happy path)
- Basic signup flow (happy path)
- Password reset journey
- OAuth login flow
- Session persistence across refresh

## Success Criteria
- All validation logic has unit tests
- Rate limiting is fully tested in isolation
- Session management has comprehensive integration tests
- E2E tests reduced by 60% in size
- Test execution time reduced from 45s to 5s for auth tests

## Priority: HIGH
Auth is security-critical and should be migrated first.