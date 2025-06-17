# Bingo Core E2E Test Enhancement Report

## Domain Overview
The Bingo Core domain encompasses board creation, editing, gameplay sessions, win detection, and sharing capabilities - the heart of the Arcadia gaming platform.

## Current State Analysis

### Test Coverage
- ✅ **Board Creation** (`board-creation.spec.ts`): Comprehensive validation and constraint testing
- ✅ **Board Editing** (`board-editing.spec.ts`): Drag-and-drop, card management, auto-save
- ✅ **Game Sessions** (`game-session.spec.ts`): Multiplayer, real-time sync, player management
- ✅ **Win Detection** (`win-detection.spec.ts`): All pattern types, multiplayer attribution
- ✅ **Board Sharing** (`board-sharing.spec.ts`): Permissions, collaboration, social features

### Type Safety Gaps

#### 1. **Critical Type Safety Issues**
- ❌ Multiple uses of `any` in test utilities:
  - Type assertions without validation in `board-creation.spec.ts` (lines 60-65, 70-75)
  - Missing type definitions for board state structure
  - No database type integration for board/card entities
- ❌ Implicit `any` in test data structures:
  - `BingoBoard` interface doesn't match database schema
  - `GameSession` lacks proper typing for realtime data
  - Card library operations missing type validation

#### 2. **Database Type Integration**
- ❌ Test interfaces don't use `Database['public']['Tables']['bingo_boards']['Row']`
- ❌ Missing type validation for board_state JSON field
- ❌ No type-safe validation for game settings
- ❌ Card data structure not aligned with database schema

#### 3. **Test Utility Patterns**
- ✅ Good modular utility structure in `bingo-test-utils.ts`
- ❌ Return types not using database types
- ❌ Missing type guards for API responses
- ❌ No Zod validation for complex data structures

### Error Handling Approaches
- ✅ Network disconnection simulation
- ✅ Concurrent action conflict resolution
- ❌ Missing error boundary testing for game crashes
- ❌ No type-safe error response handling
- ❌ Insufficient validation for malformed realtime messages

### Data Management Strategies
- ✅ Dynamic board creation helpers
- ✅ Pattern marking utilities
- ❌ Test data not using database constraints
- ❌ Missing cleanup for realtime connections
- ❌ No typed factories for complex game states

## Enhancement Plan

### Phase 1: Type Safety Improvements

#### 1.1 Database-Aligned Type Definitions
```typescript
// tests/features/bingo/types.ts
import { Database } from '@/types/database.types';
import { z } from 'zod';

// Type-safe board state schema
export const BoardStateSchema = z.object({
  cards: z.array(z.object({
    id: z.string(),
    text: z.string(),
    position: z.object({ row: z.number(), col: z.number() }),
    difficulty: z.enum(['easy', 'medium', 'hard'])
  })),
  size: z.number().min(3).max(6),
  pattern: z.enum(['line', 'diagonal', 'fourCorners', 'fullHouse', 'custom']).optional()
});

export type BoardState = z.infer<typeof BoardStateSchema>;

// Enhanced type-safe interfaces
export interface TypedBingoBoard extends Database['public']['Tables']['bingo_boards']['Row'] {
  board_state: BoardState;
  settings: GameSettings;
}

export interface TypedBingoCard extends Database['public']['Tables']['bingo_cards']['Row'] {
  // Additional runtime properties
  isPlaced?: boolean;
  position?: { row: number; col: number };
}

// Game session with proper typing
export interface TypedGameSession {
  id: string;
  boardId: string;
  hostId: string;
  players: Array<{
    id: string;
    username: string;
    color: string;
    isActive: boolean;
  }>;
  gameState: {
    markedCells: Map<string, string>; // cellId -> playerId
    winners: string[];
    status: 'waiting' | 'active' | 'paused' | 'completed';
  };
  createdAt: Date;
  updatedAt: Date;
}

// Settings schema for type validation
export const GameSettingsSchema = z.object({
  winPatterns: z.array(z.enum(['line', 'diagonal', 'fourCorners', 'fullHouse', 'X', 'plus'])),
  maxPlayers: z.number().min(2).max(20),
  timeLimit: z.number().optional(),
  isSpeedMode: z.boolean().default(false),
  allowSpectators: z.boolean().default(true)
});

export type GameSettings = z.infer<typeof GameSettingsSchema>;
```

