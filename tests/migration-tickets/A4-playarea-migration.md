# Agent A4: Play Area Feature Test Migration

## Overview
Extract game discovery, session management, and achievement logic from E2E tests into unit and integration tests.

## Current E2E Tests to Analyze
- `/tests/features/play-area/game-hub.spec.ts`
- `/tests/features/play-area/game-session.spec.ts`
- `/tests/features/play-area/achievements.spec.ts`
- `/tests/features/play-area/speedruns.spec.ts`
- `/tests/features/play-area/game-filters.spec.ts`
- `/tests/features/play-area/achievement-tracking.spec.ts`

## Business Logic to Extract

### 1. Game Discovery Algorithm (Unit Tests)
**From**: `game-hub.spec.ts`, `game-filters.spec.ts`
**Extract to**: `src/features/play-area/test/unit/game-discovery.test.ts`
- Recommendation algorithms
- Filter combination logic
- Sort order logic
- Popularity calculations
- Category matching

### 2. Session Management (Unit Tests)
**From**: `game-session.spec.ts`
**Extract to**: `src/features/play-area/test/unit/session-management.test.ts`
- Session creation rules
- Player limit enforcement
- Session state transitions
- Join/leave logic
- Host transfer logic

### 3. Achievement System (Unit Tests)
**From**: `achievements.spec.ts`, `achievement-tracking.spec.ts`
**Extract to**: `src/features/play-area/test/unit/achievements.test.ts`
- Achievement unlock conditions
- Progress tracking calculations
- XP/point calculations
- Milestone detection
- Streak tracking

### 4. Speedrun Validation (Unit Tests)
**From**: `speedruns.spec.ts`
**Extract to**: `src/features/play-area/test/unit/speedrun-validation.test.ts`
- Time validation logic
- Category rule enforcement
- Leaderboard calculations
- Personal best tracking
- Split time validation

### 5. Game Timer Logic (Unit Tests)
**From**: Timer-related code in components
**Extract to**: `src/features/play-area/test/unit/game-timer.test.ts`
- Timer state management
- Pause/resume logic
- Time formatting
- Countdown logic
- Overtime handling

## Test Structure to Create

```
src/features/play-area/test/
├── unit/
│   ├── game-discovery.test.ts
│   ├── session-management.test.ts
│   ├── achievements.test.ts
│   ├── speedrun-validation.test.ts
│   ├── game-timer.test.ts
│   ├── stores/
│   │   └── game-timer-store.test.ts
│   └── hooks/
│       ├── useSessionJoin.test.ts
│       └── usePlayAreaVirtualization.test.ts
└── integration/
    ├── session-crud.test.ts
    ├── achievement-service.test.ts
    ├── speedrun-submission.test.ts
    └── game-hosting.test.ts
```

## Implementation Steps

1. **Extract discovery logic**
   - Test recommendation algorithms
   - Test filter combinations
   - Test sort algorithms
2. **Extract session logic**
   - Test state transitions
   - Test player limits
   - Test host privileges
3. **Extract achievement logic**
   - Test unlock conditions
   - Test progress calculations
   - Test XP formulas
4. **Extract speedrun logic**
   - Test time validation
   - Test category rules
   - Test leaderboard updates
5. **Update E2E tests**
   - Keep game flow tests
   - Remove calculation testing
   - Focus on user journeys

## E2E Tests to Keep (Simplified)
- Browse and join game session
- Complete game and earn achievement
- Submit speedrun time
- Host game session
- Filter and search games

## Success Criteria
- Discovery algorithms fully unit tested
- Achievement calculations tested in isolation
- Session logic has clear state tests
- E2E tests reduced by 60% in size
- Timer logic tested without UI

## Priority: MEDIUM
Core user engagement features.