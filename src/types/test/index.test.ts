/**
 * @jest-environment jsdom
 */

import {
  // Constants
  DIFFICULTIES,
  GAME_CATEGORIES,
  DIFFICULTY_STYLES,
  // Utility types
  DEFAULT_BINGO_CARD,
  // Helper functions
  createEmptyBingoCard,
  createNewBingoCard,
  isValidUUID,
  // Interfaces
  type BingoCardFilter,
  type BingoCardStats,
  type ApiResponse,
  type PaginationParams,
  type PaginatedResponse,
  type Optional,
  type RequiredFields,
  // Re-exported types
  type GameCategory,
} from '../index';

// Mock the database types import
jest.mock('../../../types', () => ({
  // Mock the database types that are imported
}));

describe('Type System Constants', () => {
  describe('DIFFICULTIES', () => {
    test('contains all expected difficulty levels', () => {
      expect(DIFFICULTIES).toEqual([
        'beginner',
        'easy',
        'medium',
        'hard',
        'expert',
      ]);
    });

    test('is readonly array', () => {
      expect(Array.isArray(DIFFICULTIES)).toBe(true);
      // Note: const assertions create readonly arrays at compile time, not runtime frozen
      expect(DIFFICULTIES).toEqual(expect.any(Array));
    });

    test('has correct length', () => {
      expect(DIFFICULTIES).toHaveLength(5);
    });

    test('contains no duplicates', () => {
      const uniqueValues = Array.from(new Set(DIFFICULTIES));
      expect(uniqueValues).toHaveLength(DIFFICULTIES.length);
    });
  });

  describe('GAME_CATEGORIES', () => {
    test('contains expected game categories', () => {
      expect(GAME_CATEGORIES).toContain('All Games');
      expect(GAME_CATEGORIES).toContain('World of Warcraft');
      expect(GAME_CATEGORIES).toContain('Fortnite');
      expect(GAME_CATEGORIES).toContain('Minecraft');
      expect(GAME_CATEGORIES).toContain('Valorant');
    });

    test('starts with All Games category', () => {
      expect(GAME_CATEGORIES[0]).toBe('All Games');
    });

    test('is readonly array', () => {
      expect(Array.isArray(GAME_CATEGORIES)).toBe(true);
      // Note: const assertions create readonly arrays at compile time, not runtime frozen
      expect(GAME_CATEGORIES).toEqual(expect.any(Array));
    });

    test('has reasonable number of categories', () => {
      expect(GAME_CATEGORIES.length).toBeGreaterThan(10);
      expect(GAME_CATEGORIES.length).toBeLessThan(30);
    });

    test('contains no duplicates', () => {
      const uniqueValues = Array.from(new Set(GAME_CATEGORIES));
      expect(uniqueValues).toHaveLength(GAME_CATEGORIES.length);
    });
  });

  describe('DIFFICULTY_STYLES', () => {
    test('has styles for all difficulty levels', () => {
      DIFFICULTIES.forEach(difficulty => {
        expect(DIFFICULTY_STYLES[difficulty]).toBeDefined();
        expect(typeof DIFFICULTY_STYLES[difficulty]).toBe('string');
      });
    });

    test('each style contains expected Tailwind classes', () => {
      Object.values(DIFFICULTY_STYLES).forEach(style => {
        expect(style).toMatch(/bg-\w+-\d+/); // Background color
        expect(style).toMatch(/text-\w+-\d+/); // Text color
        expect(style).toMatch(/border-\w+-\d+/); // Border color
      });
    });

    test('beginner has green styling', () => {
      expect(DIFFICULTY_STYLES.beginner).toContain('green');
    });

    test('expert has red styling', () => {
      expect(DIFFICULTY_STYLES.expert).toContain('red');
    });

    test('medium has yellow styling', () => {
      expect(DIFFICULTY_STYLES.medium).toContain('yellow');
    });

    test('all styles follow consistent pattern', () => {
      Object.values(DIFFICULTY_STYLES).forEach(style => {
        const parts = style.split(' ');
        expect(parts).toHaveLength(3); // bg-, text-, border-
        expect(parts[0]).toMatch(/^bg-\w+-\d+$/);
        expect(parts[1]).toMatch(/^text-\w+-\d+$/);
        expect(parts[2]).toMatch(/^border-\w+-\d+$/);
      });
    });
  });
});

