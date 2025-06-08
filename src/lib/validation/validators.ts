/**
 * SERVICE VALIDATORS - Eliminates ALL type assertions in critical services
 *
 * REPLACES: All `data as Type` with proper runtime validation
 * ENSURES: No blind casting, no runtime crashes from invalid data
 */

import type { ValidationResult } from './types';
import type { Database, Tables, Json } from '@/types/database.types';

// These types need to be defined or imported from somewhere else
type UserId = string;
type BoardId = string;
type SessionId = string;
type CardId = string;
// safeValidate is available if needed

// Type guard for Json type
function isValidJson(value: unknown): value is Json {
  if (value === null) return true;

  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
      return true;
    case 'object':
      // value is object type here, but could still be null (checked above)
      if (Array.isArray(value)) {
        return value.every(isValidJson);
      }
      // For non-array objects, we need to check all properties
      // This is a known limitation - we can't iterate unknown objects without narrowing
      // Using Object.prototype methods to safely check
      try {
        // Use Object.keys which is type-safe
        const objKeys = Object.keys(value);
        for (const key of objKeys) {
          // Access property safely through bracket notation
          const descriptor = Object.getOwnPropertyDescriptor(value, key);
          if (
            descriptor &&
            descriptor.value !== undefined &&
            !isValidJson(descriptor.value)
          ) {
            return false;
          }
        }
        return true;
      } catch {
        return false;
      }
    default:
      return false;
  }
}

// Type guard for session settings
function isValidSessionSettings(value: unknown): value is {
  max_players: number | null;
  allow_spectators: boolean | null;
  auto_start: boolean | null;
  time_limit: number | null;
  require_approval: boolean | null;
  password: string | null;
} | null {
  if (value === null) return true;
  if (typeof value !== 'object' || value === null) return false;

  // Use 'in' operator for type narrowing instead of type assertion
  const hasValidShape =
    (!('max_players' in value) ||
      value.max_players === null ||
      typeof value.max_players === 'number') &&
    (!('allow_spectators' in value) ||
      value.allow_spectators === null ||
      typeof value.allow_spectators === 'boolean') &&
    (!('auto_start' in value) ||
      value.auto_start === null ||
      typeof value.auto_start === 'boolean') &&
    (!('time_limit' in value) ||
      value.time_limit === null ||
      typeof value.time_limit === 'number') &&
    (!('require_approval' in value) ||
      value.require_approval === null ||
      typeof value.require_approval === 'boolean') &&
    (!('password' in value) ||
      value.password === null ||
      typeof value.password === 'string');

  return hasValidShape;
}

// Type guards for database enums
function isGameCategory(
  value: unknown
): value is Database['public']['Enums']['game_category'] {
  return (
    typeof value === 'string' &&
    [
      'All Games',
      'World of Warcraft',
      'Fortnite',
      'Minecraft',
      'Among Us',
      'Apex Legends',
      'League of Legends',
      'Overwatch',
      'Call of Duty: Warzone',
      'Valorant',
      'CS:GO',
      'Dota 2',
      'Rocket League',
      'Fall Guys',
      'Dead by Daylight',
      'Cyberpunk 2077',
      'The Witcher 3',
      'Elden Ring',
      'Dark Souls',
      'Bloodborne',
      'Sekiro',
      'Hollow Knight',
      'Celeste',
      'Hades',
      'The Binding of Isaac',
      'Risk of Rain 2',
      'Deep Rock Galactic',
      'Valheim',
    ].includes(value)
  );
}

function isDifficultyLevel(
  value: unknown
): value is Database['public']['Enums']['difficulty_level'] {
  return (
    typeof value === 'string' &&
    ['beginner', 'easy', 'medium', 'hard', 'expert'].includes(value)
  );
}

function isBoardStatus(
  value: unknown
): value is Database['public']['Enums']['board_status'] {
  return (
    typeof value === 'string' &&
    ['draft', 'active', 'paused', 'completed', 'archived'].includes(value)
  );
}

function isSessionStatus(
  value: unknown
): value is Database['public']['Enums']['session_status'] {
  return (
    typeof value === 'string' &&
    ['waiting', 'active', 'completed', 'cancelled'].includes(value)
  );
}

// =============================================================================
// USER DATA VALIDATORS - REPLACES: auth.service.ts `data as UserData`
// =============================================================================