#### 1.2 Type-Safe Test Utilities
```typescript
// tests/features/bingo/bingo-test-utils-typed.ts
import { Page, expect } from '@playwright/test';
import { TypedBingoBoard, TypedGameSession, BoardStateSchema, GameSettingsSchema } from './types';
import { Database } from '@/types/database.types';

export async function createTypedTestBoard(
  page: Page,
  options: Partial<Database['public']['Tables']['bingo_boards']['Insert']> = {}
): Promise<TypedBingoBoard> {
  const boardData: Database['public']['Tables']['bingo_boards']['Insert'] = {
    title: options.title || 'Test Board',
    game_type: options.game_type || 'valorant',
    difficulty: options.difficulty || 'medium',
    size: options.size || 5,
    is_public: options.is_public ?? true,
    board_state: options.board_state || { cards: [], size: 5 },
    settings: options.settings || { winPatterns: ['line'], maxPlayers: 10 },
    ...options
  };

  // Navigate and create board
  await page.goto('/play-area/bingo');
  await page.getByRole('button', { name: /create.*board/i }).click();
  
  // Type-safe form filling
  await fillBoardForm(page, boardData);
  await page.getByRole('button', { name: /create/i }).click();
  
  // Extract and validate response
  const response = await page.waitForResponse(resp => 
    resp.url().includes('/api/bingo/boards') && resp.status() === 201
  );
  
  const responseData = await response.json();
  const validatedBoard = validateBoardResponse(responseData);
  
  return validatedBoard;
}

function validateBoardResponse(data: unknown): TypedBingoBoard {
  // Runtime validation with Zod
  const boardSchema = z.object({
    id: z.string(),
    title: z.string(),
    board_state: BoardStateSchema,
    settings: GameSettingsSchema,
    // ... other fields
  });
  
  const validated = boardSchema.parse(data);
  return validated as TypedBingoBoard;
}

// Type-safe cell marking
export async function markCellTyped(
  page: Page,
  position: { row: number; col: number },
  expectedPlayer?: string
): Promise<void> {
  const cellId = `grid-cell-${position.row}-${position.col}`;
  const cell = page.getByTestId(cellId);
  
  await cell.click();
  
  // Type-safe attribute checking
  const markedBy = await cell.getAttribute('data-marked-by');
  if (expectedPlayer) {
    expect(markedBy).toBe(expectedPlayer);
  }
  
  // Validate mark was recorded
  await expect(cell).toHaveAttribute('data-marked', 'true');
}
```

### Phase 2: Enhanced Error Boundary Testing

#### 2.1 Game Crash Recovery Tests
```typescript
// tests/features/bingo/error-boundary.spec.ts
test.describe('Bingo Error Boundaries', () => {
  test('should recover from board state corruption', async ({ page }) => {
    await page.goto('/play-area/bingo/edit/test-board');
    
    // Inject corrupted state
    await page.evaluate(() => {
      const corruptedState = { invalid: 'data', no_cards: true };
      window.localStorage.setItem('bingo-board-state', JSON.stringify(corruptedState));
    });
    
    await page.reload();
    
    // Should show error boundary
    await expect(page.getByTestId('error-boundary')).toBeVisible();
    await expect(page.getByText(/board data corrupted/i)).toBeVisible();
    
    // Recovery action available
    const recoverButton = page.getByRole('button', { name: /recover board/i });
    await expect(recoverButton).toBeVisible();
    await recoverButton.click();
    
    // Board should load with default state
    await expect(page.getByTestId('bingo-grid')).toBeVisible();
  });

  test('should handle realtime connection failures gracefully', async ({ page, context }) => {
    await page.goto('/play-area/bingo/session/test-session');
    
    // Block WebSocket connections
    await context.route('wss://**', route => route.abort());
    
    // Should show connection error
    await expect(page.getByText(/connection lost/i)).toBeVisible();
    
    // Game should remain playable in offline mode
    await page.getByTestId('grid-cell-0-0').click();
    await expect(page.getByTestId('grid-cell-0-0')).toHaveAttribute('data-marked', 'true');
    
    // Show sync pending indicator
    await expect(page.getByText(/offline mode/i)).toBeVisible();
  });
});
```

### Phase 3: Realtime Type Safety

#### 3.1 Type-Safe Realtime Messages
```typescript
// tests/features/bingo/realtime-types.ts
import { z } from 'zod';

// Define all possible realtime message types
export const RealtimeMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('cell_marked'),
    payload: z.object({
      cellId: z.string(),
      playerId: z.string(),
      timestamp: z.string().datetime()
    })
  }),
  z.object({
    type: z.literal('player_joined'),
    payload: z.object({
      playerId: z.string(),
      username: z.string(),
      color: z.string()
    })
  }),
  z.object({
    type: z.literal('game_won'),
    payload: z.object({
      winnerId: z.string(),
      pattern: z.string(),
      winningCells: z.array(z.string())
    })
  }),
  // ... other message types
]);

export type RealtimeMessage = z.infer<typeof RealtimeMessageSchema>;

// Type-safe realtime handler
export async function handleRealtimeMessage(
  page: Page,
  handler: (msg: RealtimeMessage) => void
): Promise<void> {
  await page.evaluate((handlerStr) => {
    const ws = (window as any).__gameWebSocket;
    if (ws) {
      ws.addEventListener('message', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          // Validate message structure
          const validatedMsg = RealtimeMessageSchema.parse(data);
          eval(`(${handlerStr})`)(validatedMsg);
        } catch (error) {
          console.error('Invalid realtime message:', error);
        }
      });
    }
  }, handler.toString());
}
```

