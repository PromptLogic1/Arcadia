// Native mock data generation utilities (faker.js replacement)
import type { Tables } from '../../types/database.types';

/**
 * Native data generation utilities
 */
const mockData = {
  randomString: (length = 8) => Math.random().toString(36).substring(2, 2 + length),
  randomId: () => Math.random().toString(36).substring(2, 15),
  randomInt: (min = 0, max = 100) => Math.floor(Math.random() * (max - min + 1)) + min,
  randomBool: () => Math.random() > 0.5,
  randomChoice: <T>(arr: T[]): T => {
    if (arr.length === 0) throw new Error('Cannot choose from empty array');
    const choice = arr[Math.floor(Math.random() * arr.length)];
    if (choice === undefined) throw new Error('Array choice is undefined');
    return choice;
  },
  randomDate: (daysAgo = 30) => {
    const now = Date.now();
    const randomTime = Math.random() * daysAgo * 24 * 60 * 60 * 1000;
    return new Date(now - randomTime).toISOString();
  },
  randomUsername: () => `user_${mockData.randomString(6)}`,
  randomEmail: () => `${mockData.randomString(8)}@test.com`,
};

/**
 * Centralized fixture factory for game-related test data
 * Provides type-safe mock data generation for all gaming features
 */

// Type aliases for better readability
type GameSession = Tables<'bingo_sessions'>;
type SessionPlayer = Tables<'bingo_session_players'>;
type Achievement = Tables<'user_achievements'>;
type SessionEvent = Tables<'bingo_session_events'>;
type GameBoard = Tables<'bingo_boards'>;
type GameCard = Tables<'bingo_cards'>;

// Extended types with computed properties
export type SessionWithStats = GameSession & {
  board_title?: string;
  host_username?: string;
  current_player_count?: number;
  max_players?: number;
  difficulty?: string;
  game_type?: string;
};

export type PlayerWithStatus = SessionPlayer & {
  is_active?: boolean;
  connection_status?: 'connected' | 'disconnected' | 'reconnecting';
};

// Board state types
export type CellState = {
  position: number;
  text: string;
  is_marked: boolean;
  marked_by: string | null;
  marked_at: string | null;
  color?: string | null;
};

export type BoardState = {
  cells: CellState[];
  version: number;
  pattern?: string;
  winning_cells?: number[];
};

/**
 * Main fixture factory
 */