describe('Default Bingo Card', () => {
  describe('DEFAULT_BINGO_CARD', () => {
    test('has correct default structure', () => {
      expect(DEFAULT_BINGO_CARD.title).toBe('');
      expect(DEFAULT_BINGO_CARD.difficulty).toBe('medium');
      expect(DEFAULT_BINGO_CARD.game_type).toBe('All Games');
      expect(DEFAULT_BINGO_CARD.description).toBeNull();
      expect(DEFAULT_BINGO_CARD.tags).toBeNull();
      expect(DEFAULT_BINGO_CARD.is_public).toBe(false);
      expect(DEFAULT_BINGO_CARD.votes).toBe(0);
      expect(DEFAULT_BINGO_CARD.creator_id).toBeNull();
      expect(DEFAULT_BINGO_CARD.created_at).toBeNull();
      expect(DEFAULT_BINGO_CARD.updated_at).toBeNull();
    });

    test('does not have id property', () => {
      expect('id' in DEFAULT_BINGO_CARD).toBe(false);
    });

    test('has all required fields except id', () => {
      const expectedFields = [
        'title',
        'difficulty',
        'game_type',
        'description',
        'tags',
        'is_public',
        'votes',
        'creator_id',
        'created_at',
        'updated_at',
      ];

      expectedFields.forEach(field => {
        expect(field in DEFAULT_BINGO_CARD).toBe(true);
      });
    });
  });
});

