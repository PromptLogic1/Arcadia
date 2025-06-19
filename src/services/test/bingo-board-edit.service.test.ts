/**
 * @jest-environment node
 */

import { bingoBoardEditService } from '../bingo-board-edit.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import type { BingoBoard, BingoCard } from '@/types';
import type {
  BoardEditData,
  CardInsertData,
} from '../bingo-board-edit.service';
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

describe('bingoBoardEditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    // Reset all mock functions
    mockSupabase.from.mockClear();
    mockFrom.select.mockClear();
    mockFrom.insert.mockClear();
    mockFrom.update.mockClear();
    mockFrom.eq.mockClear();
    mockFrom.single.mockClear();
    mockFrom.order.mockClear();

    // Setup default chaining behavior for method chaining
    mockSupabase.from.mockReturnValue(mockFrom);
    mockFrom.select.mockReturnValue(mockFrom);
    mockFrom.insert.mockReturnValue(mockFrom);
    mockFrom.update.mockReturnValue(mockFrom);
    mockFrom.eq.mockReturnValue(mockFrom);
    mockFrom.single.mockReturnValue(mockFrom);
    mockFrom.order.mockReturnValue(mockFrom);

    // Mock validation schemas to always pass
    const mockBoardData = {
      id: 'test-id',
      title: 'Test Title',
      creator_id: 'user-456',
      game_type: 'All Games',
      difficulty: 'easy',
      size: 5,
      board_state: [],
      settings: {},
      is_public: true,
      version: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const mockCardData = {
      id: 'test-card-id',
      title: 'Test Card',
      description: null,
      game_type: 'All Games',
      difficulty: 'easy',
      tags: null,
      creator_id: 'user-456',
      is_public: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      votes: null,
    };

    // Set up validation mocks to pass through input data
    (bingoBoardSchema.safeParse as jest.Mock).mockImplementation(data => ({
      success: true,
      data: data || mockBoardData,
    }));

    (bingoCardSchema.safeParse as jest.Mock).mockImplementation(data => ({
      success: true,
      data: data || mockCardData,
    }));

    (bingoCardsArraySchema.safeParse as jest.Mock).mockImplementation(data => ({
      success: true,
      data: data || [mockCardData],
    }));

    (zBoardState.safeParse as jest.Mock).mockImplementation(data => ({
      success: true,
      data: data || [],
    }));

    (zBoardSettings.safeParse as jest.Mock).mockImplementation(data => ({
      success: true,
      data: data || {},
    }));

    // Mock transform functions to pass through data
    (transformBoardState as jest.Mock).mockImplementation(data => data || []);
    (transformBoardSettings as jest.Mock).mockImplementation(
      data => data || {}
    );
  });

  describe('getBoardForEdit', () => {
    it('should fetch board and cards successfully', async () => {
      const mockBoard: Partial<BingoBoard> = {
        id: 'board-123',
        title: 'Test Board',
        creator_id: 'user-456',
        game_type: 'All Games',
        difficulty: 'easy',
        size: 5,
        board_state: [],
        settings: {},
        is_public: true,
        version: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockCards: BingoCard[] = [
        {
          id: 'card-1',
          title: 'Test Card 1',
          description: null,
          game_type: 'All Games',
          difficulty: 'easy',
          tags: null,
          creator_id: 'user-456',
          is_public: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          votes: null,
        },
      ];

      // Mock board fetch - first call to supabase.from('bingo_boards')
      mockFrom.single.mockResolvedValueOnce({
        data: mockBoard,
        error: null,
      });

      // Mock cards fetch - second call to supabase.from('bingo_cards')
      const mockCardsFrom = {
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

      // Set up the second from call for cards
      mockSupabase.from
        .mockReturnValueOnce(mockFrom)
        .mockReturnValueOnce(mockCardsFrom);

      const result = await bingoBoardEditService.getBoardForEdit('board-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('board');
      expect(result.data).toHaveProperty('cards');
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_boards');
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'board-123');
    });

    it('should handle board not found', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Board not found' },
      });

      const result = await bingoBoardEditService.getBoardForEdit('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Board not found');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to fetch board',
        expect.any(Object),
        expect.objectContaining({
          metadata: expect.objectContaining({
            boardId: 'nonexistent',
            service: 'bingoBoardEditService',
          }),
        })
      );
    });

    it('should handle cards fetch error', async () => {
      const mockBoard = {
        id: 'board-123',
        creator_id: 'user-456',
        game_type: 'All Games',
        title: 'Test Board',
        difficulty: 'easy',
        size: 5,
        board_state: [],
        settings: {},
        is_public: true,
        version: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock successful board fetch
      mockFrom.single.mockResolvedValueOnce({
        data: mockBoard,
        error: null,
      });

      // Mock failed cards fetch
      const mockCardsFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Cards fetch failed' },
              }),
            }),
          }),
        }),
      };

      // Set up the from calls
      mockSupabase.from
        .mockReturnValueOnce(mockFrom)
        .mockReturnValueOnce(mockCardsFrom);

      const result = await bingoBoardEditService.getBoardForEdit('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cards fetch failed');
    });
  });

  describe('saveCards', () => {
    it('should save multiple cards successfully', async () => {
      const cardsData: CardInsertData[] = [
        {
          title: 'Card 1',
          description: 'Description 1',
          game_type: 'All Games',
          difficulty: 'easy',
          tags: ['test'],
          creator_id: 'user-123',
          is_public: false,
        },
        {
          title: 'Card 2',
          description: null,
          game_type: 'All Games',
          difficulty: 'medium',
          tags: null,
          creator_id: 'user-123',
          is_public: true,
        },
      ];

      const savedCard1 = {
        id: 'card-1',
        ...cardsData[0],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        votes: null,
      };
      const savedCard2 = {
        id: 'card-2',
        ...cardsData[1],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        votes: null,
      };

      // Create separate mock instances for each card insert operation
      const mockCard1From = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: savedCard1,
              error: null,
            }),
          }),
        }),
      };

      const mockCard2From = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: savedCard2,
              error: null,
            }),
          }),
        }),
      };

      // Mock each supabase.from call for cards insertions
      mockSupabase.from
        .mockReturnValueOnce(mockCard1From)
        .mockReturnValueOnce(mockCard2From);

      const result = await bingoBoardEditService.saveCards(cardsData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it('should skip empty cards', async () => {
      const cardsData: CardInsertData[] = [
        {
          title: '',
          description: 'Empty title',
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
        ...cardsData[1],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        votes: null,
      };

      // Only one from call since first card is skipped due to empty title
      const mockCardFrom = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: savedCard,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValueOnce(mockCardFrom);

      const result = await bingoBoardEditService.saveCards(cardsData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].title).toBe('Valid Card');
    });

    it('should handle card save error', async () => {
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

      const mockCardFrom = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Save failed' },
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValueOnce(mockCardFrom);

      const result = await bingoBoardEditService.saveCards(cardsData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Save failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to save card',
        expect.any(Object),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'bingoBoardEditService',
          }),
        })
      );
    });
  });

  describe('updateBoard', () => {
    it('should update board with optimistic concurrency control', async () => {
      const boardId = 'board-123';
      const updates: BoardEditData = {
        title: 'Updated Title',
        description: 'Updated description',
        difficulty: 'medium',
        is_public: true,
      };
      const currentVersion = 5;

      const updatedBoard = {
        id: boardId,
        creator_id: 'user-456',
        game_type: 'All Games',
        size: 5,
        board_state: [],
        settings: {},
        created_at: '2024-01-01T00:00:00Z',
        ...updates,
        version: currentVersion + 1,
        updated_at: '2024-01-01T01:00:00Z',
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

      const result = await bingoBoardEditService.updateBoard(
        boardId,
        updates,
        currentVersion
      );

      expect(result.success).toBe(true);
      expect(mockUpdateFrom.update).toHaveBeenCalledWith({
        title: 'Updated Title',
        description: 'Updated description',
        difficulty: 'medium',
        is_public: true,
        board_state: undefined,
        version: 6,
        updated_at: expect.any(String),
      });
    });

    it('should handle version conflict', async () => {
      const mockUpdateFrom = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116', message: 'No rows affected' },
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
      expect(result.error).toBe(
        'Board was modified by another user. Please refresh and try again.'
      );
    });

    it('should handle other update errors', async () => {
      const mockUpdateFrom = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
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
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to update board',
        expect.any(Object),
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

  describe('createCard', () => {
    it('should create new card successfully', async () => {
      const cardData: CardInsertData = {
        title: 'New Card',
        description: 'Card description',
        game_type: 'All Games',
        difficulty: 'easy',
        tags: ['test'],
        creator_id: 'user-123',
        is_public: false,
      };

      const newCard = {
        id: 'card-new',
        ...cardData,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        votes: null,
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

      const result = await bingoBoardEditService.createCard(cardData);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: 'card-new',
        title: 'New Card',
        description: 'Card description',
      });
      expect(mockCreateFrom.insert).toHaveBeenCalledWith({
        title: 'New Card',
        description: 'Card description',
        game_type: 'All Games',
        difficulty: 'easy',
        tags: ['test'],
        creator_id: 'user-123',
        is_public: false,
      });
    });

    it('should handle card creation error', async () => {
      const cardData: CardInsertData = {
        title: 'Failed Card',
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
              error: { message: 'Creation failed' },
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValueOnce(mockCreateFrom);

      const result = await bingoBoardEditService.createCard(cardData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Creation failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to create card',
        expect.any(Object),
        expect.objectContaining({
          metadata: expect.objectContaining({
            cardData,
            service: 'bingoBoardEditService',
          }),
        })
      );
    });
  });

  describe('updateCard', () => {
    it('should update existing card successfully', async () => {
      const cardId = 'card-123';
      const updates = {
        title: 'Updated Card Title',
        description: 'Updated description',
        difficulty: 'medium' as const,
      };

      const updatedCard = {
        id: cardId,
        game_type: 'All Games',
        creator_id: 'user-123',
        is_public: false,
        tags: null,
        votes: null,
        created_at: '2024-01-01T00:00:00Z',
        ...updates,
        updated_at: '2024-01-01T01:00:00Z',
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

      const result = await bingoBoardEditService.updateCard(cardId, updates);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: cardId,
        title: 'Updated Card Title',
        description: 'Updated description',
      });
      expect(mockUpdateFrom.update).toHaveBeenCalledWith({
        title: 'Updated Card Title',
        description: 'Updated description',
        game_type: undefined,
        difficulty: 'medium',
        tags: undefined,
        is_public: undefined,
        updated_at: expect.any(String),
      });
    });

    it('should handle card update error', async () => {
      const mockUpdateFrom = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Update failed' },
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
      expect(result.error).toBe('Update failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to update card',
        expect.any(Object),
        expect.objectContaining({
          metadata: expect.objectContaining({
            cardId: 'card-123',
            service: 'bingoBoardEditService',
          }),
        })
      );
    });
  });

  describe('initializeBoardData', () => {
    it('should initialize board data with grid cards', async () => {
      const mockBoard: Partial<BingoBoard> = {
        id: 'board-123',
        title: 'Test Board',
        creator_id: 'user-456',
        game_type: 'All Games',
        difficulty: 'easy',
        size: 3, // 3x3 grid for easier testing
      };

      const mockCards: BingoCard[] = [
        {
          id: 'card-1',
          title: 'Private Card',
          description: null,
          game_type: 'All Games',
          difficulty: 'easy',
          tags: null,
          creator_id: 'user-456',
          is_public: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          votes: null,
        },
      ];

      // Mock getBoardForEdit
      jest
        .spyOn(bingoBoardEditService, 'getBoardForEdit')
        .mockResolvedValueOnce({
          success: true,
          data: {
            board: mockBoard as any,
            cards: mockCards,
          },
        });

      const result =
        await bingoBoardEditService.initializeBoardData('board-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('board');
      expect(result.data).toHaveProperty('gridCards');
      expect(result.data).toHaveProperty('privateCards');
      expect(result.data?.gridCards).toHaveLength(9); // 3x3 = 9 cells
      expect(result.data?.privateCards).toHaveLength(1);
    });

    it('should handle getBoardForEdit failure', async () => {
      jest
        .spyOn(bingoBoardEditService, 'getBoardForEdit')
        .mockResolvedValueOnce({
          success: false,
          error: 'Board not found',
        });

      const result = await bingoBoardEditService.initializeBoardData('invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Board not found');
    });

    it('should filter out grid cards from private cards', async () => {
      const mockBoard: Partial<BingoBoard> = {
        id: 'board-123',
        size: 2, // 2x2 grid
        game_type: 'All Games',
        difficulty: 'easy',
        creator_id: 'user-456',
      };

      const mockCards: BingoCard[] = [
        {
          id: 'card-1',
          title: 'Private Card',
          description: null,
          game_type: 'All Games',
          difficulty: 'easy',
          tags: null,
          creator_id: 'user-456',
          is_public: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          votes: null,
        },
        {
          id: 'card-2',
          title: 'grid-cell-0',
          description: null,
          game_type: 'All Games',
          difficulty: 'easy',
          tags: null,
          creator_id: 'user-456',
          is_public: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          votes: null,
        },
      ];

      jest
        .spyOn(bingoBoardEditService, 'getBoardForEdit')
        .mockResolvedValueOnce({
          success: true,
          data: {
            board: mockBoard as any,
            cards: mockCards,
          },
        });

      const result =
        await bingoBoardEditService.initializeBoardData('board-123');

      expect(result.success).toBe(true);
      expect(result.data?.privateCards).toHaveLength(1);
      expect(result.data?.privateCards[0].title).toBe('Private Card');
      expect(result.data?.gridCards).toHaveLength(4); // 2x2 = 4 cells
    });
  });
});
