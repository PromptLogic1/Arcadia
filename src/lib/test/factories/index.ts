/**
 * Test Data Factories
 *
 * Provides consistent test data generation for all tests.
 * Ensures type safety and realistic data patterns.
 */

import type { Tables } from '@/../../types/database.types';

// Counter for unique IDs
let idCounter = 1;

// Generate unique IDs
export const generateId = (prefix = 'id'): string => {
  const id = `${prefix}-${idCounter.toString().padStart(8, '0')}`;
  idCounter++;
  return id;
};

// Generate UUID-like IDs
export const generateUuid = (): string => {
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  const randomBytes = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256)
  );

  // Set version (4) and variant bits
  randomBytes[6] = (randomBytes[6]! & 0x0f) | 0x40;
  randomBytes[8] = (randomBytes[8]! & 0x3f) | 0x80;

  const uuid = [
    randomBytes.slice(0, 4),
    randomBytes.slice(4, 6),
    randomBytes.slice(6, 8),
    randomBytes.slice(8, 10),
    randomBytes.slice(10, 16),
  ]
    .map(group => group?.map(hex).join('') ?? '')
    .join('-');

  return uuid;
};

// User factory
export const createMockUser = (
  overrides?: Partial<Tables<'users'>>
): Tables<'users'> => ({
  id: generateUuid(),
  auth_id: generateUuid(),
  username: `user_${Date.now()}`,
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  bio: null,
  land: null,
  region: null,
  city: null,
  full_name: null,
  experience_points: null,
  last_login_at: null,
  role: null,
  achievements_visibility: null,
  profile_visibility: null,
  submissions_visibility: null,
  ...overrides,
});

// Bingo Board factory
export const createMockBingoBoard = (
  overrides?: Partial<Tables<'bingo_boards'>>
): Tables<'bingo_boards'> => ({
  id: generateUuid(),
  title: `Test Board ${Date.now()}`,
  description: 'A test bingo board',
  creator_id: generateUuid(),
  game_type: 'All Games',
  difficulty: 'medium',
  size: 5,
  is_public: true,
  status: 'active',
  board_state: null,
  settings: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  version: 1,
  votes: 0,
  bookmarked_count: 0,
  cloned_from: null,
  ...overrides,
});

// Bingo Card factory
export const createMockBingoCard = (
  overrides?: Partial<Tables<'bingo_cards'>>
): Tables<'bingo_cards'> => ({
  id: generateUuid(),
  title: `Test Card ${Date.now()}`,
  description: 'A test bingo card',
  creator_id: generateUuid(),
  game_type: 'All Games',
  difficulty: 'medium',
  is_public: true,
  votes: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  tags: null,
  ...overrides,
});

// Bingo Session factory
export const createMockBingoSession = (
  overrides?: Partial<Tables<'bingo_sessions'>>
): Tables<'bingo_sessions'> => ({
  id: generateUuid(),
  board_id: generateUuid(),
  host_id: generateUuid(),
  winner_id: null,
  status: 'waiting',
  session_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
  current_state: null,
  settings: {
    max_players: 50,
    allow_spectators: true,
    auto_start: false,
    time_limit: null,
    require_approval: false,
    password: null,
  },
  created_at: new Date().toISOString(),
  started_at: null,
  ended_at: null,
  updated_at: new Date().toISOString(),
  version: 1,
  ...overrides,
});