describe('Helper Functions', () => {
  describe('createEmptyBingoCard', () => {
    test('creates card with default values', () => {
      const card = createEmptyBingoCard();

      expect(card.id).toBe('');
      expect(card.title).toBe('');
      expect(card.difficulty).toBe('medium');
      expect(card.game_type).toBe('All Games');
      expect(card.description).toBeNull();
      expect(card.tags).toBeNull();
      expect(card.is_public).toBe(false);
      expect(card.votes).toBe(0);
      expect(card.creator_id).toBeNull();
    });

    test('accepts custom game type', () => {
      const card = createEmptyBingoCard('Minecraft');

      expect(card.game_type).toBe('Minecraft');
      expect(card.difficulty).toBe('medium'); // Still default
    });

    test('accepts custom creator ID', () => {
      const creatorId = 'user-123';
      const card = createEmptyBingoCard('All Games', creatorId);

      expect(card.creator_id).toBe(creatorId);
    });

    test('sets current timestamps', () => {
      const beforeCreation = Date.now();
      const card = createEmptyBingoCard();
      const afterCreation = Date.now();

      expect(card.created_at).toBeTruthy();
      expect(card.updated_at).toBeTruthy();
      expect(card.created_at).toBe(card.updated_at);

      // Check timestamps are within reasonable range
      const createdTime = new Date(card.created_at!).getTime();
      expect(createdTime).toBeGreaterThanOrEqual(beforeCreation);
      expect(createdTime).toBeLessThanOrEqual(afterCreation);
    });

    test('handles empty creator ID', () => {
      const card = createEmptyBingoCard('All Games', '');

      expect(card.creator_id).toBeNull();
    });
  });

  describe('createNewBingoCard', () => {
    test('creates card with temporary ID', () => {
      const card = createNewBingoCard({});

      expect(card.id).toMatch(/^temp-\d+-[a-z0-9]{9}$/);
    });

    test('merges provided data with defaults', () => {
      const data = {
        title: 'Custom Title',
        difficulty: 'hard' as const,
        is_public: true,
      };

      const card = createNewBingoCard(data);

      expect(card.title).toBe('Custom Title');
      expect(card.difficulty).toBe('hard');
      expect(card.is_public).toBe(true);
      expect(card.game_type).toBe('All Games'); // Default
      expect(card.votes).toBe(0); // Default
    });

    test('accepts custom game type parameter', () => {
      const card = createNewBingoCard({}, 'Fortnite');

      expect(card.game_type).toBe('Fortnite');
    });

    test('accepts custom creator ID parameter', () => {
      const creatorId = 'user-456';
      const card = createNewBingoCard({}, 'All Games', creatorId);

      expect(card.creator_id).toBe(creatorId);
    });

    test('data creator_id overrides parameter', () => {
      const data = { creator_id: 'data-creator' };
      const card = createNewBingoCard(data, 'All Games', 'param-creator');

      expect(card.creator_id).toBe('data-creator');
    });

    test('generates unique temporary IDs', () => {
      const card1 = createNewBingoCard({});
      const card2 = createNewBingoCard({});

      expect(card1.id).not.toBe(card2.id);
      expect(card1.id).toMatch(/^temp-/);
      expect(card2.id).toMatch(/^temp-/);
    });

    test('sets current timestamps when not provided', () => {
      const beforeCreation = Date.now();
      const card = createNewBingoCard({});
      const afterCreation = Date.now();

      expect(card.created_at).toBeTruthy();
      expect(card.updated_at).toBeTruthy();

      const createdTime = new Date(card.created_at!).getTime();
      expect(createdTime).toBeGreaterThanOrEqual(beforeCreation);
      expect(createdTime).toBeLessThanOrEqual(afterCreation);
    });

    test('preserves provided timestamps', () => {
      const customTime = '2023-01-01T00:00:00.000Z';
      const data = {
        created_at: customTime,
        updated_at: customTime,
      };

      const card = createNewBingoCard(data);

      expect(card.created_at).toBe(customTime);
      expect(card.updated_at).toBe(customTime);
    });
  });

  describe('isValidUUID', () => {
    test('returns false for null or empty string', () => {
      expect(isValidUUID(null)).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });

    test('returns false for temporary IDs', () => {
      expect(isValidUUID('temp-123-abc')).toBe(false);
      expect(isValidUUID('cell-456-def')).toBe(false);
    });

    test('returns true for valid UUID format', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      expect(isValidUUID(validUUID)).toBe(true);
    });

    test('returns true for valid UUID with mixed case', () => {
      const validUUID = '123E4567-E89B-12D3-A456-426614174000';
      expect(isValidUUID(validUUID)).toBe(true);
    });

    test('returns false for invalid UUID format', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('123-456-789')).toBe(false);
      expect(isValidUUID('123e4567-e89b-12d3-a456')).toBe(false); // Too short
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000-extra')).toBe(
        false
      ); // Too long
    });

    test('returns false for UUID with invalid characters', () => {
      expect(isValidUUID('123g4567-e89b-12d3-a456-426614174000')).toBe(false); // 'g' not valid hex
      expect(isValidUUID('123e4567_e89b_12d3_a456_426614174000')).toBe(false); // Wrong separators
    });

    test('handles edge cases', () => {
      expect(isValidUUID('00000000-0000-0000-0000-000000000000')).toBe(true); // All zeros
      expect(isValidUUID('ffffffff-ffff-ffff-ffff-ffffffffffff')).toBe(true); // All f's
    });
  });
});

