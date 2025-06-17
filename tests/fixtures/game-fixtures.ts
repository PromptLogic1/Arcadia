import { faker } from '@faker-js/faker';
import type { Tables } from '@/types/database.types';

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
  color?: string;
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
    id: faker.string.uuid(),
    board_id: faker.string.uuid(),
    host_id: faker.string.uuid(),
    session_code: faker.string.alphanumeric(6).toUpperCase(),
    status: faker.helpers.arrayElement(['waiting', 'active', 'completed', 'cancelled']),
    created_at: faker.date.recent().toISOString(),
    updated_at: new Date().toISOString(),
    started_at: null,
    ended_at: null,
    winner_id: null,
    current_state: null,
    settings: {
      max_players: faker.number.int({ min: 2, max: 8 }),
      time_limit: faker.helpers.maybe(() => faker.number.int({ min: 300, max: 3600 })),
      allow_spectators: faker.datatype.boolean(),
      auto_start: false,
      require_approval: false
    },
    version: 1,
    // Extended properties
    board_title: faker.commerce.productName(),
    host_username: faker.internet.userName(),
    current_player_count: faker.number.int({ min: 1, max: 4 }),
    max_players: faker.number.int({ min: 2, max: 8 }),
    difficulty: faker.helpers.arrayElement(['easy', 'medium', 'hard']),
    game_type: faker.helpers.arrayElement(['bingo', 'speedrun', 'puzzle']),
    ...overrides
  }),

  /**
   * Generate a session player with proper types
   */
  player: (overrides?: Partial<PlayerWithStatus>): PlayerWithStatus => ({
    user_id: faker.string.uuid(),
    session_id: faker.string.uuid(),
    display_name: faker.internet.userName(),
    avatar_url: faker.image.avatar(),
    color: faker.color.rgb(),
    is_host: false,
    is_ready: true,
    joined_at: faker.date.recent().toISOString(),
    left_at: null,
    position: faker.number.int({ min: 0, max: 7 }),
    score: 0,
    team: null,
    created_at: faker.date.recent().toISOString(),
    updated_at: new Date().toISOString(),
    id: faker.string.uuid(),
    // Extended properties
    is_active: true,
    connection_status: 'connected',
    ...overrides
  }),

  /**
   * Generate an achievement with proper types
   */
  achievement: (overrides?: Partial<Achievement>): Achievement => ({
    id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    achievement_name: faker.helpers.arrayElement([
      'first_win',
      'speedrun_master',
      'social_butterfly',
      'winning_streak',
      'perfect_game',
      'early_bird',
      'night_owl'
    ]),
    achievement_type: faker.helpers.arrayElement(['gameplay', 'social', 'speedrun', 'milestone']),
    description: faker.lorem.sentence(),
    points: faker.helpers.arrayElement([10, 25, 50, 100, 250, 500]),
    unlocked_at: faker.helpers.maybe(() => faker.date.recent().toISOString()),
    created_at: faker.date.past().toISOString(),
    metadata: {
      icon: faker.helpers.arrayElement(['🏆', '⭐', '🎯', '🔥', '💎', '🚀']),
      rarity: faker.helpers.arrayElement(['common', 'uncommon', 'rare', 'epic', 'legendary']),
      progress: faker.number.int({ min: 0, max: 10 }),
      max_progress: faker.number.int({ min: 1, max: 10 })
    },
    ...overrides
  }),

  /**
   * Generate a session event with proper types
   */
  sessionEvent: (overrides?: Partial<SessionEvent>): SessionEvent => ({
    id: faker.string.uuid(),
    session_id: faker.string.uuid(),
    board_id: faker.string.uuid(),
    event_type: faker.helpers.arrayElement([
      'session_created',
      'player_joined',
      'player_left',
      'game_started',
      'cell_marked',
      'cell_unmarked',
      'game_completed',
      'session_ended'
    ]),
    user_id: faker.string.uuid(),
    player_id: faker.string.uuid(),
    timestamp: Date.now(),
    cell_position: faker.helpers.maybe(() => faker.number.int({ min: 0, max: 24 })),
    event_data: {},
    data: null,
    version: 1,
    created_at: faker.date.recent().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Generate a game board with proper types
   */
  board: (overrides?: Partial<GameBoard>): GameBoard => ({
    id: faker.string.uuid(),
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    creator_id: faker.string.uuid(),
    game_type: faker.helpers.arrayElement(['bingo', 'puzzle', 'trivia', 'speedrun']),
    difficulty: faker.helpers.arrayElement(['beginner', 'easy', 'medium', 'hard', 'expert']),
    size: 5,
    board_state: {
      cells: gameFixtures.boardState(),
      patterns: ['line', 'diagonal', 'full_house'],
      theme: faker.helpers.arrayElement(['classic', 'modern', 'neon', 'retro'])
    },
    is_public: true,
    status: 'published',
    settings: {
      time_limit: faker.helpers.maybe(() => faker.number.int({ min: 60, max: 3600 })),
      win_conditions: ['line', 'diagonal'],
      allow_custom_marks: false
    },
    votes: faker.number.int({ min: 0, max: 1000 }),
    bookmarked_count: faker.number.int({ min: 0, max: 500 }),
    cloned_from: null,
    version: 1,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides
  }),

  /**
   * Generate board state (cells)
   */
  boardState: (size: number = 25): CellState[] => {
    return Array.from({ length: size }, (_, i) => ({
      position: i,
      text: faker.lorem.words({ min: 1, max: 3 }),
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
    const userId = faker.string.uuid();
    const markTime = faker.date.recent().toISOString();
    const color = faker.color.rgb();

    const markCell = (index: number) => {
      cells[index] = {
        ...cells[index],
        is_marked: true,
        marked_by: userId,
        marked_at: markTime,
        color
      };
    };

    switch (pattern) {
      case 'line':
        // Mark horizontal line (row 2)
        [10, 11, 12, 13, 14].forEach(markCell);
        break;
      case 'diagonal':
        // Mark diagonal from top-left to bottom-right
        [0, 6, 12, 18, 24].forEach(markCell);
        break;
      case 'corners':
        // Mark all corners
        [0, 4, 20, 24].forEach(markCell);
        break;
      case 'random':
        // Mark random cells
        const count = faker.number.int({ min: 3, max: 15 });
        faker.helpers.shuffle([...Array(25).keys()])
          .slice(0, count)
          .forEach(markCell);
        break;
    }

    return cells;
  },

  /**
   * Generate a game card
   */
  card: (overrides?: Partial<GameCard>): GameCard => ({
    id: faker.string.uuid(),
    title: faker.lorem.words({ min: 2, max: 5 }),
    description: faker.lorem.sentence(),
    creator_id: faker.string.uuid(),
    game_type: faker.helpers.arrayElement(['bingo', 'puzzle', 'trivia', 'speedrun']),
    difficulty: faker.helpers.arrayElement(['beginner', 'easy', 'medium', 'hard', 'expert']),
    is_public: true,
    tags: faker.helpers.arrayElements(
      ['fun', 'challenging', 'quick', 'strategic', 'casual', 'competitive'],
      { min: 1, max: 3 }
    ),
    votes: faker.number.int({ min: 0, max: 100 }),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
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
  waitingSession: (playerCount: number = 3) => {
    const hostId = faker.string.uuid();
    const sessionId = faker.string.uuid();
    
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
        user_id: i === 0 ? hostId : faker.string.uuid(),
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
  activeGame: (playerCount: number = 4, markedCells: number = 5) => {
    const { session, players } = gameScenarios.waitingSession(playerCount);
    
    const activeSession = {
      ...session,
      status: 'active' as const,
      started_at: faker.date.recent().toISOString()
    };

    const boardState = gameFixtures.boardState();
    
    // Mark random cells by different players
    const markedIndices = faker.helpers.shuffle([...Array(25).keys()]).slice(0, markedCells);
    markedIndices.forEach((index, i) => {
      const player = players[i % players.length];
      boardState[index] = {
        ...boardState[index],
        is_marked: true,
        marked_by: player.user_id,
        marked_at: faker.date.recent().toISOString(),
        color: player.color
      };
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
          user_id: boardState[index].marked_by!
        })
      )
    };
  },

  /**
   * Generate a completed game session
   */
  completedGame: (winnerId?: string) => {
    const { session, players, boardState } = gameScenarios.activeGame(4, 12);
    const winner = winnerId || players[faker.number.int({ min: 0, max: players.length - 1 })].user_id;
    
    return {
      session: {
        ...session,
        status: 'completed' as const,
        ended_at: faker.date.recent().toISOString(),
        winner_id: winner
      },
      players,
      boardState,
      completionEvent: gameFixtures.sessionEvent({
        session_id: session.id,
        event_type: 'game_completed',
        user_id: winner,
        event_data: {
          pattern: 'line',
          winning_cells: [10, 11, 12, 13, 14],
          duration: faker.number.int({ min: 60, max: 600 })
        }
      })
    };
  },

  /**
   * Generate achievement progression
   */
  achievementProgression: (userId: string, count: number = 5) => {
    const achievements = Array.from({ length: count }, (_, i) => {
      const progress = faker.number.int({ min: 0, max: 100 });
      const isUnlocked = progress === 100;
      
      return gameFixtures.achievement({
        user_id: userId,
        unlocked_at: isUnlocked ? faker.date.recent().toISOString() : null,
        metadata: {
          progress,
          max_progress: 100,
          icon: faker.helpers.arrayElement(['🏆', '⭐', '🎯', '🔥', '💎']),
          rarity: faker.helpers.arrayElement(['common', 'uncommon', 'rare', 'epic', 'legendary'])
        }
      });
    });

    return achievements;
  },

  /**
   * Generate speedrun data
   */
  speedrunSession: (boardId: string) => {
    const sessionId = faker.string.uuid();
    const userId = faker.string.uuid();
    
    return {
      session: gameFixtures.session({
        id: sessionId,
        board_id: boardId,
        status: 'active',
        game_type: 'speedrun',
        settings: {
          max_players: 1,
          time_limit: null,
          speedrun_mode: true
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