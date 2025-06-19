import type {
  BoardCell,
  GameState,
  BingoBoardSession,
  GamePlayer,
} from '../../types';
import {
  createBoardCell as _createBoardCell,
  createBingoSession as _createBingoSession,
  createGamePlayer as _createGamePlayer,
} from '../factories';

export const createMockBoardCell = (
  overrides: Partial<BoardCell> = {}
): BoardCell => ({
  text: 'Mock cell',
  colors: null,
  completed_by: null,
  blocked: false,
  is_marked: false,
  cell_id: 'mock-cell-id',
  version: 1,
  last_updated: Date.now(),
  last_modified_by: null,
  ...overrides,
});

export const createMockGameState = (
  overrides: Partial<GameState> = {}
): GameState => ({
  currentState: Array.from({ length: 25 }, (_, i) =>
    createMockBoardCell({
      cell_id: `cell-${i}`,
      text: `Cell ${i}`,
    })
  ),
  version: 1,
  lastUpdate: new Date().toISOString(),
  activePlayer: 'mock-player-1',
  ...overrides,
});

export const createMockSession = (
  overrides: Partial<BingoBoardSession> = {}
): BingoBoardSession => ({
  id: 'mock-session-id',
  board_id: 'mock-board-id',
  host_id: 'mock-host-id',
  session_code: 'MOCK123',
  status: 'active',
  current_state: createMockGameState().currentState,
  settings: {
    max_players: 4,
    allow_spectators: true,
    auto_start: false,
    time_limit: null,
    require_approval: false,
    password: null,
  },
  version: 1,
  winner_id: null,
  started_at: new Date().toISOString(),
  ended_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockPlayer = (
  overrides: Partial<GamePlayer> = {}
): GamePlayer => ({
  id: 'mock-player-id',
  name: 'Mock Player',
  color: '#06b6d4',
  hoverColor: '#0891b2',
  team: 0,
  avatarUrl: undefined,
  joinedAt: new Date(),
  isActive: true,
  ...overrides,
});

export const mockGameStates = {
  empty: createMockGameState({
    currentState: Array.from({ length: 25 }, (_, i) =>
      createMockBoardCell({
        cell_id: `cell-${i}`,
        is_marked: false,
      })
    ),
  }),

  nearWinHorizontal: createMockGameState({
    currentState: Array.from({ length: 25 }, (_, i) =>
      createMockBoardCell({
        cell_id: `cell-${i}`,
        is_marked: i >= 0 && i <= 3, // First row minus last cell
        completed_by: i >= 0 && i <= 3 ? ['player1'] : null,
      })
    ),
  }),

  completeHorizontal: createMockGameState({
    currentState: Array.from({ length: 25 }, (_, i) =>
      createMockBoardCell({
        cell_id: `cell-${i}`,
        is_marked: i >= 0 && i <= 4, // Complete first row
        completed_by: i >= 0 && i <= 4 ? ['player1'] : null,
      })
    ),
  }),

  diagonal: createMockGameState({
    currentState: Array.from({ length: 25 }, (_, i) =>
      createMockBoardCell({
        cell_id: `cell-${i}`,
        is_marked: i % 6 === 0, // Diagonal pattern (0, 6, 12, 18, 24)
        completed_by: i % 6 === 0 ? ['player1'] : null,
      })
    ),
  }),

  fourCorners: createMockGameState({
    currentState: Array.from({ length: 25 }, (_, i) =>
      createMockBoardCell({
        cell_id: `cell-${i}`,
        is_marked: [0, 4, 20, 24].includes(i), // Four corners
        completed_by: [0, 4, 20, 24].includes(i) ? ['player1'] : null,
      })
    ),
  }),

  fullHouse: createMockGameState({
    currentState: Array.from({ length: 25 }, (_, i) =>
      createMockBoardCell({
        cell_id: `cell-${i}`,
        is_marked: true, // All cells marked
        completed_by: ['player1'],
      })
    ),
  }),

  multiplePatterns: createMockGameState({
    currentState: Array.from({ length: 25 }, (_, i) =>
      createMockBoardCell({
        cell_id: `cell-${i}`,
        // Both first row (0-4) and first column (0, 5, 10, 15, 20)
        is_marked: (i >= 0 && i <= 4) || i % 5 === 0,
        completed_by: (i >= 0 && i <= 4) || i % 5 === 0 ? ['player1'] : null,
      })
    ),
  }),

  competitive: createMockGameState({
    currentState: Array.from({ length: 25 }, (_, i) => {
      // Player 1 controls even positions, Player 2 controls odd positions
      const isPlayer1 = i % 2 === 0;
      return createMockBoardCell({
        cell_id: `cell-${i}`,
        is_marked: Math.random() > 0.5, // Random 50% marked
        completed_by:
          Math.random() > 0.5 ? [isPlayer1 ? 'player1' : 'player2'] : null,
      });
    }),
  }),
};

export const mockSessionEvents = {
  cellMarked: {
    type: 'cell_marked' as const,
    sessionId: 'mock-session-id',
    playerId: 'player1',
    data: {
      cellPosition: 12,
      marked: true,
      timestamp: Date.now(),
    },
    timestamp: new Date(),
  },

  cellUnmarked: {
    type: 'cell_unmarked' as const,
    sessionId: 'mock-session-id',
    playerId: 'player1',
    data: {
      cellPosition: 12,
      marked: false,
      timestamp: Date.now(),
    },
    timestamp: new Date(),
  },

  playerJoined: {
    type: 'player_joined' as const,
    sessionId: 'mock-session-id',
    playerId: 'player2',
    data: {
      playerData: createMockPlayer({ id: 'player2', name: 'Player 2' }),
      timestamp: Date.now(),
    },
    timestamp: new Date(),
  },

  playerLeft: {
    type: 'player_left' as const,
    sessionId: 'mock-session-id',
    playerId: 'player2',
    data: {
      reason: 'disconnected',
      timestamp: Date.now(),
    },
    timestamp: new Date(),
  },

  gameEnded: {
    type: 'game_ended' as const,
    sessionId: 'mock-session-id',
    playerId: 'system',
    data: {
      winnerId: 'player1',
      winningPattern: 'horizontal',
      finalScore: 150,
      timestamp: Date.now(),
    },
    timestamp: new Date(),
  },
};

export const mockPerformanceScenarios = {
  smallBoard: {
    size: 3,
    cellCount: 9,
    expectedOperationTime: 5, // ms
  },

  mediumBoard: {
    size: 5,
    cellCount: 25,
    expectedOperationTime: 10, // ms
  },

  largeBoard: {
    size: 6,
    cellCount: 36,
    expectedOperationTime: 15, // ms
  },

  rapidOperations: {
    operationsPerSecond: 100,
    maxLatency: 50, // ms
    successRate: 0.95,
  },
};

export const mockConflictScenarios = {
  sameCell: {
    players: ['player1', 'player2'],
    targetCell: 12,
    action: 'mark' as const,
    expectedResolution: 'last-write-wins',
  },

  raceCondition: {
    players: ['player1', 'player2', 'player3'],
    targetCells: [0, 1, 2, 3, 4], // Competing for same row
    maxResolutionTime: 500, // ms
  },

  networkPartition: {
    disconnectedDuration: 2000, // ms
    actionsWhileDisconnected: 5,
    expectedSyncTime: 1000, // ms
  },
};

// Helper functions for creating test scenarios
export const createWinningBoard = (
  pattern: 'horizontal' | 'vertical' | 'diagonal' | 'corners'
): BoardCell[] => {
  const cells = Array.from({ length: 25 }, (_, i) =>
    createMockBoardCell({ cell_id: `cell-${i}` })
  );

  let winningPositions: number[] = [];

  switch (pattern) {
    case 'horizontal':
      winningPositions = [0, 1, 2, 3, 4]; // First row
      break;
    case 'vertical':
      winningPositions = [0, 5, 10, 15, 20]; // First column
      break;
    case 'diagonal':
      winningPositions = [0, 6, 12, 18, 24]; // Main diagonal
      break;
    case 'corners':
      winningPositions = [0, 4, 20, 24]; // Four corners
      break;
  }

  winningPositions.forEach(pos => {
    cells[pos] = createMockBoardCell({
      cell_id: `cell-${pos}`,
      is_marked: true,
      completed_by: ['player1'],
    });
  });

  return cells;
};

export const createMultiPlayerBoard = (
  playerActions: Record<string, number[]>
): BoardCell[] => {
  const cells = Array.from({ length: 25 }, (_, i) =>
    createMockBoardCell({ cell_id: `cell-${i}` })
  );

  Object.entries(playerActions).forEach(([playerId, positions]) => {
    positions.forEach(pos => {
      const cell = cells[pos];
      if (cell) {
        cell.is_marked = true;
        cell.completed_by = [...(cell.completed_by || []), playerId];
        cell.last_modified_by = playerId;
      }
    });
  });

  return cells;
};

export const createBoardWithConflicts = (): BoardCell[] => {
  const cells = Array.from({ length: 25 }, (_, i) =>
    createMockBoardCell({ cell_id: `cell-${i}` })
  );

  // Simulate conflicts on certain cells
  const conflictCells = [5, 12, 18];

  conflictCells.forEach(pos => {
    cells[pos] = createMockBoardCell({
      cell_id: `cell-${pos}`,
      is_marked: true,
      completed_by: ['player1', 'player2'], // Both players marked it
      // Conflicts are tracked by having multiple players in completed_by
      // with last_modified_by showing who won the conflict
      last_modified_by: 'player2',
      version: 2, // Higher version indicates conflict resolution
    });
  });

  return cells;
};
