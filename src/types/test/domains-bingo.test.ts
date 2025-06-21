/**
 * @jest-environment node
 */

import type { BingoBoardDomain } from '@/types/domains/bingo';
import type { BoardCell, BoardSettings } from '@/types';

describe('Bingo Domain Types', () => {
  describe('BingoBoardDomain', () => {
    it('should have correct structure extending BingoBoard', () => {
      // Create a mock BingoBoardDomain object to test the type structure
      const mockBoardState: BoardCell[] = [
        {
          cell_id: 'cell-1',
          text: 'Test cell 1',
          colors: null,
          completed_by: null,
          blocked: false,
          is_marked: false,
          version: 1,
          last_updated: Date.now(),
          last_modified_by: null,
        },
        {
          cell_id: 'cell-2',
          text: 'Test cell 2',
          colors: ['red'],
          completed_by: ['user-123'],
          blocked: false,
          is_marked: true,
          version: 1,
          last_updated: Date.now(),
          last_modified_by: 'user-123',
        },
      ];

      const mockBoardSettings: BoardSettings = {
        team_mode: false,
        lockout: false,
        sound_enabled: true,
        win_conditions: {
          line: true,
          majority: false,
          diagonal: true,
          corners: false,
        },
      };

      const bingoBoardDomain: BingoBoardDomain = {
        // Fields from BingoBoard (except board_state and settings)
        id: 'board-123',
        title: 'Test Board',
        description: 'A test bingo board',
        difficulty: 'medium',
        game_type: 'Minecraft',
        is_public: true,
        votes: 10,
        creator_id: 'user-456',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        status: 'active',
        bookmarked_count: 0,
        cloned_from: null,
        size: 5,
        version: 1,
        
        // Transformed fields
        board_state: mockBoardState,
        settings: mockBoardSettings,
      };

      // Test that it has all expected properties
      expect(bingoBoardDomain.id).toBe('board-123');
      expect(bingoBoardDomain.title).toBe('Test Board');
      expect(bingoBoardDomain.description).toBe('A test bingo board');
      expect(bingoBoardDomain.difficulty).toBe('medium');
      expect(bingoBoardDomain.game_type).toBe('Minecraft');
      expect(bingoBoardDomain.is_public).toBe(true);
      expect(bingoBoardDomain.votes).toBe(10);
      expect(bingoBoardDomain.creator_id).toBe('user-456');
      expect(bingoBoardDomain.created_at).toBe('2023-01-01T00:00:00.000Z');
      expect(bingoBoardDomain.updated_at).toBe('2023-01-01T00:00:00.000Z');

      // Test transformed fields
      expect(Array.isArray(bingoBoardDomain.board_state)).toBe(true);
      expect(bingoBoardDomain.board_state).toHaveLength(2);
      expect(typeof bingoBoardDomain.settings).toBe('object');
      expect(bingoBoardDomain.settings?.team_mode).toBe(false);
    });

    it('should validate BoardCell structure in board_state', () => {
      const boardCell: BoardCell = {
        cell_id: 'cell-test',
        text: 'Test content',
        colors: null,
        completed_by: null,
        blocked: null,
        is_marked: false,
        version: null,
        last_updated: null,
        last_modified_by: null,
      };

      const bingoBoardDomain: BingoBoardDomain = {
        id: 'board-test',
        title: 'Test',
        description: null,
        difficulty: 'easy',
        game_type: 'All Games',
        is_public: false,
        votes: 0,
        creator_id: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        status: 'active',
        bookmarked_count: 0,
        cloned_from: null,
        size: 3,
        version: 1,
        board_state: [boardCell],
        settings: {
          team_mode: false,
          lockout: true,
          sound_enabled: false,
          win_conditions: {
            line: true,
            majority: false,
            diagonal: false,
            corners: false,
          },
        },
      };

      // Test BoardCell properties
      expect(bingoBoardDomain.board_state?.[0]?.cell_id).toBe('cell-test');
      expect(bingoBoardDomain.board_state?.[0]?.text).toBe('Test content');
      expect(bingoBoardDomain.board_state?.[0]?.is_marked).toBe(false);
      expect(bingoBoardDomain.board_state?.[0]?.blocked).toBe(null);
      expect(bingoBoardDomain.board_state?.[0]?.colors).toBe(null);
      expect(bingoBoardDomain.board_state?.[0]?.completed_by).toBe(null);
    });

    it('should validate BoardSettings structure', () => {
      const boardSettings: BoardSettings = {
        team_mode: true,
        lockout: true,
        sound_enabled: false,
        win_conditions: {
          line: false,
          majority: false,
          diagonal: true,
          corners: true,
        },
      };

      const bingoBoardDomain: BingoBoardDomain = {
        id: 'board-settings-test',
        title: 'Settings Test',
        description: 'Testing board settings',
        difficulty: 'expert',
        game_type: 'Valorant',
        is_public: true,
        votes: 25,
        creator_id: 'user-settings',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        status: 'active',
        bookmarked_count: 0,
        cloned_from: null,
        size: 7,
        version: 1,
        board_state: [],
        settings: boardSettings,
      };

      // Test BoardSettings properties
      expect(bingoBoardDomain.settings?.team_mode).toBe(true);
      expect(bingoBoardDomain.settings?.lockout).toBe(true);
      expect(bingoBoardDomain.settings?.sound_enabled).toBe(false);
      expect(bingoBoardDomain.settings?.win_conditions?.line).toBe(false);
      expect(bingoBoardDomain.settings?.win_conditions?.majority).toBe(false);
      expect(bingoBoardDomain.settings?.win_conditions?.diagonal).toBe(true);
      expect(bingoBoardDomain.settings?.win_conditions?.corners).toBe(true);
    });

    it('should handle empty board_state array', () => {
      const bingoBoardDomain: BingoBoardDomain = {
        id: 'empty-board',
        title: 'Empty Board',
        description: null,
        difficulty: 'beginner',
        game_type: 'Fortnite',
        is_public: false,
        votes: 0,
        creator_id: 'user-empty',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        status: 'active',
        bookmarked_count: 0,
        cloned_from: null,
        size: 5,
        version: 1,
        board_state: [],
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
      };

      expect(bingoBoardDomain.board_state).toEqual([]);
      expect(Array.isArray(bingoBoardDomain.board_state)).toBe(true);
      expect(bingoBoardDomain.board_state).toHaveLength(0);
    });

    it('should handle minimal BoardSettings configuration', () => {
      const minimalSettings: BoardSettings = {
        team_mode: null,
        lockout: null,
        sound_enabled: null,
        win_conditions: {
          line: true,
          majority: false,
          diagonal: false,
          corners: false,
        },
      };

      const bingoBoardDomain: BingoBoardDomain = {
        id: 'minimal-settings',
        title: 'Minimal Settings',
        description: null,
        difficulty: 'medium',
        game_type: 'All Games',
        is_public: false,
        votes: 0,
        creator_id: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        status: 'active',
        bookmarked_count: 0,
        cloned_from: null,
        size: 3,
        version: 1,
        board_state: [],
        settings: minimalSettings,
      };

      expect(bingoBoardDomain.settings?.team_mode).toBe(null);
      expect(bingoBoardDomain.settings?.lockout).toBe(null);
      expect(bingoBoardDomain.settings?.sound_enabled).toBe(null);
      expect(bingoBoardDomain.settings?.win_conditions?.line).toBe(true);
      expect(bingoBoardDomain.settings?.win_conditions?.diagonal).toBe(false);
      expect(bingoBoardDomain.settings?.win_conditions?.corners).toBe(false);
    });

    it('should handle complex board_state with multiple cells', () => {
      const complexBoardState = Array.from({ length: 25 }, (_, index) => ({
        cell_id: `cell-${index}`,
        text: `Content ${index}`,
        is_marked: index % 3 === 0, // Every third cell is marked
        blocked: false,
        colors: ['blue'],
        completed_by: [],
        version: 1,
        last_updated: Date.now(),
        last_modified_by: 'user-1',
      }));

      const bingoBoardDomain: BingoBoardDomain = {
        id: 'complex-board',
        title: 'Complex Board',
        description: 'A 5x5 board with complex state',
        difficulty: 'hard',
        game_type: 'Minecraft',
        is_public: true,
        votes: 50,
        creator_id: 'user-complex',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        version: 1,
        status: 'active',
        bookmarked_count: 0,
        cloned_from: null,
        size: 5,
        board_state: complexBoardState,
        settings: {
          team_mode: false,
          lockout: true,
          sound_enabled: true,
          win_conditions: {
            line: true,
            majority: false,
            diagonal: true,
            corners: true,
          },
        },
      };

      expect(bingoBoardDomain.board_state).toHaveLength(25);
      expect(bingoBoardDomain.board_state?.[0]?.cell_id).toBe('cell-0');
      expect(bingoBoardDomain.board_state?.[0]?.is_marked).toBe(true); // 0 % 3 === 0
      
      // Count marked cells
      const markedCells = bingoBoardDomain.board_state?.filter(cell => cell?.is_marked) || [];
      expect(markedCells).toHaveLength(9); // Cells 0, 3, 6, 9, 12, 15, 18, 21, 24
    });

    it('should maintain type safety for all inherited BingoBoard fields', () => {
      const bingoBoardDomain: BingoBoardDomain = {
        id: 'type-safety-test',
        title: 'Type Safety Test',
        description: 'Testing type safety',
        difficulty: 'expert',
        game_type: 'League of Legends',
        is_public: true,
        votes: 100,
        creator_id: 'type-user',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-02T00:00:00.000Z',
        version: 1,
        status: 'active',
        bookmarked_count: 0,
        cloned_from: null,
        size: 1,
        board_state: [
          {
            cell_id: 'type-cell',
            text: 'Type test cell',
            is_marked: false,
            blocked: false,
            colors: ['blue'],
            completed_by: [],
            version: 1,
            last_updated: Date.now(),
            last_modified_by: 'user-1',
          }
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
      };

      // Test all field types are correctly maintained
      expect(typeof bingoBoardDomain.id).toBe('string');
      expect(typeof bingoBoardDomain.title).toBe('string');
      expect(typeof bingoBoardDomain.description).toBe('string');
      expect(typeof bingoBoardDomain.difficulty).toBe('string');
      expect(typeof bingoBoardDomain.game_type).toBe('string');
      expect(typeof bingoBoardDomain.is_public).toBe('boolean');
      expect(typeof bingoBoardDomain.votes).toBe('number');
      expect(typeof bingoBoardDomain.creator_id).toBe('string');
      expect(typeof bingoBoardDomain.created_at).toBe('string');
      expect(typeof bingoBoardDomain.updated_at).toBe('string');
      expect(Array.isArray(bingoBoardDomain.board_state)).toBe(true);
      expect(typeof bingoBoardDomain.settings).toBe('object');
    });

    it('should handle null values for optional fields', () => {
      const bingoBoardDomain: BingoBoardDomain = {
        id: 'null-test',
        title: 'Null Test',
        description: null, // Nullable field
        difficulty: 'medium',
        game_type: 'All Games',
        is_public: false,
        votes: 0,
        creator_id: null, // Nullable field
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        version: 1,
        status: 'active',
        bookmarked_count: 0,
        cloned_from: null,
        size: 0,
        board_state: [],
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
      };

      expect(bingoBoardDomain.description).toBeNull();
      expect(bingoBoardDomain.creator_id).toBeNull();
    });
  });

  describe('Type Compatibility', () => {
    it('should be compatible with BingoBoard structure', () => {
      // This test ensures that BingoBoardDomain correctly extends BingoBoard
      // by creating a mock that could be assigned to either type
      
      const mockBoard = {
        id: 'compatibility-test',
        title: 'Compatibility Test',
        description: 'Testing compatibility',
        difficulty: 'hard' as const,
        game_type: 'CS:GO' as const,
        is_public: true,
        votes: 15,
        creator_id: 'compat-user',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        version: 1,
        status: 'active' as const,
        bookmarked_count: 0,
        cloned_from: null,
        size: 0,
      };

      // This should work with both types
      const domainBoard: BingoBoardDomain = {
        ...mockBoard,
        board_state: [],
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
      };

      expect(domainBoard.id).toBe('compatibility-test');
      expect(domainBoard.board_state).toEqual([]);
      expect(domainBoard.settings?.team_mode).toBe(false);
    });
  });
});