/**
 * Validates user data from auth service - REPLACES: `data as UserData`
 */
export function validateUserData(data: unknown): ValidationResult<{
  id: string;
  auth_id: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  bio: string | null;
  land: string | null;
  region: string | null;
  city: string | null;
}> {
  if (!data || typeof data !== 'object' || data === null) {
    return {
      success: false,
      data: null,
      error: 'User data must be an object',
    };
  }

  // Type guard to check required properties exist
  if (!('id' in data) || !('auth_id' in data)) {
    return {
      success: false,
      data: null,
      error: 'Missing required fields',
    };
  }

  // Now TypeScript knows data has 'id' and 'auth_id' properties
  if (typeof data.id !== 'string') {
    return {
      success: false,
      data: null,
      error: 'User ID must be a string',
    };
  }

  if (typeof data.auth_id !== 'string') {
    return {
      success: false,
      data: null,
      error: 'Auth ID must be a string',
    };
  }

  // Validate optional string fields
  const email =
    'email' in data && (data.email === null || typeof data.email === 'string')
      ? data.email
      : null;
  const username =
    'username' in data &&
    (data.username === null || typeof data.username === 'string')
      ? data.username
      : null;
  const avatar_url =
    'avatar_url' in data &&
    (data.avatar_url === null || typeof data.avatar_url === 'string')
      ? data.avatar_url
      : null;
  const created_at =
    'created_at' in data &&
    (data.created_at === null || typeof data.created_at === 'string')
      ? data.created_at
      : null;
  const updated_at =
    'updated_at' in data &&
    (data.updated_at === null || typeof data.updated_at === 'string')
      ? data.updated_at
      : null;
  const bio =
    'bio' in data && (data.bio === null || typeof data.bio === 'string')
      ? data.bio
      : null;
  const land =
    'land' in data && (data.land === null || typeof data.land === 'string')
      ? data.land
      : null;
  const region =
    'region' in data &&
    (data.region === null || typeof data.region === 'string')
      ? data.region
      : null;
  const city =
    'city' in data && (data.city === null || typeof data.city === 'string')
      ? data.city
      : null;

  return {
    success: true,
    data: {
      id: data.id,
      auth_id: data.auth_id,
      email,
      username,
      avatar_url,
      created_at,
      updated_at,
      bio,
      land,
      region,
      city,
    },
  };
}

// =============================================================================
// BINGO BOARD VALIDATORS - REPLACES: bingo-boards.service.ts `data as BingoBoard`
// =============================================================================

/**
 * Validates BingoBoard from service response - REPLACES: `data as BingoBoard`
 */
export function validateBingoBoard(
  data: unknown
): ValidationResult<Tables<'bingo_boards'>> {
  if (!data || typeof data !== 'object' || data === null) {
    return {
      success: false,
      data: null,
      error: 'Board data must be an object',
    };
  }

  // Validate required fields
  if (!('id' in data) || typeof data.id !== 'string') {
    return {
      success: false,
      data: null,
      error: 'Board ID must be a string',
    };
  }

  if (!('title' in data) || typeof data.title !== 'string') {
    return {
      success: false,
      data: null,
      error: 'Board title must be a string',
    };
  }

  // Validate game_type
  if (!('game_type' in data) || !isGameCategory(data.game_type)) {
    return {
      success: false,
      data: null,
      error: `Invalid game type: ${'game_type' in data ? data.game_type : 'missing'}`,
    };
  }

  // Validate difficulty
  if (!('difficulty' in data) || !isDifficultyLevel(data.difficulty)) {
    return {
      success: false,
      data: null,
      error: `Invalid difficulty level: ${'difficulty' in data ? data.difficulty : 'missing'}`,
    };
  }

  // Validate status if present
  if (
    'status' in data &&
    data.status !== null &&
    data.status !== undefined &&
    !isBoardStatus(data.status)
  ) {
    return {
      success: false,
      data: null,
      error: `Invalid board status: ${data.status}`,
    };
  }

  // Build validated board object
  const validatedBoard: Tables<'bingo_boards'> = {
    id: data.id,
    title: data.title,
    description:
      'description' in data &&
      (data.description === null || typeof data.description === 'string')
        ? data.description
        : null,
    creator_id:
      'creator_id' in data &&
      (data.creator_id === null || typeof data.creator_id === 'string')
        ? data.creator_id
        : null,
    game_type: data.game_type,
    difficulty: data.difficulty,
    size:
      'size' in data && (data.size === null || typeof data.size === 'number')
        ? data.size
        : null,
    is_public:
      'is_public' in data &&
      (data.is_public === null || typeof data.is_public === 'boolean')
        ? data.is_public
        : null,
    status: 'status' in data && isBoardStatus(data.status) ? data.status : null,
    board_state:
      'board_state' in data && isValidJson(data.board_state)
        ? data.board_state
        : null,
    settings:
      'settings' in data && isValidJson(data.settings) ? data.settings : null,
    created_at:
      'created_at' in data &&
      (data.created_at === null || typeof data.created_at === 'string')
        ? data.created_at
        : null,
    updated_at:
      'updated_at' in data &&
      (data.updated_at === null || typeof data.updated_at === 'string')
        ? data.updated_at
        : null,
    version:
      'version' in data &&
      (data.version === null || typeof data.version === 'number')
        ? data.version
        : null,
    votes:
      'votes' in data && (data.votes === null || typeof data.votes === 'number')
        ? data.votes
        : null,
    bookmarked_count:
      'bookmarked_count' in data &&
      (data.bookmarked_count === null ||
        typeof data.bookmarked_count === 'number')
        ? data.bookmarked_count
        : null,
    cloned_from:
      'cloned_from' in data &&
      (data.cloned_from === null || typeof data.cloned_from === 'string')
        ? data.cloned_from
        : null,
  };

  return {
    success: true,
    data: validatedBoard,
  };
}

