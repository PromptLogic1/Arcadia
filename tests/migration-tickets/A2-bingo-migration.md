# Agent A2: Bingo Feature Test Migration

## Overview
Extract game logic and board management from E2E tests into unit and integration tests.

## Current E2E Tests to Analyze
- `/tests/features/bingo/board-creation.spec.ts`
- `/tests/features/bingo/board-editing.spec.ts`
- `/tests/features/bingo/game-session.spec.ts`
- `/tests/features/bingo/win-detection.spec.ts`
- `/tests/features/bingo/multiplayer.spec.ts`
- `/tests/features/bingo/board-sharing.spec.ts`

## Business Logic to Extract

### 1. Board Creation Validation (Unit Tests)
**From**: `board-creation.spec.ts`
**Extract to**: `src/features/bingo-boards/test/unit/board-validation.test.ts`
- Board size constraints (3x3 to 6x6)
- Title length limits (100 chars)
- Required field validation
- Tag validation
- Game type validation

### 2. Win Detection Algorithms (Unit Tests)
**From**: `win-detection.spec.ts`
**Extract to**: `src/features/bingo-boards/test/unit/win-detection.test.ts`
- Horizontal win detection
- Vertical win detection
- Diagonal win detection
- Pattern-based wins (corners, X, plus)
- Custom pattern validation

### 3. Game State Management (Unit Tests)
**From**: `game-session.spec.ts`
**Extract to**: `src/features/bingo-boards/test/unit/game-state.test.ts`
- Cell marking/unmarking logic
- Game progression states
- Timer management
- Score calculations
- Player state tracking

### 4. Board Generator Logic (Unit Tests)
**From**: Board generation code in services
**Extract to**: `src/features/bingo-boards/test/unit/board-generator.test.ts`
- Random board generation
- Template-based generation
- Difficulty-based generation
- Card distribution algorithms

### 5. Multiplayer Synchronization (Integration Tests)
**From**: `multiplayer.spec.ts`
**Extract to**: `src/features/bingo-boards/test/integration/realtime-sync.test.ts`
- Real-time state synchronization
- Conflict resolution
- Player presence tracking
- Game session management

## Test Structure to Create

```
src/features/bingo-boards/test/
├── unit/
│   ├── board-validation.test.ts
│   ├── win-detection.test.ts
│   ├── game-state.test.ts
│   ├── board-generator.test.ts
│   ├── services/
│   │   ├── win-detection.service.test.ts
│   │   ├── scoring.service.test.ts
│   │   └── queue-matcher.service.test.ts
│   └── hooks/
│       ├── useBingoGame.test.ts
│       ├── useGameState.test.ts
│       └── useTimer.test.ts
└── integration/
    ├── board-crud.test.ts
    ├── game-session.test.ts
    ├── realtime-sync.test.ts
    └── board-sharing.test.ts
```

## Implementation Steps

1. **Extract win detection logic**
   - Test each win pattern independently
   - Test edge cases (incomplete boards)
   - Test performance with large boards
2. **Extract board validation**
   - Test all constraint rules
   - Test validation error messages
   - Test edge cases
3. **Extract game state logic**
   - Test state transitions
   - Test concurrent updates
   - Test state persistence
4. **Extract generator logic**
   - Test randomness distribution
   - Test template compliance
   - Test difficulty scaling
5. **Update E2E tests**
   - Focus on complete game flows
   - Remove algorithm testing
   - Keep multiplayer coordination tests

## E2E Tests to Keep (Simplified)
- Create and play a game (happy path)
- Join multiplayer session
- Complete game with winner
- Share board publicly
- Real-time updates in multiplayer

## Success Criteria
- Win detection fully unit tested (100% coverage)
- Board validation extracted to unit tests
- Game state logic independently testable
- E2E tests reduced by 70% in size
- Generator logic has predictable test outcomes

## Priority: HIGH
Core game feature with complex business logic.