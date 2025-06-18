# Agent A8: User Profile Test Migration

## Overview
Extract user profile display, activity tracking, and stats calculation logic from E2E tests into unit and integration tests.

## Current E2E Tests to Analyze
- User profile display tests
- Activity tracking tests
- Achievement display tests
- Stats calculation tests
- Profile visibility tests

## Business Logic to Extract

### 1. Profile Stats Calculations (Unit Tests)
**From**: Profile-related E2E tests
**Extract to**: `src/features/user/test/unit/stats-calculations.test.ts`
- Total points calculations
- Win rate calculations
- Streak calculations
- Activity score algorithms
- Rank calculations

### 2. Activity Tracking (Unit Tests)
**From**: Activity tracking tests
**Extract to**: `src/features/user/test/unit/activity-tracking.test.ts`
- Activity type classification
- Activity aggregation logic
- Timeline generation
- Privacy filtering
- Activity scoring

### 3. Profile Visibility Rules (Unit Tests)
**From**: Privacy and visibility tests
**Extract to**: `src/features/user/test/unit/visibility-rules.test.ts`
- Public/private field logic
- Friend-only visibility
- Blocked user filtering
- Achievement visibility
- Activity feed filtering

### 4. Tab Content Logic (Unit Tests)
**From**: Profile tab tests
**Extract to**: `src/features/user/test/unit/tab-content.test.ts`
- Tab state management
- Content lazy loading rules
- Tab permission checks
- Default tab selection
- Tab ordering logic

### 5. Enhanced Profile Features (Unit Tests)
**From**: Enhanced profile tests
**Extract to**: `src/features/user/test/unit/enhanced-profile.test.ts`
- Badge display logic
- Showcase selection
- Custom profile themes
- Social link validation
- Bio formatting

## Test Structure to Create

```
src/features/user/test/
├── unit/
│   ├── stats-calculations.test.ts
│   ├── activity-tracking.test.ts
│   ├── visibility-rules.test.ts
│   ├── tab-content.test.ts
│   ├── enhanced-profile.test.ts
│   └── hooks/
│       ├── useActivityTracker.test.ts
│       ├── useUserProfileEdit.test.ts
│       └── useUserProfileTabs.test.ts
└── integration/
    ├── profile-loading.test.ts
    ├── activity-feed.test.ts
    └── profile-updates.test.ts
```

## Implementation Steps

1. **Extract stats logic**
   - Test calculation formulas
   - Test edge cases
   - Test aggregation rules
2. **Extract activity logic**
   - Test classification
   - Test aggregation
   - Test privacy filters
3. **Extract visibility logic**
   - Test permission rules
   - Test filtering logic
   - Test blocked users
4. **Extract tab logic**
   - Test state management
   - Test lazy loading
   - Test permissions
5. **Update E2E tests**
   - Keep profile viewing flow
   - Remove calculation tests
   - Focus on user journey

## E2E Tests to Keep (Simplified)
- View own profile
- View other user's profile
- Edit profile information
- View activity feed
- Navigate profile tabs

## Success Criteria
- Stats calculations fully unit tested
- Activity logic tested in isolation
- Visibility rules have clear tests
- E2E tests reduced by 60% in size
- Tab logic tested without UI

## Priority: LOW
Enhancement features, not critical path.