/**
 * Validates BingoBoard array - REPLACES: `data as BingoBoard[]`
 */
export function validateBingoBoardArray(
  data: unknown
): ValidationResult<Tables<'bingo_boards'>[]> {
  if (!Array.isArray(data)) {
    return {
      success: false,
      data: null,
      error: `Expected array but received ${typeof data}`,
    };
  }

  const boards: Tables<'bingo_boards'>[] = [];
  const errors: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const result = validateBingoBoard(data[i]);
    if (result.success) {
      boards.push(result.data);
    } else {
      errors.push(`Board ${i}: ${result.error}`);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      data: null,
      error: `Board array validation failed: ${errors.join('; ')}`,
    };
  }

  return {
    success: true,
    data: boards,
  };
}

// =============================================================================
// BINGO CARD VALIDATORS - REPLACES: bingo-cards.service.ts `data as BingoCard[]`
// =============================================================================

/**
 * Validates BingoCard from service response - REPLACES: `data as BingoCard`
 */
export function validateBingoCard(
  data: unknown
): ValidationResult<Tables<'bingo_cards'>> {
  if (!data || typeof data !== 'object' || data === null) {
    return {
      success: false,
      data: null,
      error: 'Card data must be an object',
    };
  }

  // Validate required fields
  if (!('id' in data) || typeof data.id !== 'string') {
    return {
      success: false,
      data: null,
      error: 'Card ID must be a string',
    };
  }

  if (!('title' in data) || typeof data.title !== 'string') {
    return {
      success: false,
      data: null,
      error: 'Card title must be a string',
    };
  }

  // Validate game_type
  if (!('game_type' in data) || !isGameCategory(data.game_type)) {
    return {
      success: false,
      data: null,
      error: `Invalid game type: ${'game_type' in data ? data.game_type : 'missing'}`,
    };
  }

  // Validate difficulty
  if (!('difficulty' in data) || !isDifficultyLevel(data.difficulty)) {
    return {
      success: false,
      data: null,
      error: `Invalid difficulty level: ${'difficulty' in data ? data.difficulty : 'missing'}`,
    };
  }

  // Validate tags
  const tags =
    'tags' in data &&
    (data.tags === null ||
      (Array.isArray(data.tags) &&
        data.tags.every(tag => typeof tag === 'string')))
      ? data.tags
      : null;

  // Build validated card object
  const validatedCard: Tables<'bingo_cards'> = {
    id: data.id,
    title: data.title,
    description:
      'description' in data &&
      (data.description === null || typeof data.description === 'string')
        ? data.description
        : null,
    creator_id:
      'creator_id' in data &&
      (data.creator_id === null || typeof data.creator_id === 'string')
        ? data.creator_id
        : null,
    game_type: data.game_type,
    difficulty: data.difficulty,
    is_public:
      'is_public' in data &&
      (data.is_public === null || typeof data.is_public === 'boolean')
        ? data.is_public
        : null,
    votes:
      'votes' in data && (data.votes === null || typeof data.votes === 'number')
        ? data.votes
        : null,
    created_at:
      'created_at' in data &&
      (data.created_at === null || typeof data.created_at === 'string')
        ? data.created_at
        : null,
    updated_at:
      'updated_at' in data &&
      (data.updated_at === null || typeof data.updated_at === 'string')
        ? data.updated_at
        : null,
    tags: tags,
  };

  return {
    success: true,
    data: validatedCard,
  };
}