// Session Player factory
export const createMockSessionPlayer = (
  overrides?: Partial<Tables<'bingo_session_players'>>
): Tables<'bingo_session_players'> => ({
  id: generateUuid(),
  session_id: generateUuid(),
  user_id: generateUuid(),
  display_name: `Player ${Date.now()}`,
  color: '#FF0000',
  is_host: false,
  is_ready: false,
  score: 0,
  position: 1,
  team: null,
  avatar_url: null,
  joined_at: new Date().toISOString(),
  left_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Submission factory
export const createMockSubmission = (
  overrides?: Partial<Tables<'submissions'>>
): Tables<'submissions'> => ({
  id: generateUuid(),
  challenge_id: generateUuid(),
  user_id: generateUuid(),
  code: 'console.log("Hello World");',
  language: 'javascript',
  status: 'pending',
  results: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// User Statistics factory
export const createMockUserStatistics = (
  overrides?: Partial<Tables<'user_statistics'>>
): Tables<'user_statistics'> => ({
  user_id: generateUuid(),
  average_score: 0,
  current_win_streak: 0,
  fastest_win: null,
  favorite_pattern: null,
  games_completed: 0,
  games_won: 0,
  highest_score: 0,
  last_game_at: null,
  longest_win_streak: 0,
  patterns_completed: null,
  total_games: 0,
  total_playtime: 0,
  total_score: 0,
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Challenge factory
export const createMockChallenge = (
  overrides?: Partial<Tables<'challenges'>>
): Tables<'challenges'> => ({
  id: generateUuid(),
  title: `Challenge ${Date.now()}`,
  description: 'A test challenge',
  slug: `challenge-${Date.now()}`,
  difficulty: 'medium',
  status: 'published',
  category_id: null,
  created_by: generateUuid(),
  initial_code: null,
  solution_code: null,
  test_cases: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Community Event factory
export const createMockCommunityEvent = (
  overrides?: Partial<Tables<'community_events'>>
): Tables<'community_events'> => ({
  id: generateUuid(),
  title: `Event ${Date.now()}`,
  description: 'A test community event',
  organizer_id: generateUuid(),
  game_type: 'All Games',
  status: 'upcoming',
  start_date: new Date().toISOString(),
  end_date: null,
  max_participants: null,
  prize_pool: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Bingo Session Queue Entry factory
export const createMockBingoSessionQueueEntry = (
  overrides?: Partial<Tables<'bingo_session_queue'>>
): Tables<'bingo_session_queue'> => ({
  id: generateUuid(),
  session_id: generateUuid(),
  user_id: generateUuid(),
  player_name: `Player ${Date.now()}`,
  color: '#06b6d4',
  team: null,
  status: 'waiting',
  requested_at: new Date().toISOString(),
  processed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Complex data builders
export const createMockBoardWithCards = (
  boardOverrides?: Partial<Tables<'bingo_boards'>>,
  cardCount = 25
) => {
  const board = createMockBingoBoard(boardOverrides);
  const cards = Array.from({ length: cardCount }, (_, index) =>
    createMockBingoCard({
      title: `Card ${index + 1}`,
      game_type: board.game_type,
      difficulty: board.difficulty,
    })
  );

  return { board, cards };
};

export const createMockSessionWithPlayers = (
  sessionOverrides?: Partial<Tables<'bingo_sessions'>>,
  playerCount = 4
) => {
  const session = createMockBingoSession(sessionOverrides);
  const players = Array.from({ length: playerCount }, (_, index) =>
    createMockSessionPlayer({
      session_id: session.id,
      display_name: `Player ${index + 1}`,
    })
  );

  return { session, players };
};

// Reset ID counter for test isolation
export const resetIdCounter = () => {
  idCounter = 1;
};

// Export all factories
export const factories = {
  user: createMockUser,
  bingoBoard: createMockBingoBoard,
  bingoCard: createMockBingoCard,
  bingoSession: createMockBingoSession,
  sessionPlayer: createMockSessionPlayer,
  bingoSessionPlayer: createMockSessionPlayer, // Alias for consistency
  bingoSessionQueueEntry: createMockBingoSessionQueueEntry,
  submission: createMockSubmission,
  userStatistics: createMockUserStatistics,
  challenge: createMockChallenge,
  communityEvent: createMockCommunityEvent,
  // Complex builders
  boardWithCards: createMockBoardWithCards,
  sessionWithPlayers: createMockSessionWithPlayers,
};
