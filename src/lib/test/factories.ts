/**
 * Test Data Factories
 * 
 * Provides factory functions for creating test data objects.
 * These factories ensure consistent test data and reduce test boilerplate.
 */

import type { Tables, Enums } from '@/types/database.types';
import type { Database } from '@/types/database.types';

// Counter for generating unique IDs
let idCounter = 0;

/**
 * Reset the ID counter for consistent test results
 */
export const resetIdCounter = (): void => {
  idCounter = 0;
};

/**
 * Generate a unique ID for testing
 */
const generateId = (): string => {
  idCounter += 1;
  return `test-${idCounter.toString().padStart(3, '0')}`;
};

/**
 * Generate a UUID for testing
 */
const generateUUID = (): string => {
  // Generate a valid UUID v4 format for testing
  return `123e4567-e89b-12d3-a456-${(1000000000000 + idCounter).toString().padStart(12, '0')}`;
};

/**
 * Generate an ISO timestamp
 */
const generateTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Type-safe partial override utility
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * User factory
 */
export const user = (overrides: DeepPartial<Tables<'users'>> = {}): Tables<'users'> => {
  const id = generateUUID();
  return {
    id,
    auth_id: overrides.auth_id || `auth-${generateId()}`,
    username: overrides.username || `user${idCounter}`,
    full_name: overrides.full_name || `Test User ${idCounter}`,
    email: overrides.email || `user${idCounter}@example.com`,
    avatar_url: overrides.avatar_url || null,
    bio: overrides.bio || null,
    city: overrides.city || null,
    land: overrides.land || null,
    region: overrides.region || null,
    created_at: overrides.created_at || generateTimestamp(),
    updated_at: overrides.updated_at || generateTimestamp(),
    last_login_at: overrides.last_login_at || null,
    role: overrides.role || 'user',
    experience_points: overrides.experience_points || 0,
    profile_visibility: overrides.profile_visibility || 'public',
    achievements_visibility: overrides.achievements_visibility || 'public',
    submissions_visibility: overrides.submissions_visibility || 'public',
    ...overrides,
  };
};

/**
 * Bingo Board factory
 */
export const bingoBoard = (overrides: DeepPartial<Tables<'bingo_boards'>> = {}): Tables<'bingo_boards'> => {
  const id = generateUUID();
  return {
    id,
    title: overrides.title || `Test Board ${idCounter}`,
    description: overrides.description || `Test board description ${idCounter}`,
    creator_id: overrides.creator_id || generateUUID(),
    game_type: overrides.game_type || 'All Games',
    difficulty: overrides.difficulty || 'medium',
    size: overrides.size || 25,
    is_public: overrides.is_public ?? true,
    status: overrides.status || 'active',
    board_state: overrides.board_state || null,
    settings: overrides.settings || null,
    votes: overrides.votes || 0,
    bookmarked_count: overrides.bookmarked_count || 0,
    version: overrides.version || 1,
    cloned_from: overrides.cloned_from || null,
    created_at: overrides.created_at || generateTimestamp(),
    updated_at: overrides.updated_at || generateTimestamp(),
    ...overrides,
  };
};

/**
 * Bingo Card factory
 */
export const bingoCard = (overrides: DeepPartial<Tables<'bingo_cards'>> = {}): Tables<'bingo_cards'> => {
  const id = generateUUID();
  return {
    id,
    title: overrides.title || `Test Card ${idCounter}`,
    description: overrides.description || `Test card description ${idCounter}`,
    creator_id: overrides.creator_id || generateUUID(),
    game_type: overrides.game_type || 'All Games',
    difficulty: overrides.difficulty || 'medium',
    is_public: overrides.is_public ?? true,
    tags: overrides.tags || null,
    votes: overrides.votes || 0,
    created_at: overrides.created_at || generateTimestamp(),
    updated_at: overrides.updated_at || generateTimestamp(),
    ...overrides,
  };
};

/**
 * Bingo Session factory
 */
export const bingoSession = (overrides: DeepPartial<Tables<'bingo_sessions'>> = {}): Tables<'bingo_sessions'> => {
  const id = generateUUID();
  return {
    id,
    board_id: overrides.board_id || generateUUID(),
    host_id: overrides.host_id || generateUUID(),
    session_code: overrides.session_code || `SESSION${idCounter}`,
    status: overrides.status || 'waiting',
    current_state: overrides.current_state || null,
    settings: overrides.settings || null,
    version: overrides.version || 1,
    winner_id: overrides.winner_id || null,
    created_at: overrides.created_at || generateTimestamp(),
    updated_at: overrides.updated_at || generateTimestamp(),
    started_at: overrides.started_at || null,
    ended_at: overrides.ended_at || null,
    ...overrides,
  };
};

