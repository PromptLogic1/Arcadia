/**
 * @jest-environment node
 */

/**
 * Additional Coverage Tests for Bingo Board Edit Service
 *
 * Focusing on uncovered branches and edge cases to improve coverage
 * from 86.93% lines, 57.44% branches to 95%+ coverage.
 */

import { bingoBoardEditService } from '../bingo-board-edit.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import type { BingoBoard, BingoCard } from '@/types';
import type { CardInsertData } from '../bingo-board-edit.service';
import {
  bingoBoardSchema,
  bingoCardSchema,
  bingoCardsArraySchema,
  zBoardState,
  zBoardSettings,
} from '@/lib/validation/schemas/bingo';
import {
  transformBoardState,
  transformBoardSettings,
} from '@/lib/validation/transforms';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');
jest.mock('@/lib/validation/schemas/bingo', () => ({
  bingoBoardSchema: {
    safeParse: jest.fn(),
  },
  bingoCardSchema: {
    safeParse: jest.fn(),
  },
  bingoCardsArraySchema: {
    safeParse: jest.fn(),
  },
  zBoardState: {
    safeParse: jest.fn(),
  },
  zBoardSettings: {
    safeParse: jest.fn(),
  },
}));
jest.mock('@/lib/validation/transforms', () => ({
  transformBoardState: jest.fn(),
  transformBoardSettings: jest.fn(),
}));
jest.mock('@/lib/error-guards', () => ({
  getErrorMessage: jest.fn(error =>
    error instanceof Error ? error.message : String(error)
  ),
}));

const mockSupabase = {
  from: jest.fn(),
};

const mockFrom = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
  order: jest.fn(),
};

