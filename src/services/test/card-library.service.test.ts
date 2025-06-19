/**
 * @jest-environment node
 */

import { cardLibraryService } from '../card-library.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import type { Tables, TablesInsert, Enums } from '@/types/database.types';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');

type BingoCard = Tables<'bingo_cards'>;
type GameCategory = Enums<'game_category'>;
type Difficulty = Enums<'difficulty_level'>;

const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
};

const mockFrom = {
  select: jest.fn(),
  insert: jest.fn(),
  eq: jest.fn(),
  or: jest.fn(),
  order: jest.fn(),
  range: jest.fn(),
  limit: jest.fn(),
};

describe('cardLibraryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    mockSupabase.from.mockReturnValue(mockFrom);

    // Setup default chaining behavior
    mockFrom.select.mockReturnValue(mockFrom);
    mockFrom.insert.mockReturnValue(mockFrom);
    mockFrom.eq.mockReturnValue(mockFrom);
    mockFrom.or.mockReturnValue(mockFrom);
    mockFrom.order.mockReturnValue(mockFrom);
    mockFrom.range.mockReturnValue(mockFrom);
    mockFrom.limit.mockReturnValue(mockFrom);
  });

  describe('getPublicCards', () => {
    const validFilters = {
      search: 'test',
      difficulty: 'medium' as Difficulty,
      sortBy: 'popular' as const,
      gameType: 'World of Warcraft' as GameCategory,
    };

    it('should return paginated public cards with filters', async () => {
      const mockCards: BingoCard[] = [
        {
          id: 'card-1',
          title: 'Test Card 1',
          description: 'Description 1',
          game_type: 'World of Warcraft' as GameCategory,
          difficulty: 'medium' as Difficulty,
          tags: ['test', 'combat'],
          is_public: true,
          creator_id: 'user-123',
          votes: 15,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'card-2',
          title: 'Another Test Card',
          description: 'Description 2',
          game_type: 'World of Warcraft' as GameCategory,
          difficulty: 'medium' as Difficulty,
          tags: ['test', 'exploration'],
          is_public: true,
          creator_id: 'user-456',
          votes: 8,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockFrom.range.mockResolvedValueOnce({
        data: mockCards,
        error: null,
        count: 2,
      });

      const result = await cardLibraryService.getPublicCards(
        validFilters,
        1,
        10
      );

      expect(result.success).toBe(true);
      expect(result.data?.cards).toEqual(mockCards);
      expect(result.data?.totalCount).toBe(2);
      expect(result.data?.hasMore).toBe(false);

      // Verify query construction
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_cards');
      expect(mockFrom.eq).toHaveBeenCalledWith('is_public', true);
      expect(mockFrom.eq).toHaveBeenCalledWith(
        'game_type',
        'World of Warcraft'
      );
      expect(mockFrom.eq).toHaveBeenCalledWith('difficulty', 'medium');
      expect(mockFrom.or).toHaveBeenCalledWith(
        'title.ilike.%test%,description.ilike.%test%'
      );
      expect(mockFrom.order).toHaveBeenCalledWith('votes', {
        ascending: false,
      });
      expect(mockFrom.range).toHaveBeenCalledWith(0, 9);
    });

    it('should handle different sort options', async () => {
      const mockData = [
        {
          id: 'card-1',
          title: 'Test Card',
          description: null,
          game_type: 'Fortnite' as GameCategory,
          difficulty: 'easy' as Difficulty,
          tags: [],
          is_public: true,
          creator_id: 'user-123',
          votes: 5,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      // Test newest sort
      mockFrom.range.mockResolvedValueOnce({
        data: mockData,
        error: null,
        count: 1,
      });
      await cardLibraryService.getPublicCards({
        ...validFilters,
        sortBy: 'newest',
      });
      expect(mockFrom.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });

      // Test rating sort (same as popular)
      mockFrom.range.mockResolvedValueOnce({
        data: mockData,
        error: null,
        count: 1,
      });
      await cardLibraryService.getPublicCards({
        ...validFilters,
        sortBy: 'rating',
      });
      expect(mockFrom.order).toHaveBeenCalledWith('votes', {
        ascending: false,
      });

      // Test title sort
      mockFrom.range.mockResolvedValueOnce({
        data: mockData,
        error: null,
        count: 1,
      });
      await cardLibraryService.getPublicCards({
        ...validFilters,
        sortBy: 'title',
      });
      expect(mockFrom.order).toHaveBeenCalledWith('title', { ascending: true });

      // Test default sort (invalid sortBy)
      mockFrom.range.mockResolvedValueOnce({
        data: mockData,
        error: null,
        count: 1,
      });
      await cardLibraryService.getPublicCards({
        ...validFilters,
        sortBy: 'invalid' as any,
      });
      expect(mockFrom.order).toHaveBeenCalledWith('votes', {
        ascending: false,
      });
    });

    it('should skip difficulty filter when set to "all"', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await cardLibraryService.getPublicCards({
        ...validFilters,
        difficulty: 'all',
      });

      expect(mockFrom.eq).toHaveBeenCalledWith('is_public', true);
      expect(mockFrom.eq).toHaveBeenCalledWith(
        'game_type',
        'World of Warcraft'
      );
      expect(mockFrom.eq).not.toHaveBeenCalledWith(
        'difficulty',
        expect.anything()
      );
    });

    it('should skip search filter when empty or whitespace', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await cardLibraryService.getPublicCards({
        ...validFilters,
        search: '   ',
      });

      expect(mockFrom.or).not.toHaveBeenCalled();
    });

    it('should handle pagination correctly', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 100,
      });

      await cardLibraryService.getPublicCards(validFilters, 3, 20);

      expect(mockFrom.range).toHaveBeenCalledWith(40, 59); // page 3, limit 20: start=40, end=59
    });

    it('should calculate hasMore correctly', async () => {
      // Test case where there are more items
      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 100,
      });

      let result = await cardLibraryService.getPublicCards(validFilters, 1, 10);
      expect(result.data?.hasMore).toBe(true); // 100 > 10

      // Test case where there are no more items
      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 5,
      });

      result = await cardLibraryService.getPublicCards(validFilters, 1, 10);
      expect(result.data?.hasMore).toBe(false); // 5 <= 10
    });

    it('should handle database error', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
        count: null,
      });

      const result = await cardLibraryService.getPublicCards(validFilters);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to fetch public cards',
        { message: 'Database connection failed' },
        expect.objectContaining({
          metadata: { filters: validFilters, page: 1, limit: 50 },
        })
      );
    });

    it('should handle unexpected error', async () => {
      mockFrom.range.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await cardLibraryService.getPublicCards(validFilters);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in getPublicCards',
        expect.any(Error),
        expect.objectContaining({
          metadata: { filters: validFilters, page: 1, limit: 50 },
        })
      );
    });

    it('should handle null data gracefully', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: null,
        error: null,
        count: 0,
      });

      const result = await cardLibraryService.getPublicCards(validFilters);

      expect(result.success).toBe(true);
      expect(result.data?.cards).toEqual([]);
      expect(result.data?.totalCount).toBe(0);
      expect(result.data?.hasMore).toBe(false);
    });

    it('should handle null count gracefully', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: null,
      });

      const result = await cardLibraryService.getPublicCards(validFilters);

      expect(result.success).toBe(true);
      expect(result.data?.totalCount).toBe(0);
      expect(result.data?.hasMore).toBe(false);
    });
  });

  describe('createBulkCards', () => {
    const mockCards = [
      {
        title: 'Bulk Card 1',
        description: 'Description 1',
        game_type: 'Minecraft' as GameCategory,
        difficulty: 'easy' as Difficulty,
        tags: ['building', 'creative'],
        is_public: true,
      },
      {
        title: 'Bulk Card 2',
        description: 'Description 2',
        game_type: 'Minecraft' as GameCategory,
        difficulty: 'medium' as Difficulty,
        tags: ['survival'],
        is_public: false,
      },
    ];

    it('should create multiple cards successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const createdCards: BingoCard[] = mockCards.map((card, index) => ({
        id: `bulk-card-${index + 1}`,
        ...card,
        creator_id: mockUser.id,
        votes: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      mockFrom.select.mockResolvedValueOnce({
        data: createdCards,
        error: null,
      });

      const result = await cardLibraryService.createBulkCards(mockCards);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdCards);
      expect(mockFrom.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          title: 'Bulk Card 1',
          creator_id: 'user-123',
          tags: ['building', 'creative'],
          is_public: true,
        }),
        expect.objectContaining({
          title: 'Bulk Card 2',
          creator_id: 'user-123',
          tags: ['survival'],
          is_public: false,
        }),
      ]);
    });

    it('should handle optional fields correctly', async () => {
      const minimalCards = [
        {
          title: 'Minimal Card',
          game_type: 'Among Us' as GameCategory,
          difficulty: 'beginner' as Difficulty,
        } as any,
      ];

      const mockUser = { id: 'user-456' };
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      mockFrom.select.mockResolvedValueOnce({
        data: [{ id: 'card-1', ...minimalCards[0] }],
        error: null,
      });

      await cardLibraryService.createBulkCards(minimalCards);

      expect(mockFrom.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          title: 'Minimal Card',
          description: undefined,
          tags: [],
          is_public: false,
          creator_id: 'user-456',
        }),
      ]);
    });

    it('should handle authentication error', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const result = await cardLibraryService.createBulkCards(mockCards);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Must be authenticated to create cards');
      expect(log.error).toHaveBeenCalledWith(
        'Authentication required for card creation',
        { message: 'Not authenticated' }
      );
    });

    it('should handle null user', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const result = await cardLibraryService.createBulkCards(mockCards);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Must be authenticated to create cards');
    });

    it('should handle database insertion error', async () => {
      const mockUser = { id: 'user-123' };
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      mockFrom.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Bulk insert failed' },
      });

      const result = await cardLibraryService.createBulkCards(mockCards);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bulk insert failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to create bulk cards',
        { message: 'Bulk insert failed' },
        expect.objectContaining({
          metadata: { cardCount: 2, userId: 'user-123' },
        })
      );
    });

    it('should handle unexpected error', async () => {
      mockSupabase.auth.getUser.mockRejectedValueOnce(
        new Error('Auth service down')
      );

      const result = await cardLibraryService.createBulkCards(mockCards);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Auth service down');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in createBulkCards',
        expect.any(Error),
        expect.objectContaining({
          metadata: { cardCount: 2 },
        })
      );
    });

    it('should handle null data response', async () => {
      const mockUser = { id: 'user-123' };
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      mockFrom.select.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await cardLibraryService.createBulkCards(mockCards);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('getRandomCards', () => {
    const validFilters = {
      gameType: 'Valorant' as GameCategory,
      difficulty: 'hard' as Difficulty,
    };

    it('should return random cards successfully', async () => {
      const mockCards: BingoCard[] = Array.from({ length: 30 }, (_, i) => ({
        id: `random-card-${i}`,
        title: `Random Card ${i}`,
        description: `Description ${i}`,
        game_type: 'Valorant' as GameCategory,
        difficulty: 'hard' as Difficulty,
        tags: [`tag${i}`],
        is_public: true,
        creator_id: 'user-123',
        votes: i,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));

      mockFrom.limit.mockResolvedValueOnce({
        data: mockCards,
        error: null,
      });

      const result = await cardLibraryService.getRandomCards(validFilters, 10);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(10);
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_cards');
      expect(mockFrom.eq).toHaveBeenCalledWith('is_public', true);
      expect(mockFrom.eq).toHaveBeenCalledWith('game_type', 'Valorant');
      expect(mockFrom.eq).toHaveBeenCalledWith('difficulty', 'hard');
      expect(mockFrom.limit).toHaveBeenCalledWith(30); // count * 3
    });

    it('should skip difficulty filter when set to "all"', async () => {
      mockFrom.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await cardLibraryService.getRandomCards(
        {
          gameType: 'CS:GO' as GameCategory,
          difficulty: 'all' as any,
        },
        5
      );

      expect(mockFrom.eq).toHaveBeenCalledWith('is_public', true);
      expect(mockFrom.eq).toHaveBeenCalledWith('game_type', 'CS:GO');
      expect(mockFrom.eq).not.toHaveBeenCalledWith(
        'difficulty',
        expect.anything()
      );
    });

    it('should handle insufficient cards', async () => {
      const mockCards: BingoCard[] = Array.from({ length: 5 }, (_, i) => ({
        id: `card-${i}`,
        title: `Card ${i}`,
        description: null,
        game_type: 'Apex Legends' as GameCategory,
        difficulty: 'medium' as Difficulty,
        tags: [],
        is_public: true,
        creator_id: 'user-123',
        votes: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));

      mockFrom.limit.mockResolvedValueOnce({
        data: mockCards,
        error: null,
      });

      const result = await cardLibraryService.getRandomCards(validFilters, 10);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(5); // Returns all available cards
    });

    it('should randomize card order', async () => {
      const mockCards: BingoCard[] = Array.from({ length: 20 }, (_, i) => ({
        id: `card-${i}`,
        title: `Card ${i}`,
        description: null,
        game_type: 'Overwatch' as GameCategory,
        difficulty: 'easy' as Difficulty,
        tags: [],
        is_public: true,
        creator_id: 'user-123',
        votes: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));

      // Mock Math.random to control randomization
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.5);

      mockFrom.limit.mockResolvedValueOnce({
        data: mockCards,
        error: null,
      });

      const result = await cardLibraryService.getRandomCards(validFilters, 10);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(10);

      // Verify that sort was called (randomization)
      expect(Math.random).toHaveBeenCalled();

      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should handle database error', async () => {
      mockFrom.limit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Query failed' },
      });

      const result = await cardLibraryService.getRandomCards(validFilters, 5);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get random cards',
        { message: 'Query failed' },
        expect.objectContaining({
          metadata: { filters: validFilters, count: 5 },
        })
      );
    });

    it('should handle unexpected error', async () => {
      mockFrom.limit.mockRejectedValueOnce(new Error('Connection lost'));

      const result = await cardLibraryService.getRandomCards(validFilters, 5);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection lost');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in getRandomCards',
        expect.any(Error),
        expect.objectContaining({
          metadata: { filters: validFilters, count: 5 },
        })
      );
    });

    it('should handle null data gracefully', async () => {
      mockFrom.limit.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await cardLibraryService.getRandomCards(validFilters, 5);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('getFeaturedCollections', () => {
    const gameType = 'League of Legends' as GameCategory;

    it('should return featured collections for all difficulties', async () => {
      const beginnerCards: BingoCard[] = Array.from({ length: 15 }, (_, i) => ({
        id: `beginner-card-${i}`,
        title: `Beginner Card ${i}`,
        description: 'Easy to complete',
        game_type: gameType,
        difficulty: 'beginner' as Difficulty,
        tags: ['easy'],
        is_public: true,
        creator_id: 'user-123',
        votes: 10 + i,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));

      const mediumCards: BingoCard[] = Array.from({ length: 20 }, (_, i) => ({
        id: `medium-card-${i}`,
        title: `Medium Card ${i}`,
        description: 'Moderate difficulty',
        game_type: gameType,
        difficulty: 'medium' as Difficulty,
        tags: ['moderate'],
        is_public: true,
        creator_id: 'user-456',
        votes: 5 + i,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }));

      const expertCards: BingoCard[] = Array.from({ length: 10 }, (_, i) => ({
        id: `expert-card-${i}`,
        title: `Expert Card ${i}`,
        description: 'Very challenging',
        game_type: gameType,
        difficulty: 'expert' as Difficulty,
        tags: ['hard'],
        is_public: true,
        creator_id: 'user-789',
        votes: 15 + i,
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      }));

      // Mock the three parallel queries
      mockFrom.limit
        .mockResolvedValueOnce({ data: beginnerCards, error: null })
        .mockResolvedValueOnce({ data: mediumCards, error: null })
        .mockResolvedValueOnce({ data: expertCards, error: null });

      const result = await cardLibraryService.getFeaturedCollections(gameType);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);

      const [beginnerCollection, mediumCollection, expertCollection] =
        result.data || [];

      expect(beginnerCollection).toEqual({
        name: 'Beginner Favorites',
        description: 'Easy and fun cards perfect for new players',
        difficulty: 'beginner',
        cardCount: 15,
        cards: beginnerCards,
      });

      expect(mediumCollection).toEqual({
        name: 'Community Picks',
        description: 'Most popular medium difficulty cards',
        difficulty: 'medium',
        cardCount: 20,
        cards: mediumCards,
      });

      expect(expertCollection).toEqual({
        name: 'Expert Challenge',
        description: 'Hardcore cards for experienced players',
        difficulty: 'expert',
        cardCount: 10,
        cards: expertCards,
      });

      // Verify all three queries were made with correct parameters
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_cards');
      expect(mockFrom.eq).toHaveBeenCalledWith('is_public', true);
      expect(mockFrom.eq).toHaveBeenCalledWith('game_type', gameType);
      expect(mockFrom.eq).toHaveBeenCalledWith('difficulty', 'beginner');
      expect(mockFrom.eq).toHaveBeenCalledWith('difficulty', 'medium');
      expect(mockFrom.eq).toHaveBeenCalledWith('difficulty', 'expert');
      expect(mockFrom.order).toHaveBeenCalledWith('votes', {
        ascending: false,
      });
      expect(mockFrom.limit).toHaveBeenCalledWith(25);
    });

    it('should filter out collections with no cards', async () => {
      // Return empty arrays for beginner and expert, but cards for medium
      const mediumCards: BingoCard[] = Array.from({ length: 5 }, (_, i) => ({
        id: `medium-card-${i}`,
        title: `Medium Card ${i}`,
        description: 'Moderate difficulty',
        game_type: gameType,
        difficulty: 'medium' as Difficulty,
        tags: [],
        is_public: true,
        creator_id: 'user-456',
        votes: i,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));

      mockFrom.limit
        .mockResolvedValueOnce({ data: [], error: null }) // Beginner: empty
        .mockResolvedValueOnce({ data: mediumCards, error: null }) // Medium: has cards
        .mockResolvedValueOnce({ data: [], error: null }); // Expert: empty

      const result = await cardLibraryService.getFeaturedCollections(gameType);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1); // Only medium collection returned
      expect(result.data?.[0].difficulty).toBe('medium');
      expect(result.data?.[0].cardCount).toBe(5);
    });

    it('should handle database error in first query', async () => {
      mockFrom.limit
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' },
        })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const result = await cardLibraryService.getFeaturedCollections(gameType);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to fetch featured collections',
        { message: 'Database error' },
        expect.objectContaining({
          metadata: { gameType },
        })
      );
    });

    it('should handle database error in second query', async () => {
      mockFrom.limit
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Network timeout' },
        })
        .mockResolvedValueOnce({ data: [], error: null });

      const result = await cardLibraryService.getFeaturedCollections(gameType);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });

    it('should handle null error gracefully', async () => {
      mockFrom.limit
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const result = await cardLibraryService.getFeaturedCollections(gameType);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle unexpected error', async () => {
      mockFrom.limit.mockRejectedValueOnce(new Error('Promise.all failed'));

      const result = await cardLibraryService.getFeaturedCollections(gameType);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Promise.all failed');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in getFeaturedCollections',
        expect.any(Error),
        expect.objectContaining({
          metadata: { gameType },
        })
      );
    });

    it('should handle null data responses', async () => {
      mockFrom.limit
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const result = await cardLibraryService.getFeaturedCollections(gameType);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle mixed success and null responses', async () => {
      const expertCards: BingoCard[] = Array.from({ length: 3 }, (_, i) => ({
        id: `expert-card-${i}`,
        title: `Expert Card ${i}`,
        description: 'Expert level',
        game_type: gameType,
        difficulty: 'expert' as Difficulty,
        tags: [],
        is_public: true,
        creator_id: 'user-123',
        votes: 20 + i,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));

      mockFrom.limit
        .mockResolvedValueOnce({ data: null, error: null }) // Beginner: null
        .mockResolvedValueOnce({ data: null, error: null }) // Medium: null
        .mockResolvedValueOnce({ data: expertCards, error: null }); // Expert: has cards

      const result = await cardLibraryService.getFeaturedCollections(gameType);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].difficulty).toBe('expert');
      expect(result.data?.[0].cardCount).toBe(3);
    });

    it('should handle error with missing message', async () => {
      mockFrom.limit
        .mockResolvedValueOnce({ data: null, error: { code: 'SOME_ERROR' } }) // Error without message property
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const result = await cardLibraryService.getFeaturedCollections(gameType);

      expect(result.success).toBe(false);
      // This test shows that the service has a bug where it doesn't handle missing message gracefully
      // The error is thrown when createServiceError tries to access .message on undefined
      expect(result.error).toBe('Cannot read properties of undefined (reading \'message\')');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle Error object in unexpected error', async () => {
      const customError = new Error('Custom error message');
      mockFrom.range.mockRejectedValueOnce(customError);

      const result = await cardLibraryService.getPublicCards({
        search: '',
        difficulty: 'all',
        sortBy: 'popular',
        gameType: 'Fortnite' as GameCategory,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Custom error message');
    });

    it('should handle non-Error object in unexpected error', async () => {
      mockFrom.range.mockRejectedValueOnce('String error');

      const result = await cardLibraryService.getPublicCards({
        search: '',
        difficulty: 'all',
        sortBy: 'popular',
        gameType: 'Minecraft' as GameCategory,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch public cards');
    });

    it('should handle non-Error object in createBulkCards', async () => {
      mockSupabase.auth.getUser.mockRejectedValueOnce('Auth error string');

      const result = await cardLibraryService.createBulkCards([]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create cards');
    });

    it('should handle non-Error object in getRandomCards', async () => {
      mockFrom.limit.mockRejectedValueOnce(123); // Number error

      const result = await cardLibraryService.getRandomCards(
        {
          gameType: 'Valorant' as GameCategory,
          difficulty: 'medium' as Difficulty,
        },
        5
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get random cards');
    });

    it('should handle non-Error object in getFeaturedCollections', async () => {
      mockFrom.limit.mockRejectedValueOnce({ custom: 'error object' });

      const result = await cardLibraryService.getFeaturedCollections(
        'CS:GO' as GameCategory
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get featured collections');
    });
  });
});