/**
 * Bingo Session Player factory
 */
export const bingoSessionPlayer = (overrides: DeepPartial<Tables<'bingo_session_players'>> = {}): Tables<'bingo_session_players'> => {
  return {
    id: overrides.id || generateUUID(),
    session_id: overrides.session_id || generateUUID(),
    user_id: overrides.user_id || generateUUID(),
    display_name: overrides.display_name || `Player ${idCounter}`,
    color: overrides.color || '#FF0000',
    is_host: overrides.is_host ?? false,
    is_ready: overrides.is_ready ?? false,
    score: overrides.score || 0,
    position: overrides.position || idCounter,
    team: overrides.team || null,
    avatar_url: overrides.avatar_url || null,
    joined_at: overrides.joined_at || generateTimestamp(),
    left_at: overrides.left_at || null,
    created_at: overrides.created_at || generateTimestamp(),
    updated_at: overrides.updated_at || generateTimestamp(),
    ...overrides,
  };
};

/**
 * Challenge factory
 */
export const challenge = (overrides: DeepPartial<Tables<'challenges'>> = {}): Tables<'challenges'> => {
  const id = generateUUID();
  return {
    id,
    title: overrides.title || `Test Challenge ${idCounter}`,
    description: overrides.description || `Test challenge description ${idCounter}`,
    slug: overrides.slug || `test-challenge-${idCounter}`,
    difficulty: overrides.difficulty || 'medium',
    status: overrides.status || 'published',
    category_id: overrides.category_id || null,
    created_by: overrides.created_by || generateUUID(),
    initial_code: overrides.initial_code || null,
    solution_code: overrides.solution_code || null,
    test_cases: overrides.test_cases || null,
    created_at: overrides.created_at || generateTimestamp(),
    updated_at: overrides.updated_at || generateTimestamp(),
    ...overrides,
  };
};

/**
 * Community Event factory
 */
export const communityEvent = (overrides: DeepPartial<Tables<'community_events'>> = {}): Tables<'community_events'> => {
  const id = generateUUID();
  return {
    id,
    title: overrides.title || `Test Event ${idCounter}`,
    description: overrides.description || `Test event description ${idCounter}`,
    organizer_id: overrides.organizer_id || generateUUID(),
    game_type: overrides.game_type || 'All Games',
    status: overrides.status || 'upcoming',
    start_date: overrides.start_date || generateTimestamp(),
    end_date: overrides.end_date || null,
    max_participants: overrides.max_participants || null,
    prize_pool: overrides.prize_pool || null,
    created_at: overrides.created_at || generateTimestamp(),
    updated_at: overrides.updated_at || generateTimestamp(),
    ...overrides,
  };
};

/**
 * Submission factory
 */
export const submission = (overrides: DeepPartial<Tables<'submissions'>> = {}): Tables<'submissions'> => {
  const id = generateUUID();
  return {
    id,
    challenge_id: overrides.challenge_id || generateUUID(),
    user_id: overrides.user_id || generateUUID(),
    code: overrides.code || 'console.log("Hello World");',
    language: overrides.language || 'javascript',
    status: overrides.status || 'pending',
    results: overrides.results || null,
    created_at: overrides.created_at || generateTimestamp(),
    updated_at: overrides.updated_at || generateTimestamp(),
    ...overrides,
  };
};

/**
 * Export all factories as a single object
 */
export const factories = {
  user,
  bingoBoard,
  bingoCard,
  bingoSession,
  bingoSessionPlayer,
  challenge,
  communityEvent,
  submission,
  resetIdCounter,
};

/**
 * Utility functions for creating common test scenarios
 */
export const createUserWithBoards = (boardCount = 3) => {
  const testUser = user();
  const boards = Array.from({ length: boardCount }, () =>
    bingoBoard({ creator_id: testUser.id })
  );
  return { user: testUser, boards };
};

export const createSessionWithPlayers = (playerCount = 4) => {
  const session = bingoSession();
  const players = Array.from({ length: playerCount }, (_, index) =>
    bingoSessionPlayer({
      session_id: session.id,
      is_host: index === 0,
    })
  );
  return { session, players };
};

export const createEventWithParticipants = (participantCount = 10) => {
  const event = communityEvent();
  const participants = Array.from({ length: participantCount }, () => user());
  return { event, participants };
};