describe('bingoBoardEditService - Additional Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all mock functions
    mockSupabase.from.mockClear();
    mockFrom.select.mockClear();
    mockFrom.insert.mockClear();
    mockFrom.update.mockClear();
    mockFrom.eq.mockClear();
    mockFrom.single.mockClear();
    mockFrom.order.mockClear();

    // Reset the mock implementations completely
    mockSupabase.from.mockReset();
    mockFrom.select.mockReset();
    mockFrom.insert.mockReset();
    mockFrom.update.mockReset();
    mockFrom.eq.mockReset();
    mockFrom.single.mockReset();
    mockFrom.order.mockReset();

    // Setup fresh default chaining behavior
    mockSupabase.from.mockReturnValue(mockFrom);
    mockFrom.select.mockReturnValue(mockFrom);
    mockFrom.insert.mockReturnValue(mockFrom);
    mockFrom.update.mockReturnValue(mockFrom);
    mockFrom.eq.mockReturnValue(mockFrom);
    mockFrom.single.mockReturnValue(mockFrom);
    mockFrom.order.mockReturnValue(mockFrom);

    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    // Reset and setup validation and transform functions
    (bingoBoardSchema.safeParse as jest.Mock).mockReset();
    (bingoCardSchema.safeParse as jest.Mock).mockReset();
    (bingoCardsArraySchema.safeParse as jest.Mock).mockReset();
    (zBoardState.safeParse as jest.Mock).mockReset();
    (zBoardSettings.safeParse as jest.Mock).mockReset();
    (transformBoardState as jest.Mock).mockReset();
    (transformBoardSettings as jest.Mock).mockReset();

    (bingoBoardSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: {},
    });
    (bingoCardSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: {},
    });
    (bingoCardsArraySchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: [],
    });
    (zBoardState.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: [],
    });
    (zBoardSettings.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: {},
    });
    (transformBoardState as jest.Mock).mockImplementation(data => data);
    (transformBoardSettings as jest.Mock).mockImplementation(data => data);
  });

  describe('getBoardForEdit - Missing Branch Coverage', () => {
    it('should handle board data being null after successful fetch', async () => {
      // Mock successful board fetch but returns null data
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await bingoBoardEditService.getBoardForEdit('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Board not found');
    });

    it('should handle board validation failure', async () => {
      const mockBoard = {
        id: 'board-123',
        title: 'Test Board',
      };

      // Mock successful board fetch
      mockFrom.single.mockResolvedValueOnce({
        data: mockBoard,
        error: null,
      });

      // Mock validation failure
      (bingoBoardSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await bingoBoardEditService.getBoardForEdit('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid board data format');
      expect(log.error).toHaveBeenCalledWith(
        'Board data validation failed',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            boardId: 'board-123',
            service: 'bingoBoardEditService',
          }),
        })
      );
    });

    it('should handle transform board data failure', async () => {
      const mockBoard = {
        id: 'board-123',
        title: 'Test Board',
        creator_id: 'user-456',
        game_type: 'All Games',
        difficulty: 'easy',
        size: 5,
        board_state: [],
        settings: {},
      };

      // Mock successful board fetch
      mockFrom.single.mockResolvedValueOnce({
        data: mockBoard,
        error: null,
      });

      // Mock successful board validation
      (bingoBoardSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: mockBoard,
      });

      // Mock zBoardState validation failure to trigger transform failure
      (zBoardState.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Invalid board state'),
      });

      // Mock cards fetch returning empty
      const mockCardsFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockFrom)
        .mockReturnValueOnce(mockCardsFrom);

      const result = await bingoBoardEditService.getBoardForEdit('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to transform board data');
    });

    it('should handle cards validation failure', async () => {
      const mockBoard = {
        id: 'board-123',
        title: 'Test Board',
        creator_id: 'user-456',
        game_type: 'All Games',
        difficulty: 'easy',
        size: 5,
        board_state: [],
        settings: {},
      };

      // Mock successful board fetch
      mockFrom.single.mockResolvedValueOnce({
        data: mockBoard,
        error: null,
      });

      // Mock successful board validation and transform
      (bingoBoardSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: mockBoard,
      });

      // Mock successful cards fetch
      const mockCards = [{ id: 'card-1', title: 'Test Card' }];

      // Setup board fetch chain - first call to from()
      mockSupabase.from.mockReturnValueOnce(mockFrom);

      // Setup cards fetch chain - second call to from() with proper method chaining
      const mockCardsChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockCards,
                error: null,
              }),
            }),
          }),
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockCardsChain);

      // Mock cards validation failure
      (bingoCardsArraySchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Cards validation failed'),
      });

      const result = await bingoBoardEditService.getBoardForEdit('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid cards data format');
      expect(log.error).toHaveBeenCalledWith(
        'Cards data validation failed',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            boardId: 'board-123',
            service: 'bingoBoardEditService',
          }),
        })
      );
    });

    it('should handle unexpected error during fetch', async () => {
      const error = new Error('Unexpected database error');

      // Make the first supabase.from call throw an error
      mockSupabase.from.mockImplementationOnce(() => {
        throw error;
      });

      const result = await bingoBoardEditService.getBoardForEdit('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected database error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in getBoardForEdit',
        error,
        expect.objectContaining({
          metadata: expect.objectContaining({
            boardId: 'board-123',
            service: 'bingoBoardEditService',
          }),
        })
      );
    });
  });

  describe('saveCards - Missing Branch Coverage', () => {
    it('should handle card with empty title after trimming', async () => {
      const cardsData: CardInsertData[] = [
        {
          title: '   ', // Only whitespace, will be empty after trim
          description: 'Should be skipped',
          game_type: 'All Games',
          difficulty: 'easy',
          tags: null,
          creator_id: 'user-123',
          is_public: false,
        },
        {
          title: 'Valid Card',
          description: 'Valid description',
          game_type: 'All Games',
          difficulty: 'easy',
          tags: null,
          creator_id: 'user-123',
          is_public: false,
        },
      ];

      const savedCard = {
        id: 'card-1',
        title: 'Valid Card',
        description: 'Valid description',
        game_type: 'All Games',
        difficulty: 'easy',
        tags: null,
        creator_id: 'user-123',
        is_public: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        votes: null,
      };

      // Setup mock for only the valid card insert (first card is skipped)
      const mockInsertChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: savedCard,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValueOnce(mockInsertChain);

      // Mock card validation to return the saved card
      (bingoCardSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: savedCard,
      });

      const result = await bingoBoardEditService.saveCards(cardsData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]?.title).toBe('Valid Card');
      expect(mockSupabase.from).toHaveBeenCalledTimes(1); // Only valid card processed
    });

    it('should handle card insert returning null data', async () => {
      const cardsData: CardInsertData[] = [
        {
          title: 'Test Card',
          description: null,
          game_type: 'All Games',
          difficulty: 'easy',
          tags: null,
          creator_id: 'user-123',
          is_public: false,
        },
      ];

      const mockInsertChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValueOnce(mockInsertChain);

      const result = await bingoBoardEditService.saveCards(cardsData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to save card - no data returned');
    });

    it('should handle saved card validation failure', async () => {
      const cardsData: CardInsertData[] = [
        {
          title: 'Test Card',
          description: null,
          game_type: 'All Games',
          difficulty: 'easy',
          tags: null,
          creator_id: 'user-123',
          is_public: false,
        },
      ];

      const savedCard = {
        id: 'card-1',
        title: 'Test Card',
      };

      const mockInsertChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: savedCard,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValueOnce(mockInsertChain);

      // Mock card validation failure
      (bingoCardSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Saved card validation failed'),
      });

      const result = await bingoBoardEditService.saveCards(cardsData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid saved card data format');
      expect(log.error).toHaveBeenCalledWith(
        'Saved card validation failed',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            savedCard,
            service: 'bingoBoardEditService',
          }),
        })
      );
    });

    it('should handle unexpected error during save', async () => {
      const cardsData: CardInsertData[] = [
        {
          title: 'Test Card',
          description: null,
          game_type: 'All Games',
          difficulty: 'easy',
          tags: null,
          creator_id: 'user-123',
          is_public: false,
        },
      ];

      const error = new Error('Unexpected save error');
      mockSupabase.from.mockImplementation(() => {
        throw error;
      });

      const result = await bingoBoardEditService.saveCards(cardsData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected save error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in saveCards',
        error,
        expect.objectContaining({
          metadata: expect.objectContaining({
            cardsCount: 1,
            service: 'bingoBoardEditService',
          }),
        })
      );
    });
  });

  describe('updateBoard - Missing Branch Coverage', () => {
    it('should handle update returning null data', async () => {
      const mockUpdateFrom = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValueOnce(mockUpdateFrom);

      const result = await bingoBoardEditService.updateBoard(
        'board-123',
        { title: 'New Title' },
        5
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Board update failed - no data returned');
    });

    it('should handle updated board validation failure', async () => {
      const updatedBoard = {
        id: 'board-123',
        title: 'Updated Title',
      };

      const mockUpdateFrom = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: updatedBoard,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValueOnce(mockUpdateFrom);

      // Mock board validation failure
      (bingoBoardSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Updated board validation failed'),
      });

      const result = await bingoBoardEditService.updateBoard(
        'board-123',
        { title: 'New Title' },
        5
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid updated board data format');
      expect(log.error).toHaveBeenCalledWith(
        'Updated board validation failed',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            updatedBoard,
            service: 'bingoBoardEditService',
          }),
        })
      );
    });

    it('should handle transform updated board data failure', async () => {
      const updatedBoard = {
        id: 'board-123',
        title: 'Updated Title',
        board_state: [],
        settings: {},
      };

      const mockUpdateFrom = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: updatedBoard,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValueOnce(mockUpdateFrom);

      // Mock successful board validation
      (bingoBoardSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: updatedBoard,
      });

      // Mock zBoardState validation failure to trigger transform failure
      (zBoardState.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Invalid board state'),
      });

      const result = await bingoBoardEditService.updateBoard(
        'board-123',
        { title: 'New Title' },
        5
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to transform updated board data');
    });

    it('should handle unexpected error during update', async () => {
      const error = new Error('Unexpected update error');
      mockSupabase.from.mockImplementation(() => {
        throw error;
      });

      const result = await bingoBoardEditService.updateBoard(
        'board-123',
        { title: 'New Title' },
        5
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected update error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in updateBoard',
        error,
        expect.objectContaining({
          metadata: expect.objectContaining({
            boardId: 'board-123',
            currentVersion: 5,
            service: 'bingoBoardEditService',
          }),
        })
      );
    });
  });

  describe('createCard - Missing Branch Coverage', () => {
    it('should handle card creation returning null data', async () => {
      const cardData: CardInsertData = {
        title: 'New Card',
        description: null,
        game_type: 'All Games',
        difficulty: 'easy',
        tags: null,
        creator_id: 'user-123',
        is_public: false,
      };

      const mockCreateFrom = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValueOnce(mockCreateFrom);

      const result = await bingoBoardEditService.createCard(cardData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Card creation failed - no data returned');
    });

    it('should handle new card validation failure', async () => {
      const cardData: CardInsertData = {
        title: 'New Card',
        description: null,
        game_type: 'All Games',
        difficulty: 'easy',
        tags: null,
        creator_id: 'user-123',
        is_public: false,
      };

      const newCard = {
        id: 'card-new',
        title: 'New Card',
      };

      const mockCreateFrom = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: newCard,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValueOnce(mockCreateFrom);

      // Mock card validation failure
      (bingoCardSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('New card validation failed'),
      });

      const result = await bingoBoardEditService.createCard(cardData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid new card data format');
      expect(log.error).toHaveBeenCalledWith(
        'New card validation failed',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            newCard,
            service: 'bingoBoardEditService',
          }),
        })
      );
    });

    it('should handle unexpected error during creation', async () => {
      const cardData: CardInsertData = {
        title: 'New Card',
        description: null,
        game_type: 'All Games',
        difficulty: 'easy',
        tags: null,
        creator_id: 'user-123',
        is_public: false,
      };

      const error = new Error('Unexpected create error');
      mockSupabase.from.mockImplementation(() => {
        throw error;
      });

      const result = await bingoBoardEditService.createCard(cardData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected create error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in createCard',
        error,
        expect.objectContaining({
          metadata: expect.objectContaining({
            cardData,
            service: 'bingoBoardEditService',
          }),
        })
      );
    });
  });

  describe('updateCard - Missing Branch Coverage', () => {
    it('should handle card update returning null data', async () => {
      const mockUpdateFrom = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValueOnce(mockUpdateFrom);

      const result = await bingoBoardEditService.updateCard('card-123', {
        title: 'New Title',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Card update failed - no data returned');
    });

    it('should handle updated card validation failure', async () => {
      const updatedCard = {
        id: 'card-123',
        title: 'Updated Title',
      };

      const mockUpdateFrom = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedCard,
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValueOnce(mockUpdateFrom);

      // Mock card validation failure
      (bingoCardSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Updated card validation failed'),
      });

      const result = await bingoBoardEditService.updateCard('card-123', {
        title: 'New Title',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid updated card data format');
      expect(log.error).toHaveBeenCalledWith(
        'Updated card validation failed',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            updatedCard,
            service: 'bingoBoardEditService',
          }),
        })
      );
    });

    it('should handle unexpected error during card update', async () => {
      const error = new Error('Unexpected card update error');
      mockSupabase.from.mockImplementation(() => {
        throw error;
      });

      const result = await bingoBoardEditService.updateCard('card-123', {
        title: 'New Title',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected card update error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in updateCard',
        error,
        expect.objectContaining({
          metadata: expect.objectContaining({
            cardId: 'card-123',
            service: 'bingoBoardEditService',
          }),
        })
      );
    });
  });

  describe('initializeBoardData - Missing Branch Coverage', () => {
    it('should handle getBoardForEdit returning success false with no data', async () => {
      jest
        .spyOn(bingoBoardEditService, 'getBoardForEdit')
        .mockResolvedValueOnce({
          success: false,
          data: null,
          error: 'Board not found',
        });

      const result =
        await bingoBoardEditService.initializeBoardData('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Board not found');
    });

    it('should handle getBoardForEdit returning success true but no data', async () => {
      jest
        .spyOn(bingoBoardEditService, 'getBoardForEdit')
        .mockResolvedValueOnce({
          success: true,
          data: null,
          error: null,
        });

      const result =
        await bingoBoardEditService.initializeBoardData('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Board not found');
    });

    it('should handle board with default size (5) when size is not specified', async () => {
      const mockBoard: Partial<BingoBoard> = {
        id: 'board-123',
        title: 'Test Board',
        creator_id: 'user-456',
        game_type: 'All Games',
        difficulty: 'easy',
        // size is undefined/null
      };

      const mockCards: BingoCard[] = [];

      jest
        .spyOn(bingoBoardEditService, 'getBoardForEdit')
        .mockResolvedValueOnce({
          success: true,
          data: {
            board: mockBoard as any,
            cards: mockCards,
          },
          error: null,
        });

      const result =
        await bingoBoardEditService.initializeBoardData('board-123');

      expect(result.success).toBe(true);
      expect(result.data?.gridCards).toHaveLength(25); // 5x5 = 25 cells (default)
    });

    it('should handle unexpected error during initialization', async () => {
      const error = new Error('Unexpected initialization error');
      jest
        .spyOn(bingoBoardEditService, 'getBoardForEdit')
        .mockRejectedValueOnce(error);

      const result =
        await bingoBoardEditService.initializeBoardData('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected initialization error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in initializeBoardData',
        error,
        expect.objectContaining({
          metadata: expect.objectContaining({
            boardId: 'board-123',
            service: 'bingoBoardEditService',
          }),
        })
      );
    });
  });

  describe('Edge Cases and Validation Scenarios', () => {
    it('should handle _transformDbBoardToDomain with valid data', async () => {
      const mockBoard = {
        id: 'board-123',
        title: 'Test Board',
        creator_id: 'user-456',
        game_type: 'All Games',
        difficulty: 'easy',
        size: 5,
        board_state: [],
        settings: {
          team_mode: true,
          lockout: false,
          sound_enabled: true,
          win_conditions: ['row'],
        },
      };

      // Mock successful board fetch
      mockFrom.single.mockResolvedValueOnce({
        data: mockBoard,
        error: null,
      });

      // Mock successful cards fetch
      const mockCardsFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockFrom)
        .mockReturnValueOnce(mockCardsFrom);

      // Mock successful validations
      (bingoBoardSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: mockBoard,
      });
      (zBoardState.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: [],
      });
      (zBoardSettings.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: mockBoard.settings,
      });

      const result = await bingoBoardEditService.getBoardForEdit('board-123');

      expect(result.success).toBe(true);
      expect(result.data?.board).toBeDefined();
      expect(transformBoardState).toHaveBeenCalledWith([]);
      expect(transformBoardSettings).toHaveBeenCalledWith(mockBoard.settings);
    });

    it('should handle board with null settings gracefully', async () => {
      const mockBoard = {
        id: 'board-123',
        title: 'Test Board',
        creator_id: 'user-456',
        game_type: 'All Games',
        difficulty: 'easy',
        size: 5,
        board_state: [],
        settings: null, // null settings should trigger default fallback
      };

      // Mock successful board fetch
      mockFrom.single.mockResolvedValueOnce({
        data: mockBoard,
        error: null,
      });

      // Mock successful cards fetch
      const mockCardsFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockFrom)
        .mockReturnValueOnce(mockCardsFrom);

      // Mock successful validations
      (bingoBoardSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: mockBoard,
      });
      (zBoardState.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: [],
      });
      (zBoardSettings.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: {
          team_mode: null,
          lockout: null,
          sound_enabled: null,
          win_conditions: null,
        },
      });

      const result = await bingoBoardEditService.getBoardForEdit('board-123');

      expect(result.success).toBe(true);
      expect(zBoardSettings.safeParse).toHaveBeenCalledWith({
        team_mode: null,
        lockout: null,
        sound_enabled: null,
        win_conditions: null,
      });
    });
  });
});