/**
 * Validates BingoCard array - REPLACES: `data as BingoCard[]`
 */
export function validateBingoCardArray(
  data: unknown
): ValidationResult<Tables<'bingo_cards'>[]> {
  if (!Array.isArray(data)) {
    return {
      success: false,
      data: null,
      error: `Expected array but received ${typeof data}`,
    };
  }

  const cards: Tables<'bingo_cards'>[] = [];
  const errors: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const result = validateBingoCard(data[i]);
    if (result.success) {
      cards.push(result.data);
    } else {
      errors.push(`Card ${i}: ${result.error}`);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      data: null,
      error: `Card array validation failed: ${errors.join('; ')}`,
    };
  }

  return {
    success: true,
    data: cards,
  };
}

// =============================================================================
// BINGO SESSION VALIDATORS - REPLACES: sessions.service.ts `data as BingoSession`
// =============================================================================

/**
 * Validates BingoSession from service response - REPLACES: `data as BingoSession`
 */
export function validateBingoSession(
  data: unknown
): ValidationResult<Tables<'bingo_sessions'>> {
  if (!data || typeof data !== 'object' || data === null) {
    return {
      success: false,
      data: null,
      error: 'Session data must be an object',
    };
  }

  // Validate required fields
  if (!('id' in data) || typeof data.id !== 'string') {
    return {
      success: false,
      data: null,
      error: 'Session ID must be a string',
    };
  }

  // Validate status
  if (!('status' in data) || !isSessionStatus(data.status)) {
    return {
      success: false,
      data: null,
      error: `Invalid session status: ${'status' in data ? data.status : 'missing'}`,
    };
  }

  // Build validated session object
  const validatedSession: Tables<'bingo_sessions'> = {
    id: data.id,
    board_id:
      'board_id' in data &&
      (data.board_id === null || typeof data.board_id === 'string')
        ? data.board_id
        : null,
    host_id:
      'host_id' in data &&
      (data.host_id === null || typeof data.host_id === 'string')
        ? data.host_id
        : null,
    winner_id:
      'winner_id' in data &&
      (data.winner_id === null || typeof data.winner_id === 'string')
        ? data.winner_id
        : null,
    status: data.status,
    session_code:
      'session_code' in data &&
      (data.session_code === null || typeof data.session_code === 'string')
        ? data.session_code
        : null,
    current_state:
      'current_state' in data && isValidJson(data.current_state)
        ? data.current_state
        : null,
    settings:
      'settings' in data && isValidSessionSettings(data.settings)
        ? data.settings
        : null,
    created_at:
      'created_at' in data &&
      (data.created_at === null || typeof data.created_at === 'string')
        ? data.created_at
        : null,
    started_at:
      'started_at' in data &&
      (data.started_at === null || typeof data.started_at === 'string')
        ? data.started_at
        : null,
    ended_at:
      'ended_at' in data &&
      (data.ended_at === null || typeof data.ended_at === 'string')
        ? data.ended_at
        : null,
    updated_at:
      'updated_at' in data &&
      (data.updated_at === null || typeof data.updated_at === 'string')
        ? data.updated_at
        : null,
    version:
      'version' in data &&
      (data.version === null || typeof data.version === 'number')
        ? data.version
        : null,
  };

  return {
    success: true,
    data: validatedSession,
  };
}

// =============================================================================
// PRESENCE DATA VALIDATORS - REPLACES: presence.service.ts `p as SupabasePresenceRef`
// =============================================================================

/**
 * Validates presence data from real-time service - REPLACES: `p as SupabasePresenceRef`
 */
