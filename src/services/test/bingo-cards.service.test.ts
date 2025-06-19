/**
 * @jest-environment node
 */

import { bingoCardsService } from '../bingo-cards.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import type { Tables, Enums } from '@/types/database.types';
import { bingoCardSchema, bingoCardsArraySchema } from '@/lib/validation/schemas/bingo';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');
jest.mock('@/lib/validation/schemas/bingo', () => ({
  bingoCardSchema: {
    safeParse: jest.fn().mockImplementation(data => ({
      success: true,
      data: data,
    })),
  },
  bingoCardsArraySchema: {
    safeParse: jest.fn().mockImplementation(data => ({
      success: true,
      data: data || [],
    })),
  },
}));

type BingoCard = Tables<'bingo_cards'>;
type GameCategory = Enums<'game_category'>;
type DifficultyLevel = Enums<'difficulty_level'>;

const mockSupabase = {
  from: jest.fn(),
};

const mockFrom = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  eq: jest.fn(),
  in: jest.fn(),
  or: jest.fn(),
  order: jest.fn(),
  range: jest.fn(),
  single: jest.fn(),
};

describe('bingoCardsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    mockSupabase.from.mockReturnValue(mockFrom);

    // Setup default chaining behavior
    mockFrom.select.mockReturnValue(mockFrom);
    mockFrom.insert.mockReturnValue(mockFrom);
    mockFrom.update.mockReturnValue(mockFrom);
    mockFrom.delete.mockReturnValue(mockFrom);
    mockFrom.eq.mockReturnValue(mockFrom);
    mockFrom.in.mockReturnValue(mockFrom);
    mockFrom.or.mockReturnValue(mockFrom);
    mockFrom.order.mockReturnValue(mockFrom);
    mockFrom.range.mockReturnValue(mockFrom);
    mockFrom.single.mockReturnValue(mockFrom);
  });

  describe('getCardsByIds', () => {
    it('should return cards for valid IDs', async () => {
      const mockCards: BingoCard[] = [
        {
          id: 'card-1',
          title: 'Test Card 1',
          description: 'Description 1',
          game_type: 'World of Warcraft' as GameCategory,
          difficulty: 'easy' as DifficultyLevel,
          tags: ['tag1'],
          is_public: true,
          creator_id: 'user-1',
          votes: 5,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'card-2',
          title: 'Test Card 2',
          description: 'Description 2',
          game_type: 'Fortnite' as GameCategory,
          difficulty: 'medium' as DifficultyLevel,
          tags: ['tag2'],
          is_public: false,
          creator_id: 'user-2',
          votes: 3,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockFrom.in.mockResolvedValueOnce({
        data: mockCards,
        error: null,
      });

      const result = await bingoCardsService.getCardsByIds([
        'card-1',
        'card-2',
      ]);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCards);
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_cards');
      expect(mockFrom.in).toHaveBeenCalledWith('id', ['card-1', 'card-2']);
    });

    it('should return empty array for empty input', async () => {
      const result = await bingoCardsService.getCardsByIds([]);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should filter out empty/null IDs', async () => {
      mockFrom.in.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await bingoCardsService.getCardsByIds([
        'card-1',
        '',
        null as any,
        'card-2',
      ]);

      expect(mockFrom.in).toHaveBeenCalledWith('id', ['card-1', 'card-2']);
    });

    it('should handle database error', async () => {
      mockFrom.in.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await bingoCardsService.getCardsByIds(['card-1']);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle validation failure', async () => {
      mockFrom.in.mockResolvedValueOnce({
        data: [{ invalid: 'data' }],
        error: null,
      });

      (bingoCardsArraySchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await bingoCardsService.getCardsByIds(['card-1']);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid cards data format');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle unexpected error', async () => {
      mockFrom.in.mockRejectedValueOnce(new Error('Network error'));

      const result = await bingoCardsService.getCardsByIds(['card-1']);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('getPublicCards', () => {
    it('should return paginated public cards with filters', async () => {
      const mockCards: BingoCard[] = [
        {
          id: 'card-1',
          title: 'Public Card',
          description: 'Description',
          game_type: 'World of Warcraft' as GameCategory,
          difficulty: 'easy' as DifficultyLevel,
          tags: [],
          is_public: true,
          creator_id: 'user-1',
          votes: 10,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockFrom.range.mockResolvedValueOnce({
        data: mockCards,
        error: null,
        count: 1,
      });

      const filters = {
        gameType: 'World of Warcraft' as GameCategory,
        difficulty: 'easy' as DifficultyLevel,
        search: 'public',
      };

      const result = await bingoCardsService.getPublicCards(filters, 1, 10);

      expect(result.success).toBe(true);
      expect(result.data?.cards).toEqual(mockCards);
      expect(result.data?.totalCount).toBe(1);
      expect(result.data?.hasMore).toBe(false);
      expect(mockFrom.eq).toHaveBeenCalledWith('is_public', true);
      expect(mockFrom.eq).toHaveBeenCalledWith(
        'game_type',
        'World of Warcraft'
      );
      expect(mockFrom.eq).toHaveBeenCalledWith('difficulty', 'easy');
      expect(mockFrom.or).toHaveBeenCalledWith(
        'title.ilike.%public%,description.ilike.%public%'
      );
    });

    it('should handle pagination correctly', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 100,
      });

      await bingoCardsService.getPublicCards({}, 2, 20);

      expect(mockFrom.range).toHaveBeenCalledWith(20, 39); // start=20, end=39
    });

    it('should skip difficulty filter when set to "all"', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await bingoCardsService.getPublicCards({ difficulty: 'all' });

      expect(mockFrom.eq).toHaveBeenCalledWith('is_public', true);
      expect(mockFrom.eq).not.toHaveBeenCalledWith(
        'difficulty',
        expect.anything()
      );
    });

    it('should handle database error', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: null,
        error: { message: 'Query failed' },
        count: null,
      });

      const result = await bingoCardsService.getPublicCards({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query failed');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle validation failure', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: [{ invalid: 'data' }],
        error: null,
        count: 1,
      });

      (bingoCardsArraySchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await bingoCardsService.getPublicCards({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid cards data format');
    });
  });

  describe('getUserCards', () => {
    it('should return user private cards', async () => {
      const mockCards: BingoCard[] = [
        {
          id: 'card-1',
          title: 'User Card',
          description: 'Private card',
          game_type: 'Minecraft' as GameCategory,
          difficulty: 'medium' as DifficultyLevel,
          tags: [],
          is_public: false,
          creator_id: 'user-123',
          votes: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockFrom.range.mockResolvedValueOnce({
        data: mockCards,
        error: null,
        count: 1,
      });

      const result = await bingoCardsService.getUserCards(
        'user-123',
        {},
        1,
        10
      );

      expect(result.success).toBe(true);
      expect(result.data?.cards).toEqual(mockCards);
      expect(mockFrom.eq).toHaveBeenCalledWith('creator_id', 'user-123');
      expect(mockFrom.eq).toHaveBeenCalledWith('is_public', false);
      expect(mockFrom.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });

    it('should apply filters to user cards', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      const filters = {
        gameType: 'Fortnite' as GameCategory,
        difficulty: 'hard' as DifficultyLevel,
        search: 'test',
      };

      await bingoCardsService.getUserCards('user-123', filters);

      expect(mockFrom.eq).toHaveBeenCalledWith('game_type', 'Fortnite');
      expect(mockFrom.eq).toHaveBeenCalledWith('difficulty', 'hard');
      expect(mockFrom.or).toHaveBeenCalledWith(
        'title.ilike.%test%,description.ilike.%test%'
      );
    });

    it('should handle database error', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: null,
        error: { message: 'Access denied' },
        count: null,
      });

      const result = await bingoCardsService.getUserCards('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('createCard', () => {
    it('should create a new card successfully', async () => {
      const cardData = {
        title: 'New Card',
        description: 'New description',
        game_type: 'Valorant' as GameCategory,
        difficulty: 'expert' as DifficultyLevel,
        tags: ['new', 'test'],
        is_public: true,
        creator_id: 'user-456',
      };

      const createdCard: BingoCard = {
        id: 'card-new',
        title: cardData.title,
        description: cardData.description,
        game_type: cardData.game_type,
        difficulty: cardData.difficulty,
        tags: cardData.tags,
        is_public: cardData.is_public,
        creator_id: cardData.creator_id,
        votes: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: createdCard,
        error: null,
      });

      const result = await bingoCardsService.createCard(cardData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdCard);
      expect(mockFrom.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: cardData.title,
          description: cardData.description,
          game_type: cardData.game_type,
          difficulty: cardData.difficulty,
          tags: cardData.tags,
          is_public: cardData.is_public,
          creator_id: cardData.creator_id,
          votes: 0,
        })
      );
    });

    it('should handle optional fields correctly', async () => {
      const cardData = {
        title: 'Minimal Card',
        game_type: 'CS:GO' as GameCategory,
        difficulty: 'beginner' as DifficultyLevel,
        creator_id: 'user-456',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'card-minimal', ...cardData },
        error: null,
      });

      await bingoCardsService.createCard(cardData);

      expect(mockFrom.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: cardData.title,
          description: null,
          tags: [],
          is_public: false,
        })
      );
    });

    it('should handle database error', async () => {
      const cardData = {
        title: 'Test Card',
        game_type: 'Dota 2' as GameCategory,
        difficulty: 'medium' as DifficultyLevel,
        creator_id: 'user-456',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      });

      const result = await bingoCardsService.createCard(cardData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle null data response', async () => {
      const cardData = {
        title: 'Test Card',
        game_type: 'Apex Legends' as GameCategory,
        difficulty: 'hard' as DifficultyLevel,
        creator_id: 'user-456',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await bingoCardsService.createCard(cardData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Card creation failed - no data returned');
    });

    it('should handle validation failure', async () => {
      const cardData = {
        title: 'Test Card',
        game_type: 'League of Legends' as GameCategory,
        difficulty: 'easy' as DifficultyLevel,
        creator_id: 'user-456',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: { invalid: 'data' },
        error: null,
      });

      (bingoCardSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await bingoCardsService.createCard(cardData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid card data format');
    });
  });

  describe('updateCard', () => {
    it('should update card successfully', async () => {
      const updates = {
        title: 'Updated Title',
        description: 'Updated description',
        difficulty: 'expert' as DifficultyLevel,
        tags: ['updated'],
        is_public: true,
      };

      const updatedCard: BingoCard = {
        id: 'card-123',
        title: updates.title,
        description: updates.description,
        game_type: 'Overwatch' as GameCategory,
        difficulty: updates.difficulty,
        tags: updates.tags,
        is_public: updates.is_public,
        creator_id: 'user-456',
        votes: 5,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T12:00:00Z',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: updatedCard,
        error: null,
      });

      const result = await bingoCardsService.updateCard('card-123', updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedCard);
      expect(mockFrom.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updates,
          updated_at: expect.any(String),
        })
      );
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'card-123');
    });

    it('should handle partial updates', async () => {
      const updates = {
        title: 'New Title Only',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'card-123', title: 'New Title Only' },
        error: null,
      });

      await bingoCardsService.updateCard('card-123', updates);

      expect(mockFrom.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Title Only',
          updated_at: expect.any(String),
        })
      );
    });

    it('should handle database error', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await bingoCardsService.updateCard('card-123', {
        title: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle null data response', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await bingoCardsService.updateCard('card-123', {
        title: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Card update failed - no data returned');
    });
  });

  describe('deleteCard', () => {
    it('should delete card successfully', async () => {
      mockFrom.eq.mockResolvedValueOnce({
        error: null,
      });

      const result = await bingoCardsService.deleteCard('card-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(mockFrom.delete).toHaveBeenCalled();
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'card-123');
    });

    it('should handle database error', async () => {
      mockFrom.eq.mockResolvedValueOnce({
        error: { message: 'Delete failed' },
      });

      const result = await bingoCardsService.deleteCard('card-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle unexpected error', async () => {
      mockFrom.eq.mockRejectedValueOnce(new Error('Network error'));

      const result = await bingoCardsService.deleteCard('card-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('voteCard', () => {
    it('should increment vote count successfully', async () => {
      const currentCard = {
        votes: 5,
      };

      const updatedCard: BingoCard = {
        id: 'card-123',
        title: 'Test Card',
        description: 'Description',
        game_type: 'Fall Guys' as GameCategory,
        difficulty: 'easy' as DifficultyLevel,
        tags: [],
        is_public: true,
        creator_id: 'user-456',
        votes: 6,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock current card fetch
      mockFrom.single.mockResolvedValueOnce({
        data: currentCard,
        error: null,
      });

      // Mock vote update
      mockFrom.single.mockResolvedValueOnce({
        data: updatedCard,
        error: null,
      });

      const result = await bingoCardsService.voteCard('card-123');

      expect(result.success).toBe(true);
      expect(result.data?.votes).toBe(6);
      expect(mockFrom.update).toHaveBeenCalledWith({ votes: 6 });
    });

    it('should handle null votes (first vote)', async () => {
      const currentCard = {
        votes: null,
      };

      mockFrom.single.mockResolvedValueOnce({
        data: currentCard,
        error: null,
      });

      mockFrom.single.mockResolvedValueOnce({
        data: { votes: 1 },
        error: null,
      });

      const result = await bingoCardsService.voteCard('card-123');

      expect(result.success).toBe(true);
      expect(mockFrom.update).toHaveBeenCalledWith({ votes: 1 });
    });

    it('should handle card not found on fetch', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await bingoCardsService.voteCard('card-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Card not found');
    });

    it('should handle fetch error', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Card not found' },
      });

      const result = await bingoCardsService.voteCard('card-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Card not found');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle update error', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { votes: 5 },
        error: null,
      });

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await bingoCardsService.voteCard('card-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });

    it('should handle null data after update', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { votes: 5 },
        error: null,
      });

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await bingoCardsService.voteCard('card-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vote update failed - no data returned');
    });
  });

  describe('createCards', () => {
    it('should create multiple cards successfully', async () => {
      const cardsData = [
        {
          title: 'Bulk Card 1',
          game_type: 'Deep Rock Galactic' as GameCategory,
          difficulty: 'medium' as DifficultyLevel,
          creator_id: 'user-456',
        },
        {
          title: 'Bulk Card 2',
          game_type: 'Valheim' as GameCategory,
          difficulty: 'hard' as DifficultyLevel,
          creator_id: 'user-456',
        },
      ];

      const createdCards: BingoCard[] = cardsData.map((card, index) => ({
        id: `bulk-card-${index + 1}`,
        title: card.title,
        description: null,
        game_type: card.game_type,
        difficulty: card.difficulty,
        tags: [],
        is_public: false,
        creator_id: card.creator_id,
        votes: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));

      mockFrom.select.mockResolvedValueOnce({
        data: createdCards,
        error: null,
      });

      const result = await bingoCardsService.createCards(cardsData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdCards);
      expect(mockFrom.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            title: 'Bulk Card 1',
            votes: 0,
          }),
          expect.objectContaining({
            title: 'Bulk Card 2',
            votes: 0,
          }),
        ])
      );
    });

    it('should handle database error during bulk insert', async () => {
      const cardsData = [
        {
          title: 'Test Card',
          game_type: 'Subnautica' as GameCategory,
          difficulty: 'easy' as DifficultyLevel,
          creator_id: 'user-456',
        },
      ];

      mockFrom.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Bulk insert failed' },
      });

      const result = await bingoCardsService.createCards(cardsData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bulk insert failed');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle validation failure', async () => {
      const cardsData = [
        {
          title: 'Test Card',
          game_type: 'Terraria' as GameCategory,
          difficulty: 'medium' as DifficultyLevel,
          creator_id: 'user-456',
        },
      ];

      mockFrom.select.mockResolvedValueOnce({
        data: [{ invalid: 'data' }],
        error: null,
      });

      (bingoCardsArraySchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await bingoCardsService.createCards(cardsData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid cards data format');
    });

    it('should handle unexpected error', async () => {
      const cardsData = [
        {
          title: 'Test Card',
          game_type: 'Stardew Valley' as GameCategory,
          difficulty: 'beginner' as DifficultyLevel,
          creator_id: 'user-456',
        },
      ];

      mockFrom.select.mockRejectedValueOnce(new Error('Network error'));

      const result = await bingoCardsService.createCards(cardsData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalled();
    });
  });
});
