# Bingo Feature Unit Tests

This directory contains comprehensive unit tests for the Bingo game feature, extracted from E2E tests to improve performance and maintainability.

## Test Structure

### Core Logic Tests
- **`win-detection.test.ts`** - Tests win pattern detection algorithms
- **`bingo-engine.test.ts`** - Tests core game engine logic and state management
- **`scoring.test.ts`** - Tests scoring calculations and multipliers
- **`card-generator.test.ts`** - Tests card generation and validation logic

### Hook Tests
- **`useBingoGame.test.ts`** - Tests the main game hook with mocked dependencies

### Mocks
- **`__mocks__/game-state.mock.ts`** - Mock game states and helper functions
- **`__mocks__/realtime.mock.ts`** - Mock realtime connections and network conditions

### Test Setup
- **`test-setup.ts`** - Global test configuration and utilities

## Test Coverage

### Win Detection Service
- ✅ Horizontal line detection (all rows)
- ✅ Vertical line detection (all columns)  
- ✅ Diagonal line detection (both directions)
- ✅ Four corners pattern
- ✅ Full house pattern
- ✅ Special patterns (Letter T, Letter X)
- ✅ Multiple simultaneous patterns
- ✅ Different board sizes (3x3, 4x4, 5x5, 6x6)
- ✅ Edge cases and performance

### Game Engine
- ✅ Cell marking/unmarking
- ✅ Multi-player state management
- ✅ Game state validation
- ✅ Permission checks
- ✅ Win detection integration
- ✅ Complex game scenarios
- ✅ Conflict resolution

### Scoring Service
- ✅ Base score calculation
- ✅ Time bonuses (speed demon, quick win, fast finish)
- ✅ Multipliers (first winner, speed bonus, perfection)
- ✅ Difficulty modifiers
- ✅ Placement points
- ✅ Score formatting
- ✅ Achievement thresholds

### Card Generator
- ✅ Category-based generation
- ✅ Difficulty filtering
- ✅ Tag-based filtering
- ✅ Custom card creation
- ✅ Duplicate avoidance
- ✅ Card validation
- ✅ Smart suggestions

### useBingoGame Hook
- ✅ State management
- ✅ Cell marking operations
- ✅ Game start/completion
- ✅ Win detection integration
- ✅ Error handling
- ✅ Loading states

## Running Tests

```bash
# Run all bingo tests
npm test src/features/bingo-boards/test

# Run specific test file
npm test win-detection.test.ts

# Run with coverage
npm test -- --coverage src/features/bingo-boards/test

# Run in watch mode
npm test -- --watch src/features/bingo-boards/test
```

## Performance Benchmarks

The unit tests include performance checks to ensure optimal game performance:

- **Win Detection**: < 10ms for standard 5x5 boards
- **Cell Marking**: < 5ms per operation
- **State Updates**: < 20ms including validation
- **Board Generation**: < 50ms for full board

## Mock Strategy

### Game State Mocks
- Pre-defined board states for common scenarios
- Helper functions for creating custom game states
- Realistic player interactions and conflicts

### Realtime Mocks
- WebSocket simulation with network conditions
- Rate limiting simulation
- Database operation mocking with timing
- Presence tracking simulation

### Network Simulation
- Configurable latency and packet loss
- Offline/partition scenarios
- Unstable connection simulation
- Concurrent operation testing

## Best Practices

### Test Organization
- Each service has its own test file
- Mocks are centralized and reusable
- Performance tests are isolated but comprehensive
- Edge cases are thoroughly covered

### Data-Driven Testing
- Win patterns tested systematically
- Board sizes tested comprehensively
- Scoring scenarios cover all multiplier combinations
- Card generation covers all filter combinations

### Performance Testing
- All critical operations have timing assertions
- Memory usage is monitored
- Concurrent operations are stress-tested
- Real-world scenarios are simulated

## Migration from E2E Tests

This test suite replaces the following E2E test functionality:
- ❌ `tests/features/bingo/win-detection.spec.ts` → ✅ Unit tests
- ❌ `tests/features/bingo/game-session.spec.ts` → ✅ Unit tests  
- ❌ `tests/features/bingo/board-creation.spec.ts` → ✅ Unit tests
- ❌ `tests/features/bingo/multiplayer.spec.ts` → ✅ Unit tests

### Benefits of Migration
- **Performance**: Tests run in ~100ms vs 10+ seconds for E2E
- **Reliability**: No UI flakiness or timing issues
- **Isolation**: Each test is independent and deterministic
- **Coverage**: More edge cases can be tested efficiently
- **Debugging**: Easier to debug failing logic tests

### What Remains in E2E
- Actual UI interactions and visual validation
- Real multiplayer sessions with WebSocket communication
- Integration between frontend and backend
- Browser-specific behavior testing

## Future Enhancements

### Additional Test Coverage
- Queue matching algorithms
- Complex multiplayer scenarios
- Performance regression detection
- Memory leak detection

### Advanced Mocking
- More sophisticated network simulation
- Database transaction simulation
- Browser API mocking
- Service worker simulation

### Integration Testing
- Service integration tests
- Hook integration with multiple services
- State management integration
- Error boundary testing