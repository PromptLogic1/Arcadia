/**
 * @jest-environment node
 */

import { bingoBoardEditService } from '../bingo-board-edit.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import type { BingoBoard, BingoCard } from '@/types';
import type { BoardEditData, CardInsertData } from '../bingo-board-edit.service';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');
jest.mock('@/lib/validation/schemas/bingo');
jest.mock('@/lib/validation/transforms');

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
    mockSupabase.from.mockReturnValue(mockFrom);

    // Setup default chaining behavior
    mockFrom.select.mockReturnValue(mockFrom);
    mockFrom.insert.mockReturnValue(mockFrom);
    mockFrom.update.mockReturnValue(mockFrom);
    mockFrom.eq.mockReturnValue(mockFrom);
    mockFrom.single.mockReturnValue(mockFrom);
    mockFrom.order.mockReturnValue(mockFrom);

    // Mock validation schemas to always pass
    const mockSchema = {
      safeParse: jest.fn().mockReturnValue({
        success: true,
        data: {},
      }),
    };

    jest.doMock('@/lib/validation/schemas/bingo', () => ({
      bingoBoardSchema: mockSchema,
      bingoCardSchema: mockSchema,
      bingoCardsArraySchema: mockSchema,
      zBoardState: mockSchema,
      zBoardSettings: mockSchema,
    }));

    // Mock transform functions
    jest.doMock('@/lib/validation/transforms', () => ({
      transformBoardState: jest.fn().mockReturnValue({}),
      transformBoardSettings: jest.fn().mockReturnValue({}),
    }));
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

      // Mock board fetch
      mockFrom.single.mockResolvedValueOnce({
        data: mockBoard,
        error: null,
      });

      // Mock cards fetch
      mockSupabase.from.mockReturnValueOnce({
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
      });

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
      };

      // Mock successful board fetch
      mockFrom.single.mockResolvedValueOnce({
        data: mockBoard,
        error: null,
      });

      // Mock failed cards fetch
      mockSupabase.from.mockReturnValueOnce({
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
      });

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

      const savedCard1 = { id: 'card-1', ...cardsData[0] };
      const savedCard2 = { id: 'card-2', ...cardsData[1] };

      // Mock first card save
      mockFrom.single.mockResolvedValueOnce({
        data: savedCard1,
        error: null,
      });

      // Mock second card save - need to reset the mock chain
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: savedCard2,
              error: null,
            }),
          }),
        }),
      });

      const result = await bingoBoardEditService.saveCards(cardsData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockFrom.insert).toHaveBeenCalledTimes(1); // First call
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

      const savedCard = { id: 'card-1', ...cardsData[1] };

      mockFrom.single.mockResolvedValueOnce({
        data: savedCard,
        error: null,
      });

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

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Save failed' },
      });

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
        ...updates,
        version: currentVersion + 1,
        updated_at: expect.any(String),
      };

      mockFrom.single.mockResolvedValueOnce({
        data: updatedBoard,
        error: null,
      });

      const result = await bingoBoardEditService.updateBoard(
        boardId,
        updates,
        currentVersion
      );

      expect(result.success).toBe(true);
      expect(mockFrom.update).toHaveBeenCalledWith({
        title: 'Updated Title',
        description: 'Updated description',
        difficulty: 'medium',
        is_public: true,
        board_state: undefined,
        version: 6,
        updated_at: expect.any(String),
      });
      expect(mockFrom.eq).toHaveBeenCalledWith('id', boardId);
      expect(mockFrom.eq).toHaveBeenCalledWith('version', currentVersion);
    });

    it('should handle version conflict', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows affected' },
      });

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
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

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

      mockFrom.single.mockResolvedValueOnce({
        data: newCard,
        error: null,
      });

      const result = await bingoBoardEditService.createCard(cardData);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: 'card-new',
        title: 'New Card',
        description: 'Card description',
      });
      expect(mockFrom.insert).toHaveBeenCalledWith({
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

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Creation failed' },
      });

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
        ...updates,
        updated_at: expect.any(String),
      };

      mockFrom.single.mockResolvedValueOnce({
        data: updatedCard,
        error: null,
      });

      const result = await bingoBoardEditService.updateCard(cardId, updates);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: cardId,
        title: 'Updated Card Title',
        description: 'Updated description',
      });
      expect(mockFrom.update).toHaveBeenCalledWith({
        title: 'Updated Card Title',
        description: 'Updated description',
        game_type: undefined,
        difficulty: 'medium',
        tags: undefined,
        is_public: undefined,
        updated_at: expect.any(String),
      });
      expect(mockFrom.eq).toHaveBeenCalledWith('id', cardId);
    });

    it('should handle card update error', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

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
      jest.spyOn(bingoBoardEditService, 'getBoardForEdit').mockResolvedValueOnce({
        success: true,
        data: {
          board: mockBoard as any,
          cards: mockCards,
        },
      });

      const result = await bingoBoardEditService.initializeBoardData('board-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('board');
      expect(result.data).toHaveProperty('gridCards');
      expect(result.data).toHaveProperty('privateCards');
      expect(result.data?.gridCards).toHaveLength(9); // 3x3 = 9 cells
      expect(result.data?.privateCards).toHaveLength(1);
    });

    it('should handle getBoardForEdit failure', async () => {
      jest.spyOn(bingoBoardEditService, 'getBoardForEdit').mockResolvedValueOnce({
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

      jest.spyOn(bingoBoardEditService, 'getBoardForEdit').mockResolvedValueOnce({
        success: true,
        data: {
          board: mockBoard as any,
          cards: mockCards,
        },
      });

      const result = await bingoBoardEditService.initializeBoardData('board-123');

      expect(result.success).toBe(true);
      expect(result.data?.privateCards).toHaveLength(1);
      expect(result.data?.privateCards[0].title).toBe('Private Card');
      expect(result.data?.gridCards).toHaveLength(4); // 2x2 = 4 cells
    });
  });
});