### Phase 4: Performance Testing with Types

#### 4.1 Type-Safe Performance Metrics
```typescript
interface BingoPerformanceMetrics {
  boardCreation: {
    duration: number;
    cardCount: number;
    boardSize: number;
  };
  cellMarking: {
    localDuration: number;
    syncDuration: number;
    roundTripTime: number;
  };
  winDetection: {
    detectionTime: number;
    patternType: string;
    cellCount: number;
  };
  realtimeSync: {
    averageLatency: number;
    maxLatency: number;
    droppedMessages: number;
  };
}

export async function measureBingoPerformance(
  page: Page,
  operation: () => Promise<void>
): Promise<Partial<BingoPerformanceMetrics>> {
  const metrics = await page.evaluate(() => {
    performance.mark('operation-start');
  });
  
  await operation();
  
  return await page.evaluate(() => {
    performance.mark('operation-end');
    performance.measure('operation', 'operation-start', 'operation-end');
    
    const measure = performance.getEntriesByName('operation')[0] as PerformanceMeasure;
    return {
      duration: measure.duration,
      timestamp: Date.now()
    };
  });
}
```

### Phase 5: Advanced Testing Patterns

#### 5.1 Property-Based Testing for Win Detection
```typescript
import { test } from '@playwright/test';
import fc from 'fast-check';

test('should detect all valid win patterns', async ({ page }) => {
  await fc.assert(
    fc.asyncProperty(
      fc.integer({ min: 3, max: 6 }), // board size
      fc.array(fc.record({
        row: fc.integer({ min: 0, max: 5 }),
        col: fc.integer({ min: 0, max: 5 })
      })), // marked cells
      async (boardSize, markedCells) => {
        // Create board and mark cells
        const board = await createTypedTestBoard(page, { size: boardSize });
        
        // Filter valid cells for board size
        const validCells = markedCells.filter(
          cell => cell.row < boardSize && cell.col < boardSize
        );
        
        await markCells(page, validCells);
        
        // Verify win detection is consistent
        const detectedWin = await page.getByText(/bingo/i).isVisible();
        const expectedWin = checkWinPattern(validCells, boardSize);
        
        expect(detectedWin).toBe(expectedWin);
      }
    )
  );
});
```

## Implementation Priority

### High Priority (Week 1)
1. **Type Safety**
   - Replace all `any` types with proper database types
   - Implement Zod validation for all API responses
   - Create typed test data generators
   - Fix type assertions in page.evaluate() calls

2. **Database Integration**
   - Align test interfaces with database schema
   - Validate JSON fields (board_state, settings)
   - Type-safe board and card creation

### Medium Priority (Week 2)
3. **Realtime Safety**
   - Implement typed realtime message handling
   - Add validation for WebSocket messages
   - Test malformed message handling

4. **Error Recovery**
   - Comprehensive error boundary tests
   - State corruption recovery
   - Network failure resilience

### Low Priority (Week 3)
5. **Advanced Patterns**
   - Property-based testing for win detection
   - Performance regression tests
   - Load testing for concurrent sessions

## Success Metrics
- ✅ Zero `any` types in bingo tests
- ✅ 100% of test data uses database types
- ✅ All realtime messages validated with Zod
- ✅ Error boundary coverage for all failure modes
- ✅ Performance benchmarks for all operations
- ✅ Property-based tests for win detection

## Migration Guide

### Step 1: Update Test Interfaces
```bash
# Find all interface definitions
grep -r "interface.*Bingo" tests/features/bingo/
# Update to extend database types
```

### Step 2: Add Type Validation
```bash
# Add Zod schemas for all data structures
# Validate API responses before using
```

### Step 3: Fix Type Assertions
```bash
# Find all type assertions
grep -r "as HTMLInputElement" tests/features/bingo/
# Replace with proper type guards
```

## Risks & Mitigations
- **Risk**: Complex realtime type validation impacting performance
  - **Mitigation**: Use selective validation for critical paths
- **Risk**: Breaking existing tests during migration
  - **Mitigation**: Parallel implementation with gradual cutover
- **Risk**: Database schema changes breaking tests
  - **Mitigation**: Generate types from database automatically

## Next Steps
1. Create typed test utilities module
2. Implement Zod schemas for all data structures
3. Migrate tests incrementally by file
4. Add comprehensive error boundary tests
5. Implement property-based testing for win detection