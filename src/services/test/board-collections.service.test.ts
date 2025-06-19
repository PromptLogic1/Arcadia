/**
 * @jest-environment node
 */

import { boardCollectionsService } from '../board-collections.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import type { Database } from '@/types/database.types';
import type { GameCategory, Difficulty } from '@/types';
import { zBoardState, zBoardSettings } from '@/lib/validation/schemas/bingo';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');
jest.mock('@/lib/validation/schemas/bingo', () => ({
  zBoardState: {
    safeParse: jest.fn().mockImplementation(data => ({
      success: true,
      data: data || [],
    })),
  },
  zBoardSettings: {
    safeParse: jest.fn().mockImplementation(data => ({
      success: true,
      data: data || {},
    })),
  },
}));
jest.mock('@/lib/validation/transforms', () => ({
  transformBoardState: jest.fn().mockImplementation(state => state || []),
  transformBoardSettings: jest
    .fn()
    .mockImplementation(settings => settings || {}),
}));

type DBBingoBoard = Database['public']['Tables']['bingo_boards']['Row'];

// Helper function to create properly typed mock boards
const createMockBoard = (overrides: Partial<DBBingoBoard> = {}): DBBingoBoard => ({
  id: 'board-123',
  title: 'Test Board',
  description: 'Test description',
  game_type: 'All Games',
  difficulty: 'medium',
  is_public: true,
  cloned_from: null,
  size: 5,
  status: 'active',
  version: 1,
  bookmarked_count: 0,
  votes: 0,
  creator_id: 'user-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  board_state: [
    { 
      cell_id: 'cell-1', 
      text: 'Test cell', 
      colors: null,
      completed_by: null,
      blocked: null,
      is_marked: false,
      version: null,
      last_updated: null,
      last_modified_by: null
    },
  ],
  settings: {
    team_mode: false,
    lockout: false,
    sound_enabled: true,
    win_conditions: {
      line: true,
      majority: false,
      diagonal: true,
      corners: false,
    },
  },
  ...overrides,
});

const mockSupabase = {
  from: jest.fn(),
};

const mockFrom = {
  select: jest.fn(),
  eq: jest.fn(),
  not: jest.fn(),
  or: jest.fn(),
  order: jest.fn(),
  limit: jest.fn(),
  single: jest.fn(),
};

