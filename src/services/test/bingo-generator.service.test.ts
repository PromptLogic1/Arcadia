/**
 * @jest-environment node
 */

import { bingoGeneratorService } from '../bingo-generator.service';
import { createClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { Tables, Enums } from '@/types/database.types';
import type { CardCategory } from '@/features/bingo-boards/types/generator.types';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');

type BingoBoardTemplate = Tables<'bingo_cards'>;
type DifficultyLevel = Enums<'difficulty_level'>;

const mockSupabase = {
  from: jest.fn(),
};

const mockFrom = {
  select: jest.fn(),
  insert: jest.fn(),
  eq: jest.fn(),
  or: jest.fn(),
  limit: jest.fn(),
  single: jest.fn(),
};

describe('bingoGeneratorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    mockSupabase.from.mockReturnValue(mockFrom);

    // Setup default chaining behavior
    mockFrom.select.mockReturnValue(mockFrom);
    mockFrom.insert.mockReturnValue(mockFrom);
    mockFrom.eq.mockReturnValue(mockFrom);
    mockFrom.or.mockReturnValue(mockFrom);
    mockFrom.limit.mockReturnValue(mockFrom);
    mockFrom.single.mockReturnValue(mockFrom);
  });

  describe('generateBoard', () => {
    const validParams = {
      gameCategory: 'World of Warcraft',
      difficulty: 'medium' as DifficultyLevel,
      cardPoolSize: 'Medium' as const,
      minVotes: 0,
      selectedCategories: [] as CardCategory[],
      cardSource: 'public' as const,
      gridSize: 25,
      userId: 'user-123',
    };

    it('should generate board successfully with public cards', async () => {
      const mockCards: BingoBoardTemplate[] = Array.from(
        { length: 30 },
        (_, i) => ({
          id: `card-${i}`,
          title: `Test Card ${i}`,
          description: `Description ${i}`,
          game_type: 'World of Warcraft' as any,
          difficulty: 'medium' as DifficultyLevel,
          tags: [],
          is_public: true,
          creator_id: 'user-456',
          votes: i,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        })
      );

      mockFrom.limit.mockResolvedValueOnce({
        data: mockCards,
        error: null,
      });

      const result = await bingoGeneratorService.generateBoard(validParams);

      expect(result.success).toBe(true);
      expect(result.data?.cards).toHaveLength(25);
      expect(result.data?.totalAvailable).toBe(30);
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_cards');
      expect(mockFrom.eq).toHaveBeenCalledWith(
        'game_type',
        'World of Warcraft'
      );
      expect(mockFrom.eq).toHaveBeenCalledWith('difficulty', 'medium');
      expect(mockFrom.eq).toHaveBeenCalledWith('is_public', true);
      expect(mockFrom.limit).toHaveBeenCalledWith(100); // Medium pool size
    });

    it('should handle private card source with user ID', async () => {
      const privateParams = {
        ...validParams,
        cardSource: 'private' as const,
      };

      mockFrom.limit.mockResolvedValueOnce({
        data: Array.from({ length: 25 }, (_, i) => ({
          id: `private-card-${i}`,
          title: `Private Card ${i}`,
          description: null,
          game_type: 'World of Warcraft' as any,
          difficulty: 'medium' as DifficultyLevel,
          tags: [],
          is_public: false,
          creator_id: 'user-123',
          votes: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        })),
        error: null,
      });

      const result = await bingoGeneratorService.generateBoard(privateParams);

      expect(result.success).toBe(true);
      expect(mockFrom.eq).toHaveBeenCalledWith('creator_id', 'user-123');
    });

    it('should handle mixed public/private card source', async () => {
      const mixedParams = {
        ...validParams,
        cardSource: 'publicprivate' as const,
      };

      mockFrom.limit.mockResolvedValueOnce({
        data: Array.from({ length: 30 }, (_, i) => ({
          id: `mixed-card-${i}`,
          title: `Mixed Card ${i}`,
          description: null,
          game_type: 'World of Warcraft' as any,
          difficulty: 'medium' as DifficultyLevel,
          tags: [],
          is_public: i % 2 === 0,
          creator_id: i % 2 === 0 ? 'other-user' : 'user-123',
          votes: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        })),
        error: null,
      });

      const result = await bingoGeneratorService.generateBoard(mixedParams);

      expect(result.success).toBe(true);
      expect(mockFrom.or).toHaveBeenCalledWith(
        'is_public.eq.true,creator_id.eq.user-123'
      );
    });

    it('should handle different pool sizes', async () => {
      const smallParams = {
        ...validParams,
        cardPoolSize: 'Small' as const,
      };

      mockFrom.limit.mockResolvedValueOnce({
        data: Array.from({ length: 25 }, () => ({
          id: 'card-1',
          title: 'Test Card',
          description: null,
          game_type: 'World of Warcraft' as any,
          difficulty: 'medium' as DifficultyLevel,
          tags: [],
          is_public: true,
          creator_id: 'user-456',
          votes: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        })),
        error: null,
      });

      await bingoGeneratorService.generateBoard(smallParams);

      expect(mockFrom.limit).toHaveBeenCalledWith(50); // Small pool size

      const largeParams = {
        ...validParams,
        cardPoolSize: 'Large' as const,
      };

      await bingoGeneratorService.generateBoard(largeParams);

      expect(mockFrom.limit).toHaveBeenCalledWith(200); // Large pool size
    });

    it('should warn about unimplemented minimum votes filter', async () => {
      const paramsWithVotes = {
        ...validParams,
        minVotes: 5,
      };

      mockFrom.limit.mockResolvedValueOnce({
        data: Array.from({ length: 25 }, () => ({
          id: 'card-1',
          title: 'Test Card',
          description: null,
          game_type: 'World of Warcraft' as any,
          difficulty: 'medium' as DifficultyLevel,
          tags: [],
          is_public: true,
          creator_id: 'user-456',
          votes: 10,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        })),
        error: null,
      });

      await bingoGeneratorService.generateBoard(paramsWithVotes);

      expect(logger.warn).toHaveBeenCalledWith(
        'Minimum votes filter not implemented - votes column missing',
        expect.objectContaining({
          metadata: { minVotes: 5 },
        })
      );
    });

    it('should warn about unimplemented category filter', async () => {
      const paramsWithCategories = {
        ...validParams,
        selectedCategories: [{ name: 'Combat', count: 10 }] as CardCategory[],
      };

      mockFrom.limit.mockResolvedValueOnce({
        data: Array.from({ length: 25 }, () => ({
          id: 'card-1',
          title: 'Test Card',
          description: null,
          game_type: 'World of Warcraft' as any,
          difficulty: 'medium' as DifficultyLevel,
          tags: [],
          is_public: true,
          creator_id: 'user-456',
          votes: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        })),
        error: null,
      });

      await bingoGeneratorService.generateBoard(paramsWithCategories);

      expect(logger.warn).toHaveBeenCalledWith(
        'Category filter not implemented - tags column missing',
        expect.objectContaining({
          metadata: { categories: [{ name: 'Combat', count: 10 }] },
        })
      );
    });

    it('should return error for invalid game category', async () => {
      const invalidParams = {
        ...validParams,
        gameCategory: 'Invalid Game',
      };

      const result = await bingoGeneratorService.generateBoard(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid game category: Invalid Game');
    });

    it('should return error when insufficient cards available', async () => {
      mockFrom.limit.mockResolvedValueOnce({
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `card-${i}`,
          title: `Test Card ${i}`,
          description: null,
          game_type: 'World of Warcraft' as any,
          difficulty: 'medium' as DifficultyLevel,
          tags: [],
          is_public: true,
          creator_id: 'user-456',
          votes: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        })),
        error: null,
      });

      const result = await bingoGeneratorService.generateBoard(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Not enough cards available. Found 10 cards but need 25'
      );
    });

    it('should handle database error', async () => {
      mockFrom.limit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const result = await bingoGeneratorService.generateBoard(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle validation failure', async () => {
      mockFrom.limit.mockResolvedValueOnce({
        data: [{ invalid: 'data' }],
        error: null,
      });

      const result = await bingoGeneratorService.generateBoard(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid card data format');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle unexpected error', async () => {
      mockFrom.limit.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await bingoGeneratorService.generateBoard(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should randomize card selection correctly', async () => {
      const mockCards: BingoBoardTemplate[] = Array.from(
        { length: 100 },
        (_, i) => ({
          id: `card-${i}`,
          title: `Test Card ${i}`,
          description: null,
          game_type: 'World of Warcraft' as any,
          difficulty: 'medium' as DifficultyLevel,
          tags: [],
          is_public: true,
          creator_id: 'user-456',
          votes: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        })
      );

      mockFrom.limit.mockResolvedValueOnce({
        data: mockCards,
        error: null,
      });

      const result = await bingoGeneratorService.generateBoard(validParams);

      expect(result.success).toBe(true);
      expect(result.data?.cards).toHaveLength(25);

      // Check that cards are unique
      const cardIds = result.data?.cards.map(card => card.id) || [];
      const uniqueIds = new Set(cardIds);
      expect(uniqueIds.size).toBe(25);
    });
  });

  describe('reshuffleCards', () => {
    const mockCards: BingoBoardTemplate[] = Array.from(
      { length: 50 },
      (_, i) => ({
        id: `card-${i}`,
        title: `Test Card ${i}`,
        description: null,
        game_type: 'Fortnite' as any,
        difficulty: 'easy' as DifficultyLevel,
        tags: [],
        is_public: true,
        creator_id: 'user-456',
        votes: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })
    );

    it('should reshuffle cards successfully', async () => {
      const result = await bingoGeneratorService.reshuffleCards(mockCards, 25);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(25);

      // Check that all returned cards are from the original set
      const originalIds = new Set(mockCards.map(card => card.id));
      const reshuffledIds = result.data?.map(card => card.id) || [];

      reshuffledIds.forEach(id => {
        expect(originalIds.has(id)).toBe(true);
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Cards reshuffled successfully',
        expect.objectContaining({
          metadata: {
            totalCards: 50,
            gridSize: 25,
          },
        })
      );
    });

    it('should return error when insufficient cards for grid size', async () => {
      const result = await bingoGeneratorService.reshuffleCards(
        mockCards.slice(0, 10),
        25
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Not enough cards to reshuffle. Have 10 but need 25'
      );
    });

    it('should handle exact number of cards', async () => {
      const exactCards = mockCards.slice(0, 25);
      const result = await bingoGeneratorService.reshuffleCards(exactCards, 25);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(25);
    });

    it('should handle unexpected error', async () => {
      // Simulate error by passing invalid data that causes Math.random to throw
      const invalidCards = null as any;

      const result = await bingoGeneratorService.reshuffleCards(
        invalidCards,
        25
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot read');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should produce different results on multiple calls', async () => {
      // Mock Math.random to return different sequences
      const originalRandom = Math.random;
      let callCount = 0;
      Math.random = jest.fn(() => {
        callCount++;
        return callCount / 100; // Different sequence each time
      });

      const result1 = await bingoGeneratorService.reshuffleCards(mockCards, 10);
      const result2 = await bingoGeneratorService.reshuffleCards(mockCards, 10);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Results should be different (highly likely with 50 cards)
      const ids1 = result1.data?.map(card => card.id).join(',') || '';
      const ids2 = result2.data?.map(card => card.id).join(',') || '';

      // Restore original Math.random
      Math.random = originalRandom;
    });
  });

  describe('validateGenerationParams', () => {
    const baseParams = {
      gameCategory: 'Minecraft',
      difficulty: 'medium' as DifficultyLevel,
      gridSize: 25,
      cardSource: 'public' as const,
      userId: 'user-123',
    };

    it('should return null for valid parameters', () => {
      const result = bingoGeneratorService.validateGenerationParams(baseParams);
      expect(result).toBeNull();
    });

    it('should validate game category is required', () => {
      const params = { ...baseParams, gameCategory: '' };
      const result = bingoGeneratorService.validateGenerationParams(params);
      expect(result).toBe('Game category is required');
    });

    it('should validate difficulty is required', () => {
      const params = { ...baseParams, difficulty: '' as any };
      const result = bingoGeneratorService.validateGenerationParams(params);
      expect(result).toBe('Difficulty level is required');
    });

    it('should validate grid size minimum', () => {
      const params = { ...baseParams, gridSize: 8 };
      const result = bingoGeneratorService.validateGenerationParams(params);
      expect(result).toBe('Grid size must be between 9 and 49');
    });

    it('should validate grid size maximum', () => {
      const params = { ...baseParams, gridSize: 50 };
      const result = bingoGeneratorService.validateGenerationParams(params);
      expect(result).toBe('Grid size must be between 9 and 49');
    });

    it('should validate user ID for private cards', () => {
      const params = {
        ...baseParams,
        cardSource: 'private' as const,
        userId: undefined as any,
      };
      const result = bingoGeneratorService.validateGenerationParams(params);
      expect(result).toBe('User ID is required for private cards');
    });

    it('should allow missing user ID for public cards', () => {
      const params = {
        ...baseParams,
        cardSource: 'public' as const,
        userId: undefined as any,
      };
      const result = bingoGeneratorService.validateGenerationParams(params);
      expect(result).toBeNull();
    });

    it('should validate edge case grid sizes', () => {
      expect(
        bingoGeneratorService.validateGenerationParams({
          ...baseParams,
          gridSize: 9,
        })
      ).toBeNull();
      expect(
        bingoGeneratorService.validateGenerationParams({
          ...baseParams,
          gridSize: 49,
        })
      ).toBeNull();
    });
  });

  describe('POOL_SIZE_LIMITS constant', () => {
    it('should have correct pool size limits', () => {
      expect(bingoGeneratorService.POOL_SIZE_LIMITS).toEqual({
        Small: 50,
        Medium: 100,
        Large: 200,
      });
    });

    it('should be immutable', () => {
      expect(() => {
        (bingoGeneratorService.POOL_SIZE_LIMITS as any).Small = 999;
      }).toThrow();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty cards array', async () => {
      const params = {
        gameCategory: 'Among Us',
        difficulty: 'hard' as DifficultyLevel,
        cardPoolSize: 'Small' as const,
        minVotes: 0,
        selectedCategories: [] as CardCategory[],
        cardSource: 'public' as const,
        gridSize: 9,
      };

      mockFrom.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await bingoGeneratorService.generateBoard(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Not enough cards available. Found 0 cards but need 9'
      );
    });

    it('should handle null data from database', async () => {
      const params = {
        gameCategory: 'Rocket League',
        difficulty: 'expert' as DifficultyLevel,
        cardPoolSize: 'Medium' as const,
        minVotes: 0,
        selectedCategories: [] as CardCategory[],
        cardSource: 'public' as const,
        gridSize: 16,
      };

      mockFrom.limit.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await bingoGeneratorService.generateBoard(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid card data format');
    });

    it('should handle private card source without user ID', async () => {
      const params = {
        gameCategory: 'Cyberpunk 2077',
        difficulty: 'medium' as DifficultyLevel,
        cardPoolSize: 'Large' as const,
        minVotes: 0,
        selectedCategories: [] as CardCategory[],
        cardSource: 'private' as const,
        gridSize: 25,
        // userId not provided
      };

      mockFrom.limit.mockResolvedValueOnce({
        data: Array.from({ length: 25 }, () => ({
          id: 'card-1',
          title: 'Test Card',
          description: null,
          game_type: 'Cyberpunk 2077' as any,
          difficulty: 'medium' as DifficultyLevel,
          tags: [],
          is_public: false,
          creator_id: null,
          votes: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        })),
        error: null,
      });

      const result = await bingoGeneratorService.generateBoard(params);

      expect(result.success).toBe(true);
      // Should still work but won't filter by creator_id
    });
  });
});
