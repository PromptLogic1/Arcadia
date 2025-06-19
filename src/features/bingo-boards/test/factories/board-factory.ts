import type {
  BoardCell,
  BingoBoard,
  BingoBoardSession,
  BingoCard,
  GamePlayer,
} from '../../types';
import type { Difficulty, GameCategory, Database } from '../../../../types';

// Counter for unique IDs
let idCounter = 0;

// Get next unique ID
function getNextId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

// Reset ID counter (useful between tests)
export function resetIdCounter(): void {
  idCounter = 0;
}

// Board Cell Factory
export function createBoardCell(overrides: Partial<BoardCell> = {}): BoardCell {
  return {
    text: 'Test Cell',
    colors: null,
    completed_by: null,
    blocked: false,
    is_marked: false,
    cell_id: getNextId('cell'),
    version: 1,
    last_updated: Date.now(),
    last_modified_by: null,
    ...overrides,
  };
}

// Bingo Board Factory
export function createBingoBoard(
  overrides: Partial<BingoBoard> = {}
): BingoBoard {
  const now = new Date().toISOString();
  return {
    id: getNextId('board'),
    title: 'Test Board',
    description: 'A test bingo board',
    game_type: 'All Games' as GameCategory,
    difficulty: 'medium' as Difficulty,
    size: 5,
    board_state: null,
    settings: null,
    is_public: true,
    status: 'active',
    creator_id: getNextId('user'),
    cloned_from: null,
    created_at: now,
    updated_at: now,
    votes: 0,
    bookmarked_count: 0,
    version: 1,
    ...overrides,
  };
}

// Bingo Session Factory
export function createBingoSession(
  overrides: Partial<BingoBoardSession> = {}
): BingoBoardSession {
  const now = new Date().toISOString();
  return {
    id: getNextId('session'),
    board_id: getNextId('board'),
    host_id: getNextId('user'),
    session_code: generateSessionCode(),
    status: 'active',
    current_state: null,
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
    started_at: now,
    ended_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// Bingo Card Factory
export function createBingoCard(overrides: Partial<BingoCard> = {}): BingoCard {
  const now = new Date().toISOString();
  return {
    id: getNextId('card'),
    title: 'Test Card',
    description: 'A test bingo card',
    game_type: 'All Games' as GameCategory,
    difficulty: 'medium' as Difficulty,
    tags: ['test'],
    is_public: true,
    creator_id: null,
    created_at: now,
    updated_at: now,
    votes: 0,
    ...overrides,
  };
}

// Game Player Factory
export function createGamePlayer(
  overrides: Partial<GamePlayer> = {}
): GamePlayer {
  const playerId = getNextId('player');
  return {
    id: playerId,
    name: `Player ${playerId}`,
    color: '#06b6d4',
    hoverColor: '#0891b2',
    team: 0,
    avatarUrl: undefined,
    joinedAt: new Date(),
    isActive: true,
    ...overrides,
  };
}

// Helper to generate a realistic session code
function generateSessionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Helper to create a board with cells
export function createBoardWithCells(
  size = 5,
  markedPositions: number[] = [],
  boardOverrides: Partial<BingoBoard> = {}
): { board: BingoBoard; cells: BoardCell[] } {
  const cellCount = size * size;
  const cells = Array.from({ length: cellCount }, (_, i) =>
    createBoardCell({
      text: `Cell ${i}`,
      cell_id: `cell-${i}`,
      is_marked: markedPositions.includes(i),
      completed_by: markedPositions.includes(i) ? ['player-1'] : null,
    })
  );

  const board = createBingoBoard({
    size,
    board_state:
      cells as unknown as Database['public']['Tables']['bingo_boards']['Row']['board_state'],
    ...boardOverrides,
  });

  return { board, cells };
}

// Helper to create a complete game session
export function createCompleteGameSession(
  playerCount = 2,
  sessionOverrides: Partial<BingoBoardSession> = {}
): {
  session: BingoBoardSession;
  board: BingoBoard;
  players: GamePlayer[];
  cells: BoardCell[];
} {
  const { board, cells } = createBoardWithCells();
  const players = Array.from({ length: playerCount }, (_, i) => {
    const colors = ['#06b6d4', '#8b5cf6', '#ec4899', '#10b981'];
    return createGamePlayer({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      color: colors[i] || '#06b6d4',
    });
  });

  const session = createBingoSession({
    board_id: board.id,
    host_id: players[0]?.id,
    current_state: cells,
    players,
    ...sessionOverrides,
  });

  return { session, board, players, cells };
}