export const gameFixtures = {
  /**
   * Generate a game session with proper types
   */
  session: (overrides?: Partial<SessionWithStats>): SessionWithStats => ({
    id: mockData.randomId(),
    board_id: mockData.randomId(),
    host_id: mockData.randomId(),
    session_code: mockData.randomString(6).toUpperCase(),
    status: mockData.randomChoice(['waiting', 'active', 'completed', 'cancelled']),
    created_at: mockData.randomDate(),
    updated_at: new Date().toISOString(),
    started_at: null,
    ended_at: null,
    winner_id: null,
    current_state: null,
    settings: {
      max_players: mockData.randomInt(2, 8),
      time_limit: mockData.randomBool() ? mockData.randomInt(300, 3600) : null,
      allow_spectators: mockData.randomBool(),
      auto_start: false,
      require_approval: false,
      password: null
    },
    version: 1,
    // Extended properties
    board_title: `Test Game ${mockData.randomString(4)}`,
    host_username: mockData.randomUsername(),
    current_player_count: mockData.randomInt(1, 4),
    max_players: mockData.randomInt(2, 8),
    difficulty: mockData.randomChoice(['beginner', 'easy', 'medium', 'hard', 'expert']),
    game_type: mockData.randomChoice(['Valorant', 'Minecraft', 'League of Legends', 'Fortnite']),
    ...overrides
  }),

  /**
   * Generate a session player with proper types
   */
  player: (overrides?: Partial<PlayerWithStatus>): PlayerWithStatus => ({
    user_id: mockData.randomId(),
    session_id: mockData.randomId(),
    display_name: mockData.randomUsername(),
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + mockData.randomString(),
    color: `#${mockData.randomString(6)}`,
    is_host: false,
    is_ready: true,
    joined_at: mockData.randomDate(),
    left_at: null,
    position: mockData.randomInt(0, 7),
    score: 0,
    team: null,
    created_at: mockData.randomDate(),
    updated_at: new Date().toISOString(),
    id: mockData.randomId(),
    // Extended properties
    is_active: true,
    connection_status: 'connected',
    ...overrides
  }),

  /**
   * Generate an achievement with proper types
   */
  achievement: (overrides?: Partial<Achievement>): Achievement => ({
    id: mockData.randomId(),
    user_id: mockData.randomId(),
    achievement_name: mockData.randomChoice([
      'first_win',
      'speedrun_master',
      'social_butterfly',
      'winning_streak',
      'perfect_game',
      'early_bird',
      'night_owl'
    ]),
    achievement_type: mockData.randomChoice(['game', 'skill', 'social', 'progression']),
    description: "Test description " + mockData.randomString(10),
    points: mockData.randomInt(10, 1000),
    unlocked_at: mockData.randomBool() ? mockData.randomDate() : null,
    created_at: mockData.randomDate(90),
    metadata: {
      icon: mockData.randomChoice(['trophy', 'star', 'medal', 'crown']),
      rarity: mockData.randomChoice(['common', 'rare', 'epic', 'legendary']),
      progress: mockData.randomInt(0, 10),
      max_progress: mockData.randomInt(1, 10)
    },
    ...overrides
  }),

  /**
   * Generate a session event with proper types
   */
  sessionEvent: (overrides?: Partial<SessionEvent>): SessionEvent => ({
    id: mockData.randomId(),
    session_id: mockData.randomId(),
    board_id: mockData.randomId(),
    event_type: mockData.randomChoice([
      'player_joined',
      'player_left',
      'game_started',
      'cell_marked',
      'cell_unmarked',
      'game_ended'
    ]),
    user_id: mockData.randomId(),
    player_id: mockData.randomId(),
    timestamp: Date.now(),
    cell_position: mockData.randomBool() ? mockData.randomInt(0, 24) : null,
    event_data: {},
    data: null,
    version: 1,
    created_at: mockData.randomDate(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Generate a game board with proper types
   */
  board: (overrides?: Partial<GameBoard>): GameBoard => ({
    id: mockData.randomId(),
    title: `Test Game ${mockData.randomString(4)}`,
    description: "Test board description " + mockData.randomString(20),
    creator_id: mockData.randomId(),
    game_type: mockData.randomChoice(['Valorant', 'Minecraft', 'League of Legends', 'Fortnite']),
    difficulty: mockData.randomChoice(['beginner', 'easy', 'medium', 'hard', 'expert']),
    size: 5,
    board_state: {
      cells: gameFixtures.boardState(),
      patterns: ['line', 'diagonal', 'full_house'],
      theme: mockData.randomChoice(['classic', 'dark', 'neon', 'minimalist'])
    },
    is_public: true,
    status: 'draft',
    settings: {
      time_limit: mockData.randomBool() ? mockData.randomInt(60, 3600) : null,
      win_conditions: ['line', 'diagonal'],
      allow_custom_marks: false
    },
    votes: mockData.randomInt(0, 1000),
    bookmarked_count: mockData.randomInt(0, 500),
    cloned_from: null,
    version: 1,
    created_at: mockData.randomDate(90),
    updated_at: mockData.randomDate(),
    ...overrides
  }),

  /**
   * Generate board state (cells)
   */
  boardState: (size = 25): CellState[] => {
    return Array.from({ length: size }, (_, i) => ({
      position: i,
      text: "Test cell " + mockData.randomString(3),
      is_marked: false,
      marked_by: null,
      marked_at: null,
      color: null
    }));
  },

  /**
   * Generate a marked board state with pattern
   */
  markedBoardState: (pattern: 'line' | 'diagonal' | 'corners' | 'random' = 'random'): CellState[] => {
    const cells = gameFixtures.boardState();
    const userId = mockData.randomId();
    const markTime = mockData.randomDate();
    const color = `#${mockData.randomString(6)}`;

    const markCell = (index: number) => {
      const cell = cells[index];
      if (cell) {
        cells[index] = {
          position: cell.position,
          text: cell.text,
          is_marked: true,
          marked_by: userId,
          marked_at: markTime,
          color
        };
      }
    };

    switch (pattern) {
      case 'line': {
        // Mark horizontal line (row 2)
        [10, 11, 12, 13, 14].forEach(markCell);
        break;
      }
      case 'diagonal': {
        // Mark diagonal from top-left to bottom-right
        [0, 6, 12, 18, 24].forEach(markCell);
        break;
      }
      case 'corners':
        // Mark all corners
        [0, 4, 20, 24].forEach(markCell);
        break;
      case 'random': {
        // Mark random cells
        const count = mockData.randomInt(3, 15);
        const indices = Array.from({length: 25}, (_, i) => i);
        indices.sort(() => Math.random() - 0.5);
        indices.slice(0, count).forEach(markCell);
        break;
      }
    }

    return cells;
  },

  /**
   * Generate a game card
   */
  card: (overrides?: Partial<GameCard>): GameCard => ({
    id: mockData.randomId(),
    title: "Test Card " + mockData.randomString(8),
    description: "Test description " + mockData.randomString(10),
    creator_id: mockData.randomId(),
    game_type: mockData.randomChoice(['Valorant', 'Minecraft', 'League of Legends', 'Fortnite']),
    difficulty: mockData.randomChoice(['beginner', 'easy', 'medium', 'hard', 'expert']),
    is_public: true,
    tags: ['fun', 'challenging', 'quick'].slice(0, mockData.randomInt(1, 3)),
    votes: mockData.randomInt(0, 100),
    created_at: mockData.randomDate(90),
    updated_at: mockData.randomDate(),
    ...overrides
  })
};

/**
 * Scenario generators for common test cases
 */
export const gameScenarios = {
  /**
   * Generate a waiting session with players
   */
  waitingSession: (playerCount = 3) => {
    const hostId = mockData.randomId();
    const sessionId = mockData.randomId();
    
    const session = gameFixtures.session({
      id: sessionId,
      host_id: hostId,
      status: 'waiting',
      current_player_count: playerCount,
      max_players: 4
    });

    const players = Array.from({ length: playerCount }, (_, i) => 
      gameFixtures.player({
        session_id: sessionId,
        user_id: i === 0 ? hostId : mockData.randomId(),
        is_host: i === 0,
        is_ready: true,
        position: i
      })
    );

    return { session, players };
  },

  /**
   * Generate an active game session with board state
   */
  activeGame: (playerCount = 4, markedCells = 5) => {
    const { session, players } = gameScenarios.waitingSession(playerCount);
    
    const activeSession = {
      ...session,
      status: 'active' as const,
      started_at: mockData.randomDate()
    };

    const boardState = gameFixtures.boardState();
    
    // Mark random cells by different players
    const indices = Array.from({length: 25}, (_, i) => i);
    indices.sort(() => Math.random() - 0.5);
    const markedIndices = indices.slice(0, markedCells);
    markedIndices.forEach((index, i) => {
      const player = players[i % players.length];
      const cell = boardState[index];
      if (player && cell) {
        boardState[index] = {
          position: cell.position,
          text: cell.text,
          is_marked: true,
          marked_by: player.user_id,
          marked_at: mockData.randomDate(),
          color: player.color
        };
      }
    });

    return { 
      session: activeSession, 
      players, 
      boardState,
      events: markedIndices.map(index => 
        gameFixtures.sessionEvent({
          session_id: activeSession.id,
          event_type: 'cell_marked',
          cell_position: index,
          user_id: boardState[index]?.marked_by || 'unknown'
        })
      )
    };
  },

  /**
   * Generate a completed game session
   */
  completedGame: (winnerId?: string) => {
    const { session, players, boardState } = gameScenarios.activeGame(4, 12);
    const randomPlayerIndex = mockData.randomInt(0, Math.max(0, players.length - 1));
    const winner = winnerId || (players[randomPlayerIndex]?.user_id ?? 'player1');
    
    return {
      session: {
        ...session,
        status: 'completed' as const,
        ended_at: mockData.randomDate(),
        winner_id: winner
      },
      players,
      boardState,
      completionEvent: gameFixtures.sessionEvent({
        session_id: session.id,
        event_type: 'game_ended',
        user_id: winner,
        event_data: {
          pattern: 'line',
          winning_cells: [10, 11, 12, 13, 14],
          duration: mockData.randomInt(60, 600)
        }
      })
    };
  },

  /**
   * Generate achievement progression
   */
  achievementProgression: (userId: string, count = 5) => {
    const achievements = Array.from({ length: count }, () => {
      const progress = mockData.randomInt(0, 100);
      const isUnlocked = progress === 100;
      
      return gameFixtures.achievement({
        user_id: userId,
        unlocked_at: isUnlocked ? mockData.randomDate() : null,
        metadata: {
          progress,
          max_progress: 100,
          icon: mockData.randomChoice(['waiting', 'active', 'completed', 'cancelled']),
          rarity: mockData.randomChoice(['waiting', 'active', 'completed', 'cancelled'])
        }
      });
    });

    return achievements;
  },

  /**
   * Generate speedrun data
   */
  speedrunSession: (boardId: string) => {
    const sessionId = mockData.randomId();
    const userId = mockData.randomId();
    
    return {
      session: gameFixtures.session({
        id: sessionId,
        board_id: boardId,
        status: 'active',
        game_type: 'speedrun',
        settings: {
          max_players: 1,
          time_limit: null,
          allow_spectators: false,
          auto_start: true,
          require_approval: false,
          password: null
        }
      }),
      player: gameFixtures.player({
        session_id: sessionId,
        user_id: userId,
        is_host: true
      }),
      timerData: {
        startTime: Date.now(),
        splits: [] as number[],
        isPaused: false,
        pausedDuration: 0
      }
    };
  }
};