export function validatePresenceData(data: unknown): ValidationResult<{
  presence_ref: string;
  userId: UserId;
  displayName: string;
  status: string;
  lastSeen: string;
}> {
  if (!data || typeof data !== 'object' || data === null) {
    return {
      success: false,
      data: null,
      error: 'Presence data must be an object',
    };
  }

  // Validate required fields
  if (!('presence_ref' in data) || typeof data.presence_ref !== 'string') {
    return {
      success: false,
      data: null,
      error: 'Presence ref must be a string',
    };
  }

  if (!('displayName' in data) || typeof data.displayName !== 'string') {
    return {
      success: false,
      data: null,
      error: 'Display name must be a string',
    };
  }

  if (!('userId' in data)) {
    return {
      success: false,
      data: null,
      error: 'User ID is required',
    };
  }

  const userIdResult = validateUserId(data.userId);
  if (!userIdResult.success) {
    return {
      success: false,
      data: null,
      error: `Invalid presence user ID: ${data.userId}`,
    };
  }

  return {
    success: true,
    data: {
      presence_ref: data.presence_ref,
      userId: userIdResult.data,
      displayName: data.displayName,
      status:
        'status' in data && typeof data.status === 'string'
          ? data.status
          : 'online',
      lastSeen:
        'lastSeen' in data && typeof data.lastSeen === 'string'
          ? data.lastSeen
          : new Date().toISOString(),
    },
  };
}

// =============================================================================
// SUPABASE RESPONSE VALIDATORS
// =============================================================================

/**
 * Validates Supabase query response structure
 */
export function validateSupabaseResponse<T>(
  response: { data: unknown; error: unknown },
  dataValidator: (data: unknown) => ValidationResult<T>
): ValidationResult<T> {
  // Check for Supabase error first
  if (response.error) {
    return {
      success: false,
      data: null,
      error: `Database error: ${JSON.stringify(response.error)}`,
    };
  }

  // Validate the data
  return dataValidator(response.data);
}

/**
 * Validates Supabase array response
 */
export function validateSupabaseArrayResponse<T>(
  response: { data: unknown; error: unknown },
  dataValidator: (data: unknown) => ValidationResult<T[]>
): ValidationResult<T[]> {
  // Check for Supabase error first
  if (response.error) {
    return {
      success: false,
      data: null,
      error: `Database error: ${JSON.stringify(response.error)}`,
    };
  }

  // Ensure data is array
  if (!Array.isArray(response.data)) {
    return {
      success: false,
      data: null,
      error: `Expected array from database but received ${typeof response.data}`,
    };
  }

  // Validate the array data
  return dataValidator(response.data);
}

// =============================================================================
// ID VALIDATORS
// =============================================================================

/**
 * Validates and creates UserId - REPLACES: `id as string`
 */
export function validateUserId(id: unknown): ValidationResult<UserId> {
  if (typeof id !== 'string' || id.length === 0) {
    return {
      success: false,
      data: null,
      error: `Invalid user ID: ${id}`,
    };
  }
  // Basic UUID validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return {
      success: false,
      data: null,
      error: `Invalid user ID format: ${id}`,
    };
  }
  return { success: true, data: id };
}

/**
 * Validates and creates BoardId - REPLACES: `id as string`
 */
export function validateBoardId(id: unknown): ValidationResult<BoardId> {
  if (typeof id !== 'string' || id.length === 0) {
    return {
      success: false,
      data: null,
      error: `Invalid board ID: ${id}`,
    };
  }
  // Basic UUID validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return {
      success: false,
      data: null,
      error: `Invalid board ID format: ${id}`,
    };
  }
  return { success: true, data: id };
}

/**
 * Validates and creates SessionId - REPLACES: `id as string`
 */
export function validateSessionId(id: unknown): ValidationResult<SessionId> {
  if (typeof id !== 'string' || id.length === 0) {
    return {
      success: false,
      data: null,
      error: `Invalid session ID: ${id}`,
    };
  }
  // Basic UUID validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return {
      success: false,
      data: null,
      error: `Invalid session ID format: ${id}`,
    };
  }
  return { success: true, data: id };
}

/**
 * Validates and creates CardId - REPLACES: `id as string`
 */
export function validateCardId(id: unknown): ValidationResult<CardId> {
  if (typeof id !== 'string' || id.length === 0) {
    return {
      success: false,
      data: null,
      error: `Invalid card ID: ${id}`,
    };
  }
  // Basic UUID validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return {
      success: false,
      data: null,
      error: `Invalid card ID format: ${id}`,
    };
  }
  return { success: true, data: id };
}
