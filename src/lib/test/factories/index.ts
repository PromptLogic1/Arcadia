/**
 * Test Data Factories
 * 
 * Provides consistent test data generation for all tests.
 * Ensures type safety and realistic data patterns.
 */

import type { Tables } from '@/types/database.types';
import type { Database } from '@/types/database.types';

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
  const randomBytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  
  // Set version (4) and variant bits
  randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40;
  randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80;
  
  const uuid = [
    randomBytes.slice(0, 4),
    randomBytes.slice(4, 6),
    randomBytes.slice(6, 8),
    randomBytes.slice(8, 10),
    randomBytes.slice(10, 16),
  ]
    .map(group => group.map(hex).join(''))
    .join('-');
  
  return uuid;
};

// User factory
export const createMockUser = (overrides?: Partial<Tables<'users'>>): Tables<'users'> => ({
  id: generateUuid(),
  auth_id: generateUuid(),
  email: `user-${Date.now()}@example.com`,
  username: `user_${Date.now()}`,
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  bio: null,
  land: null,
  region: null,
  city: null,
  ...overrides,
});

// Bingo Board factory
export const createMockBingoBoard = (overrides?: Partial<Tables<'bingo_boards'>>): Tables<'bingo_boards'> => ({
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
export const createMockBingoCard = (overrides?: Partial<Tables<'bingo_cards'>>): Tables<'bingo_cards'> => ({
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
export const createMockBingoSession = (overrides?: Partial<Tables<'bingo_sessions'>>): Tables<'bingo_sessions'> => ({
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
export const createMockSessionPlayer = (overrides?: Partial<Tables<'session_players'>>): Tables<'session_players'> => ({
  id: generateUuid(),
  session_id: generateUuid(),
  user_id: generateUuid(),
  player_name: `Player ${Date.now()}`,
  board_state: null,
  joined_at: new Date().toISOString(),
  last_seen: new Date().toISOString(),
  is_active: true,
  is_spectator: false,
  completed_items: 0,
  board_size: 25,
  winning_pattern: null,
  won_at: null,
  ...overrides,
});

// Submission factory
export const createMockSubmission = (overrides?: Partial<Tables<'submissions'>>): Tables<'submissions'> => ({
  id: generateUuid(),
  session_id: generateUuid(),
  player_id: generateUuid(),
  card_id: generateUuid(),
  evidence_url: null,
  evidence_type: null,
  status: 'pending',
  submitted_at: new Date().toISOString(),
  reviewed_at: null,
  reviewed_by: null,
  reviewer_notes: null,
  ...overrides,
});

// Board Collection factory
export const createMockBoardCollection = (overrides?: Partial<Tables<'board_collections'>>): Tables<'board_collections'> => ({
  id: generateUuid(),
  user_id: generateUuid(),
  name: `Collection ${Date.now()}`,
  description: null,
  is_public: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  board_count: 0,
  ...overrides,
});

// User Settings factory
export const createMockUserSettings = (overrides?: Partial<Tables<'user_settings'>>): Tables<'user_settings'> => ({
  id: generateUuid(),
  user_id: generateUuid(),
  theme: 'dark',
  email_notifications: true,
  sound_enabled: true,
  auto_ready: false,
  show_timer: true,
  board_animation: true,
  compact_view: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Game Settings factory
export const createMockGameSettings = (overrides?: Partial<Tables<'game_settings'>>): Tables<'game_settings'> => ({
  id: generateUuid(),
  session_id: generateUuid(),
  win_condition: 'full_house',
  allow_custom_patterns: false,
  patterns: ['line', 'diagonal', 'four_corners'],
  marking_mode: 'manual',
  reveal_cards: true,
  team_mode: false,
  powerups_enabled: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Board Cards Join factory
export const createMockBoardCard = (overrides?: Partial<Tables<'board_cards'>>): Tables<'board_cards'> => ({
  id: generateUuid(),
  board_id: generateUuid(),
  card_id: generateUuid(),
  position: 0,
  created_at: new Date().toISOString(),
  ...overrides,
});

// Collection Boards Join factory
export const createMockCollectionBoard = (overrides?: Partial<Tables<'collection_boards'>>): Tables<'collection_boards'> => ({
  id: generateUuid(),
  collection_id: generateUuid(),
  board_id: generateUuid(),
  added_at: new Date().toISOString(),
  added_by: generateUuid(),
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
  
  const boardCards = cards.map((card, index) => 
    createMockBoardCard({
      board_id: board.id,
      card_id: card.id,
      position: index,
    })
  );

  return { board, cards, boardCards };
};

export const createMockSessionWithPlayers = (
  sessionOverrides?: Partial<Tables<'bingo_sessions'>>,
  playerCount = 4
) => {
  const session = createMockBingoSession(sessionOverrides);
  const players = Array.from({ length: playerCount }, (_, index) => 
    createMockSessionPlayer({
      session_id: session.id,
      player_name: `Player ${index + 1}`,
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
  submission: createMockSubmission,
  boardCollection: createMockBoardCollection,
  userSettings: createMockUserSettings,
  gameSettings: createMockGameSettings,
  boardCard: createMockBoardCard,
  collectionBoard: createMockCollectionBoard,
  // Complex builders
  boardWithCards: createMockBoardWithCards,
  sessionWithPlayers: createMockSessionWithPlayers,
};