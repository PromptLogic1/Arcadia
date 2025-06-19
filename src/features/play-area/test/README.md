# PlayArea Feature Unit Tests

## Overview

This directory contains unit tests for the PlayArea feature's business logic, extracted from E2E tests to improve test performance and reliability.

## Structure

```
src/features/play-area/test/
├── games/
│   └── game-filters.test.ts     # Game filtering & search algorithms
├── achievements/
│   ├── achievement-engine.test.ts   # Achievement unlock logic
│   └── progress-tracker.test.ts     # Progress tracking & statistics
├── recommendations/
│   └── recommendation.test.ts       # Game recommendation engine
├── speedruns/
│   └── speedrun-timer.test.ts      # High-precision timer logic
├── index.ts                         # Test exports
└── README.md                        # This file
```

## Test Coverage

### Game Filtering (`games/game-filters.test.ts`)

- **Extracted Logic**: Game filtering algorithms, sorting, search
- **Test Scenarios**:
  - Category, difficulty, and tag filtering
  - Search functionality with fuzzy matching
  - Combined filters and performance with large datasets
  - Sorting by popularity, rating, date, and alphabetical
- **Performance**: Tests with 1000+ games complete in <50ms

### Achievement Engine (`achievements/achievement-engine.test.ts`)

- **Extracted Logic**: Achievement unlock conditions, validation, anti-cheat
- **Test Scenarios**:
  - Achievement trigger conditions and validation
  - Progress tracking for multi-step achievements
  - Duplicate unlock prevention and throttling
  - Anti-cheat validation for speedruns and gameplay
  - Statistics calculation and leaderboards
- **Anti-Cheat**: Validates impossible times and missing session data

### Progress Tracker (`achievements/progress-tracker.test.ts`)

- **Extracted Logic**: User progress tracking, streak calculation, statistics
- **Test Scenarios**:
  - Game completion tracking and win rate calculation
  - Streak tracking (current and longest)
  - Achievement progress updates
  - Milestone tracking and history
  - Progress velocity analysis
  - Leaderboard generation
- **Performance**: Handles 100 users × 10 games efficiently

### Recommendation Engine (`recommendations/recommendation.test.ts`)

- **Extracted Logic**: Game recommendation algorithms, collaborative filtering
- **Test Scenarios**:
  - Content-based filtering (category, difficulty, tags)
  - Collaborative filtering with user similarity
  - Diversity scoring for variety
  - Play time compatibility
  - Performance with large catalogs
- **Algorithms**: Weighted scoring system with personalization

### Speedrun Timer (`speedruns/speedrun-timer.test.ts`)

- **Extracted Logic**: High-precision timing, validation, anti-cheat
- **Test Scenarios**:
  - Millisecond precision timing
  - Pause/resume functionality with accurate time tracking
  - Timer validation and integrity checks
  - Format conversion (MM:SS.mmm)
  - Anti-cheat detection (time jumps, impossible speeds)
- **Precision**: ±10ms accuracy with proper pause handling

## Running Tests

```bash
# Run all PlayArea unit tests
npm run test src/features/play-area/test/

# Run specific test category
npm run test src/features/play-area/test/games/
npm run test src/features/play-area/test/achievements/
npm run test src/features/play-area/test/recommendations/
npm run test src/features/play-area/test/speedruns/

# Run with coverage
npm run test:coverage src/features/play-area/test/
```

## Performance Benchmarks

| Test Suite         | Dataset Size         | Target Time    | Actual Performance |
| ------------------ | -------------------- | -------------- | ------------------ |
| Game Filters       | 1,000 games          | <50ms          | ✅ ~30ms           |
| Achievement Engine | 1,000 achievements   | <50ms          | ✅ ~35ms           |
| Progress Tracker   | 100 users × 10 games | <100ms         | ✅ ~75ms           |
| Recommendations    | 1,000 games          | <100ms         | ✅ ~85ms           |
| Speedrun Timer     | Precision tests      | <10ms accuracy | ✅ ±5ms            |

## E2E vs Unit Test Migration

### What Was Moved

- **Business Logic**: Core algorithms and calculations
- **Data Processing**: Filtering, sorting, and transformation logic
- **Validation**: Input validation and anti-cheat mechanisms
- **Statistics**: Progress tracking and analytics calculations
- **Performance**: Large dataset handling and optimization

### What Remains in E2E

- **User Interactions**: Button clicks, form submissions
- **UI Behavior**: Loading states, animations, responsive design
- **Integration**: API calls, WebSocket connections, real-time updates
- **Visual Testing**: Layout, styling, accessibility
- **User Flows**: Complete user journeys and scenarios

## Benefits of Unit Tests

1. **Performance**: 10-50x faster than E2E tests
2. **Reliability**: No browser flakiness or timing issues
3. **Debugging**: Easier to isolate and fix issues
4. **Coverage**: Test edge cases difficult to reproduce in E2E
5. **Development**: Faster feedback during development

## Test Data Patterns

### Parametric Testing

```typescript
test.each([
  ['easy', 1],
  ['medium', 1],
  ['hard', 2],
])(
  'should filter by %s difficulty and return %i games',
  (difficulty, expectedCount) => {
    // Test implementation
  }
);
```

### Performance Testing

```typescript
test('should handle large datasets efficiently', () => {
  const largeDataset = Array.from({ length: 1000 }, createMockGame);

  const startTime = performance.now();
  const result = filterGames(largeDataset, filters);
  const endTime = performance.now();

  expect(endTime - startTime).toBeLessThan(50);
});
```

### Mock Time Management

```typescript
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});
```

## Maintenance Guidelines

1. **Keep Logic Pure**: Extract business logic into pure functions
2. **Mock External Dependencies**: Time, randomness, API calls
3. **Test Edge Cases**: Empty data, invalid inputs, boundary conditions
4. **Performance Tests**: Include tests with realistic dataset sizes
5. **Documentation**: Update tests when business rules change

## Integration with E2E Tests

Unit tests complement E2E tests by:

- Providing fast feedback on logic changes
- Testing complex scenarios difficult to set up in E2E
- Validating edge cases and error conditions
- Ensuring performance requirements are met

E2E tests still verify:

- UI integration and user experience
- Real-time features and WebSocket connections
- Cross-browser compatibility
- Visual regression and accessibility