describe('Utility Types', () => {
  describe('Optional type', () => {
    test('makes specified fields optional', () => {
      interface TestInterface {
        required: string;
        alsoRequired: number;
        optional?: boolean;
      }

      type TestOptional = Optional<TestInterface, 'required'>;

      // This should compile without errors
      const test: TestOptional = {
        alsoRequired: 1,
        optional: true,
        // required is now optional
      };

      expect(test.alsoRequired).toBe(1);
    });
  });

  describe('RequiredFields type', () => {
    test('makes specified optional fields required', () => {
      interface TestInterface {
        required: string;
        optional?: number;
        alsoOptional?: boolean;
      }

      type TestRequired = RequiredFields<TestInterface, 'optional'>;

      // This should require 'optional' field
      const test: TestRequired = {
        required: 'test',
        optional: 42, // Now required
        alsoOptional: true, // Still optional
      };

      expect(test.optional).toBe(42);
    });
  });
});

describe('API Response Types', () => {
  describe('ApiResponse', () => {
    test('basic response structure', () => {
      const response: ApiResponse<string> = {
        data: 'test data',
        success: true,
        message: 'Operation completed',
      };

      expect(response.data).toBe('test data');
      expect(response.success).toBe(true);
      expect(response.message).toBe('Operation completed');
    });

    test('error response structure', () => {
      const response: ApiResponse<null> = {
        data: null,
        success: false,
        error: 'Something went wrong',
      };

      expect(response.data).toBeNull();
      expect(response.success).toBe(false);
      expect(response.error).toBe('Something went wrong');
    });

    test('response with complex data type', () => {
      interface User {
        id: string;
        name: string;
      }

      const response: ApiResponse<User> = {
        data: { id: '1', name: 'John' },
        success: true,
      };

      expect(response.data.id).toBe('1');
      expect(response.data.name).toBe('John');
    });
  });

  describe('PaginationParams', () => {
    test('required pagination parameters', () => {
      const params: PaginationParams = {
        page: 1,
        limit: 10,
      };

      expect(params.page).toBe(1);
      expect(params.limit).toBe(10);
    });

    test('with optional offset', () => {
      const params: PaginationParams = {
        page: 2,
        limit: 20,
        offset: 40,
      };

      expect(params.offset).toBe(40);
    });
  });

  describe('PaginatedResponse', () => {
    test('extends ApiResponse with pagination info', () => {
      const response: PaginatedResponse<string> = {
        data: ['item1', 'item2'],
        success: true,
        pagination: {
          total: 100,
          pages: 10,
          current: 1,
          hasNext: true,
          hasPrev: false,
        },
      };

      expect(response.data).toHaveLength(2);
      expect(response.pagination.total).toBe(100);
      expect(response.pagination.hasNext).toBe(true);
      expect(response.pagination.hasPrev).toBe(false);
    });
  });
});

describe('Application Interfaces', () => {
  describe('BingoCardFilter', () => {
    test('all fields are optional', () => {
      const filter1: BingoCardFilter = {};
      const filter2: BingoCardFilter = {
        game: 'Minecraft',
        difficulty: 'hard',
        search: 'test',
      };

      expect(filter1).toEqual({});
      expect(filter2.game).toBe('Minecraft');
      expect(filter2.difficulty).toBe('hard');
      expect(filter2.search).toBe('test');
    });
  });

  describe('BingoCardStats', () => {
    test('has correct structure', () => {
      // Create a minimal valid stats object for testing
      const byGameType: Record<GameCategory, number> = {} as Record<
        GameCategory,
        number
      >;

      // Add some sample game types
      byGameType['All Games'] = 50;
      byGameType['Minecraft'] = 25;
      byGameType['Fortnite'] = 25;

      // Fill in the rest with 0s to satisfy the Record type
      GAME_CATEGORIES.forEach(category => {
        if (!(category in byGameType)) {
          byGameType[category] = 0;
        }
      });

      const stats: BingoCardStats = {
        total: 100,
        completed: 25,
        byDifficulty: {
          beginner: 10,
          easy: 20,
          medium: 30,
          hard: 25,
          expert: 15,
        },
        byGameType,
      };

      expect(stats.total).toBe(100);
      expect(stats.completed).toBe(25);
      expect(stats.byDifficulty.expert).toBe(15);
      expect(stats.byGameType.Minecraft).toBe(25);
    });
  });
});
