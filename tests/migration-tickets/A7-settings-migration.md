# Agent A7: Settings Feature Test Migration

## Overview
Extract user preferences, validation, and update logic from E2E tests into unit and integration tests.

## Current E2E Tests to Analyze
- Settings tests embedded in various E2E test files
- User profile update tests
- Preference management tests
- Email/password update tests
- Notification preference tests

## Business Logic to Extract

### 1. Settings Validation (Unit Tests)
**From**: Various settings-related E2E tests
**Extract to**: `src/features/settings/test/unit/validation.test.ts`
- Email format validation
- Password strength validation
- Username uniqueness rules
- Bio length limits
- Avatar file validation

### 2. Preference Management (Unit Tests)
**From**: Notification and preference tests
**Extract to**: `src/features/settings/test/unit/preferences.test.ts`
- Preference schema validation
- Default preference values
- Preference merge logic
- Category grouping logic
- Permission checks

### 3. Update Logic (Unit Tests)
**From**: Profile update tests
**Extract to**: `src/features/settings/test/unit/update-logic.test.ts`
- Field change detection
- Optimistic update logic
- Rollback mechanisms
- Partial update handling
- Conflict resolution

### 4. Email/Password Updates (Integration Tests)
**From**: Account security tests
**Extract to**: `src/features/settings/test/integration/account-updates.test.ts`
- Email verification flow
- Password change flow
- Re-authentication requirements
- Security notifications
- Session invalidation

### 5. Data Privacy Logic (Unit Tests)
**From**: Privacy-related tests
**Extract to**: `src/features/settings/test/unit/privacy.test.ts`
- Data export formatting
- Account deletion rules
- Privacy level calculations
- Visibility settings logic
- Data retention rules

## Test Structure to Create

```
src/features/settings/test/
├── unit/
│   ├── validation.test.ts
│   ├── preferences.test.ts
│   ├── update-logic.test.ts
│   ├── privacy.test.ts
│   └── hooks/
│       ├── useEmailUpdate.test.ts
│       ├── usePasswordUpdate.test.ts
│       └── useSettings.test.ts
└── integration/
    ├── account-updates.test.ts
    ├── preference-sync.test.ts
    └── profile-updates.test.ts
```

## Implementation Steps

1. **Extract validation logic**
   - Test all field validators
   - Test constraint rules
   - Test error messages
2. **Extract preference logic**
   - Test schema validation
   - Test merge algorithms
   - Test defaults
3. **Extract update logic**
   - Test change detection
   - Test optimistic updates
   - Test rollbacks
4. **Extract security flows**
   - Test re-authentication
   - Test notifications
   - Test session handling
5. **Update E2E tests**
   - Keep user journey tests
   - Remove validation tests
   - Focus on UI flow

## E2E Tests to Keep (Simplified)
- Update profile information
- Change email address
- Update password
- Manage notifications
- Delete account

## Success Criteria
- All validation logic unit tested
- Preference logic tested in isolation
- Update mechanisms fully tested
- E2E tests reduced by 65% in size
- Security flows have integration tests

## Priority: MEDIUM
Important for user retention and satisfaction.