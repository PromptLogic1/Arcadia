# User Profile Tests

This directory contains comprehensive unit tests for the UserProfile feature business logic.

## Test Files

### Core Business Logic Tests

- **`statistics-calculator.test.ts`** - Tests for user statistics calculations

  - Aggregated statistics from `user_statistics` table
  - Fallback calculations from individual `game_results`
  - Win rate, average score, streak calculations
  - Rank determination logic
  - Performance optimizations

- **`activity-tracker.test.ts`** - Tests for activity tracking logic

  - Activity description generation
  - Points calculation with difficulty multipliers
  - Batch processing algorithms
  - Time-series data handling
  - Concurrent activity scenarios

- **`badge-engine.test.ts`** - Tests for badge/achievement system

  - Badge unlock conditions
  - Progress tracking for different badge types
  - Achievement categorization
  - Special achievement triggers
  - Performance with large datasets

- **`profile-score.test.ts`** - Tests for profile completeness scoring
  - Completeness percentage calculation
  - Quality score based on profile richness
  - Suggestion generation for improvements
  - Validation of profile fields
  - Overall score weighting

### Integration & Factory Tests

- **`user-profile-integration.test.ts`** - End-to-end user journey tests

  - New user onboarding flow
  - User progression tracking
  - Statistical aggregation scenarios
  - Cross-component data consistency
  - Time-based engagement analysis

- **`factories/user-factory.ts`** - Test data factories
  - Realistic user profile generation
  - Game history simulation
  - Activity log creation
  - Power user scenarios
  - Data integrity helpers

## Test Categories

### 1. Statistics Calculations

Tests the mathematical accuracy and performance of user statistics:

- **Win Rate Calculations**: Ensures accurate percentage calculations
- **Streak Detection**: Tests current and longest win streak algorithms
- **Score Aggregation**: Validates total and average score computations
- **Rank Assignment**: Tests the ranking system based on games and win rate
- **Performance**: Ensures calculations scale with large datasets

### 2. Activity Tracking

Tests the activity logging and point calculation system:

- **Description Generation**: Tests human-readable activity descriptions
- **Points Calculation**: Validates base points and difficulty multipliers
- **Batch Processing**: Tests efficient bulk activity logging
- **Time-Series Analysis**: Tests activity patterns over time
- **Edge Cases**: Handles special characters, long titles, concurrent activities

### 3. Badge System

Tests the achievement unlock and progress tracking logic:

- **Unlock Conditions**: Tests all badge unlock criteria
- **Progress Tracking**: Tests progress bars for milestone badges
- **Categorization**: Tests badge grouping by type
- **Special Badges**: Tests complex unlock conditions
- **Performance**: Tests badge checking with many users

### 4. Profile Scoring

Tests the profile completeness and quality scoring system:

- **Completeness Scoring**: Tests field completion percentage
- **Quality Factors**: Tests profile richness indicators
- **Suggestion Engine**: Tests improvement recommendations
- **Field Validation**: Tests profile field validation rules
- **Overall Scoring**: Tests weighted score calculation

## Running Tests

### All Tests

```bash
npm test src/features/user/test
```

### Specific Test Files

```bash
npm test statistics-calculator.test.ts
npm test activity-tracker.test.ts
npm test badge-engine.test.ts
npm test profile-score.test.ts
```

### With Coverage

```bash
npm test src/features/user/test -- --coverage
```

### Watch Mode

```bash
npm test src/features/user/test -- --watch
```

## Test Data

### Factories

The test factories create realistic test data:

- **New Users**: Minimal profile data for onboarding tests
- **Power Users**: Complete profiles with high activity
- **Game History**: Configurable win rates and time ranges
- **Activity Logs**: Realistic activity patterns over time

### Mock Data Patterns

- **Realistic Values**: Statistics match real user behavior
- **Edge Cases**: Tests handle null, undefined, and extreme values
- **Performance Data**: Large datasets for performance testing
- **Time Series**: Historical data with proper chronological ordering

## Performance Requirements

All business logic functions must meet these performance criteria:

- **Statistics Calculation**: < 1ms per user
- **Activity Tracking**: < 0.1ms per activity
- **Badge Checking**: < 0.1ms per user
- **Profile Scoring**: < 0.5ms per profile
- **Batch Processing**: Handle 1000+ items efficiently

## Test Coverage Goals

- **Line Coverage**: > 95%
- **Branch Coverage**: > 90%
- **Function Coverage**: 100%
- **Edge Case Coverage**: All null/undefined/empty scenarios

## Adding New Tests

When adding new business logic:

1. **Create Unit Tests**: Test the pure function logic
2. **Add Factory Support**: Create test data generators
3. **Test Edge Cases**: Handle null, undefined, empty values
4. **Performance Test**: Ensure scalability with large datasets
5. **Integration Test**: Test interaction with other components

### Test Structure

```typescript
describe('Feature Name', () => {
  describe('Main Functionality', () => {
    it('should handle normal case', () => {
      // Test implementation
    });

    it('should handle edge cases', () => {
      // Test edge cases
    });
  });

  describe('Performance', () => {
    it('should process large datasets efficiently', () => {
      // Performance test
    });
  });
});
```

## Debugging Tests

### Common Issues

- **Time-dependent tests**: Use mocked time in `test-setup.ts`
- **Random data**: Use seeded random or fixed test data
- **Performance tests**: Ensure consistent environment

### Debug Tips

- Use `console.log` sparingly (mocked in tests)
- Add `.only` to focus on specific tests
- Use `--reporter=verbose` for detailed output
- Check test data with factories

## Contributing

When contributing new tests:

1. Follow existing patterns and naming conventions
2. Add comprehensive edge case coverage
3. Include performance considerations
4. Update this README with new test categories
5. Ensure all tests are deterministic and reliable