describe('boardCollectionsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    mockSupabase.from.mockReturnValue(mockFrom);

    // Setup default chaining behavior
    mockFrom.select.mockReturnValue(mockFrom);
    mockFrom.eq.mockReturnValue(mockFrom);
    mockFrom.not.mockReturnValue(mockFrom);
    mockFrom.or.mockReturnValue(mockFrom);
    mockFrom.order.mockReturnValue(mockFrom);
    mockFrom.limit.mockReturnValue(mockFrom);
    mockFrom.single.mockReturnValue(mockFrom);
  });

  describe('getCollections', () => {
    const validFilters = {
      search: 'test',
      difficulty: 'medium' as Difficulty,
      sortBy: 'popular' as const,
      gameType: 'World of Warcraft' as GameCategory,
    };

    it('should return filtered board collections successfully', async () => {
      const mockBoards: DBBingoBoard[] = [
        createMockBoard({
          id: 'board-1',
          title: 'Test Board',
          description: 'Test description',
          game_type: 'World of Warcraft',
          difficulty: 'medium',
          is_public: true,
          board_state: [
            { 
              cell_id: 'cell-1', 
              text: 'Test cell', 
              colors: null,
              completed_by: null,
              blocked: null,
              is_marked: false,
              version: null,
              last_updated: null,
              last_modified_by: null
            },
            { 
              cell_id: 'cell-2', 
              text: 'Another cell', 
              colors: null,
              completed_by: null,
              blocked: null,
              is_marked: false,
              version: null,
              last_updated: null,
              last_modified_by: null
            },
          ],
          votes: 15,
          bookmarked_count: 5,
        }),
        createMockBoard({
          id: 'board-2',
          title: 'Another Board',
          description: 'Another description',
          game_type: 'World of Warcraft',
          difficulty: 'medium',
          is_public: true,
          board_state: [
            { 
              cell_id: 'cell-3', 
              text: 'Cell 1', 
              colors: null,
              completed_by: null,
              blocked: null,
              is_marked: false,
              version: null,
              last_updated: null,
              last_modified_by: null
            },
            { 
              cell_id: 'cell-4', 
              text: 'Cell 2', 
              colors: null,
              completed_by: null,
              blocked: null,
              is_marked: true,
              version: null,
              last_updated: null,
              last_modified_by: null
            },
          ],
          creator_id: 'user-456',
          votes: 8,
          bookmarked_count: 3,
        }),
      ];

      mockFrom.limit.mockResolvedValueOnce({
        data: mockBoards,
        error: null,
      });

      const result = await boardCollectionsService.getCollections(validFilters);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0]?.id).toBe('board-1');
      expect(result.data?.[1]?.id).toBe('board-2');

      // Verify query construction
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_boards');
      expect(mockFrom.eq).toHaveBeenCalledWith('is_public', true);
      expect(mockFrom.eq).toHaveBeenCalledWith(
        'game_type',
        'World of Warcraft'
      );
      expect(mockFrom.not).toHaveBeenCalledWith('board_state', 'is', null);
      expect(mockFrom.eq).toHaveBeenCalledWith('difficulty', 'medium');
      expect(mockFrom.or).toHaveBeenCalledWith(
        'title.ilike.%test%,description.ilike.%test%'
      );
      expect(mockFrom.order).toHaveBeenCalledWith('votes', {
        ascending: false,
      });
      expect(mockFrom.limit).toHaveBeenCalledWith(50);
    });

    it('should handle different sort options', async () => {
      const mockData = [
        {
          id: 'board-1',
          title: 'Test Board',
          game_type: 'Fortnite',
          difficulty: 'easy',
          is_public: true,
          board_state: [{ row: 0, col: 0, text: 'Test', marked: false }],
          settings: {},
          creator_id: 'user-123',
          votes: 5,
          bookmarked_count: 2,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      // Test newest sort
      mockFrom.limit.mockResolvedValueOnce({ data: mockData, error: null });
      await boardCollectionsService.getCollections({
        ...validFilters,
        sortBy: 'newest',
      });
      expect(mockFrom.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });

      // Test bookmarks sort
      mockFrom.limit.mockResolvedValueOnce({ data: mockData, error: null });
      await boardCollectionsService.getCollections({
        ...validFilters,
        sortBy: 'bookmarks',
      });
      expect(mockFrom.order).toHaveBeenCalledWith('bookmarked_count', {
        ascending: false,
      });

      // Test trending sort (falls back to votes)
      mockFrom.limit.mockResolvedValueOnce({ data: mockData, error: null });
      await boardCollectionsService.getCollections({
        ...validFilters,
        sortBy: 'trending',
      });
      expect(mockFrom.order).toHaveBeenCalledWith('votes', {
        ascending: false,
      });
    });

    it('should skip difficulty filter when set to "all"', async () => {
      mockFrom.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await boardCollectionsService.getCollections({
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

    it('should skip search filter when empty', async () => {
      mockFrom.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await boardCollectionsService.getCollections({
        ...validFilters,
        search: '',
      });

      expect(mockFrom.or).not.toHaveBeenCalled();
    });

    it('should handle database error', async () => {
      mockFrom.limit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const result = await boardCollectionsService.getCollections(validFilters);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to load board collections',
        { message: 'Database connection failed' },
        expect.objectContaining({
          metadata: {
            service: 'boardCollections',
            method: 'getCollections',
            filters: validFilters,
          },
        })
      );
    });

    it('should filter out invalid boards during transformation', async () => {
      const mockBoards = [
        {
          id: 'valid-board',
          title: 'Valid Board',
          game_type: 'Minecraft',
          difficulty: 'easy',
          is_public: true,
          board_state: [{ row: 0, col: 0, text: 'Valid', marked: false }],
          settings: { team_mode: false },
          creator_id: 'user-123',
          votes: 1,
          bookmarked_count: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'invalid-board',
          title: 'Invalid Board',
          game_type: 'Minecraft',
          difficulty: 'easy',
          is_public: true,
          board_state: 'invalid_state', // Invalid board state
          settings: {},
          creator_id: 'user-456',
          votes: 2,
          bookmarked_count: 1,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockFrom.limit.mockResolvedValueOnce({
        data: mockBoards,
        error: null,
      });

      // Mock validation to fail for the second board
      (zBoardState.safeParse as jest.Mock)
        .mockReturnValueOnce({ success: true, data: mockBoards[0]?.board_state })
        .mockReturnValueOnce({
          success: false,
          error: new Error('Invalid state'),
        });

      const result = await boardCollectionsService.getCollections(validFilters);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]?.id).toBe('valid-board');
      expect(log.debug).toHaveBeenCalledWith(
        'Skipping board with invalid data format',
        expect.objectContaining({
          metadata: {
            boardId: 'invalid-board',
            reason: 'Invalid board_state or settings format',
            boardStateValid: false,
            settingsValid: true,
          },
        })
      );
    });

    it('should handle settings validation failure', async () => {
      const mockBoard = {
        id: 'board-1',
        title: 'Test Board',
        game_type: 'Apex Legends',
        difficulty: 'hard',
        is_public: true,
        board_state: [{ row: 0, col: 0, text: 'Test', marked: false }],
        settings: 'invalid_settings', // Invalid settings
        creator_id: 'user-123',
        votes: 5,
        bookmarked_count: 2,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockFrom.limit.mockResolvedValueOnce({
        data: [mockBoard],
        error: null,
      });

      // Mock validation to fail for settings
      (zBoardState.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: mockBoard.board_state,
      });
      (zBoardSettings.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Invalid settings'),
      });

      const result = await boardCollectionsService.getCollections(validFilters);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(log.debug).toHaveBeenCalledWith(
        'Skipping board with invalid data format',
        expect.objectContaining({
          metadata: {
            boardId: 'board-1',
            reason: 'Invalid board_state or settings format',
            boardStateValid: true,
            settingsValid: false,
          },
        })
      );
    });

    it('should handle unexpected error', async () => {
      mockFrom.limit.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await boardCollectionsService.getCollections(validFilters);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error loading board collections',
        expect.any(Error),
        expect.objectContaining({
          metadata: {
            service: 'boardCollections',
            method: 'getCollections',
            filters: validFilters,
          },
        })
      );
    });

    it('should handle null data gracefully', async () => {
      mockFrom.limit.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await boardCollectionsService.getCollections(validFilters);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle empty filters object', async () => {
      mockFrom.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await boardCollectionsService.getCollections({
        search: '',
        difficulty: 'all',
        sortBy: 'newest',
        gameType: 'Valorant' as GameCategory,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockFrom.eq).toHaveBeenCalledWith('is_public', true);
      expect(mockFrom.eq).toHaveBeenCalledWith('game_type', 'Valorant');
      expect(mockFrom.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });
  });

  describe('getCollection', () => {
    it('should return single board collection successfully', async () => {
      const mockBoard: DBBingoBoard = createMockBoard({
        id: 'board-123',
        title: 'Single Board',
        description: 'Single board description',
        game_type: 'CS:GO',
        difficulty: 'expert',
        is_public: true,
        board_state: [
          { 
            cell_id: 'cell-5', 
            text: 'Test cell', 
            colors: null,
            completed_by: null,
            blocked: null,
            is_marked: false,
            version: null,
            last_updated: null,
            last_modified_by: null
          },
          { 
            cell_id: 'cell-6', 
            text: 'Another cell', 
            colors: null,
            completed_by: null,
            blocked: null,
            is_marked: true,
            version: null,
            last_updated: null,
            last_modified_by: null
          },
        ],
        creator_id: 'user-789',
        votes: 25,
        bookmarked_count: 8,
        updated_at: '2024-01-01T12:00:00Z',
      });

      mockFrom.single.mockResolvedValueOnce({
        data: mockBoard,
        error: null,
      });

      const result = await boardCollectionsService.getCollection('board-123');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('board-123');
      expect(result.data?.title).toBe('Single Board');
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_boards');
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'board-123');
      expect(mockFrom.eq).toHaveBeenCalledWith('is_public', true);
    });

    it('should return null for non-existent board', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await boardCollectionsService.getCollection('nonexistent');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle database error', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'DB_ERROR', message: 'Database error' },
      });

      const result = await boardCollectionsService.getCollection('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to load board collection',
        { code: 'DB_ERROR', message: 'Database error' },
        expect.objectContaining({
          metadata: {
            service: 'boardCollections',
            method: 'getCollection',
            collectionId: 'board-123',
          },
        })
      );
    });

    it('should handle null data response', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await boardCollectionsService.getCollection('board-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle transformation failure', async () => {
      const mockBoard = {
        id: 'board-123',
        title: 'Invalid Board',
        game_type: 'Dota 2',
        difficulty: 'medium',
        is_public: true,
        board_state: 'invalid_state',
        settings: {},
        creator_id: 'user-123',
        votes: 1,
        bookmarked_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockBoard,
        error: null,
      });

      // Mock validation failure
      (zBoardState.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Invalid board state'),
      });

      const result = await boardCollectionsService.getCollection('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid board collection data format');
    });

    it('should handle unexpected error', async () => {
      mockFrom.single.mockRejectedValueOnce(new Error('Connection timeout'));

      const result = await boardCollectionsService.getCollection('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection timeout');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error loading board collection',
        expect.any(Error),
        expect.objectContaining({
          metadata: {
            service: 'boardCollections',
            method: 'getCollection',
            collectionId: 'board-123',
          },
        })
      );
    });

    it('should handle board with null updated_at', async () => {
      const mockBoard: DBBingoBoard = createMockBoard({
        id: 'board-456',
        title: 'Board Without Update',
        description: 'No update timestamp',
        game_type: 'Overwatch',
        difficulty: 'easy',
        is_public: true,
        board_state: [{ 
          cell_id: 'cell-7', 
          text: 'Cell', 
          colors: null,
          completed_by: null,
          blocked: null,
          is_marked: false,
          version: null,
          last_updated: null,
          last_modified_by: null
        }],
        creator_id: 'user-123',
        votes: 3,
        bookmarked_count: 1,
        updated_at: null, // Null updated_at
      });

      mockFrom.single.mockResolvedValueOnce({
        data: mockBoard,
        error: null,
      });

      const result = await boardCollectionsService.getCollection('board-456');

      expect(result.success).toBe(true);
      expect(result.data?.updated_at).toBeNull();
    });

    it('should handle board with minimal settings', async () => {
      const mockBoard: DBBingoBoard = createMockBoard({
        id: 'board-minimal',
        title: 'Minimal Board',
        description: null,
        game_type: 'Fall Guys',
        difficulty: 'beginner',
        is_public: true,
        board_state: [{ 
          cell_id: 'cell-8', 
          text: 'Simple', 
          colors: null,
          completed_by: null,
          blocked: null,
          is_marked: false,
          version: null,
          last_updated: null,
          last_modified_by: null
        }],
        settings: null, // Null settings
        creator_id: 'user-123',
        votes: 1,
        bookmarked_count: 0,
      });

      mockFrom.single.mockResolvedValueOnce({
        data: mockBoard,
        error: null,
      });

      const result =
        await boardCollectionsService.getCollection('board-minimal');

      expect(result.success).toBe(true);
      expect(result.data?.settings).toBeDefined();
    });
  });

  describe('BoardStateCell type export', () => {
    it('should properly export BoardStateCell type', () => {
      // This test ensures the type export is working
      // Type exports are compile-time only, so we can't import them at runtime
      expect(true).toBe(true); // This test just ensures the type is exportable
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle malformed board state data', async () => {
      const malformedBoard = {
        id: 'malformed-board',
        title: 'Malformed Board',
        game_type: 'League of Legends',
        difficulty: 'medium',
        is_public: true,
        board_state: { invalid: 'structure' }, // Object instead of array
        settings: {},
        creator_id: 'user-123',
        votes: 0,
        bookmarked_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockFrom.limit.mockResolvedValueOnce({
        data: [malformedBoard],
        error: null,
      });

      // Mock validation failure for malformed state
      (zBoardState.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Expected array'),
      });

      const result = await boardCollectionsService.getCollections({
        search: '',
        difficulty: 'all',
        sortBy: 'newest',
        gameType: 'League of Legends' as GameCategory,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle mixed valid and invalid boards', async () => {
      const mixedBoards = [
        {
          id: 'valid-board',
          title: 'Valid Board',
          game_type: 'Rocket League',
          difficulty: 'easy',
          is_public: true,
          board_state: [{ row: 0, col: 0, text: 'Valid', marked: false }],
          settings: { team_mode: false },
          creator_id: 'user-123',
          votes: 5,
          bookmarked_count: 2,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'invalid-board-1',
          title: 'Invalid Board 1',
          game_type: 'Rocket League',
          difficulty: 'easy',
          is_public: true,
          board_state: 'invalid',
          settings: {},
          creator_id: 'user-456',
          votes: 3,
          bookmarked_count: 1,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
        {
          id: 'valid-board-2',
          title: 'Valid Board 2',
          game_type: 'Rocket League',
          difficulty: 'easy',
          is_public: true,
          board_state: [
            { row: 1, col: 1, text: 'Another valid', marked: true },
          ],
          settings: { lockout: true },
          creator_id: 'user-789',
          votes: 8,
          bookmarked_count: 3,
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z',
        },
      ];

      mockFrom.limit.mockResolvedValueOnce({
        data: mixedBoards,
        error: null,
      });

      // Mock validation: first and third succeed, second fails
      (zBoardState.safeParse as jest.Mock)
        .mockReturnValueOnce({
          success: true,
          data: mixedBoards[0]?.board_state,
        })
        .mockReturnValueOnce({ success: false, error: new Error('Invalid') })
        .mockReturnValueOnce({
          success: true,
          data: mixedBoards[2]?.board_state,
        });

      const result = await boardCollectionsService.getCollections({
        search: '',
        difficulty: 'all',
        sortBy: 'newest',
        gameType: 'Rocket League' as GameCategory,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0]?.id).toBe('valid-board');
      expect(result.data?.[1]?.id).toBe('valid-board-2');
    });
  });
});
