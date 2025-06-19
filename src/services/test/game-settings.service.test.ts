/**
 * @jest-environment node
 */

import { gameSettingsService } from '../game-settings.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import { zBoardSettings } from '@/lib/validation/schemas/bingo';
import { transformBoardSettings } from '@/lib/validation/transforms';

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
  update: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
  abortSignal: jest.fn(),
};

const mockZBoardSettings = zBoardSettings as jest.Mocked<typeof zBoardSettings>;
const mockTransformBoardSettings =
  transformBoardSettings as jest.MockedFunction<typeof transformBoardSettings>;

describe('gameSettingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    mockSupabase.from.mockReturnValue(mockFrom);

    // Setup default chaining behavior
    mockFrom.select.mockReturnValue(mockFrom);
    mockFrom.update.mockReturnValue(mockFrom);
    mockFrom.eq.mockReturnValue(mockFrom);
    mockFrom.single.mockReturnValue(mockFrom);
    mockFrom.abortSignal.mockReturnValue(mockFrom);

    // Mock transform function
    mockTransformBoardSettings.mockImplementation(settings => settings);
  });

  describe('getSettings', () => {
    const boardId = 'board-123';
    const mockSettings = {
      team_mode: false,
      lockout: true,
      win_conditions: {
        line: true,
        majority: false,
        diagonal: true,
        corners: false,
      },
    };

    it('should return board settings when found and valid', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { settings: mockSettings },
        error: null,
      });

      mockZBoardSettings.safeParse.mockReturnValueOnce({
        success: true,
        data: mockSettings,
      });

      const result = await gameSettingsService.getSettings(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSettings);
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_boards');
      expect(mockFrom.select).toHaveBeenCalledWith('settings');
      expect(mockFrom.eq).toHaveBeenCalledWith('id', boardId);
      expect(mockZBoardSettings.safeParse).toHaveBeenCalledWith(mockSettings);
    });

    it('should return null when settings do not exist', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { settings: null },
        error: null,
      });

      const result = await gameSettingsService.getSettings(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should return null when data is null', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await gameSettingsService.getSettings(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle database error', async () => {
      const error = { message: 'Database error' };
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error,
      });

      const result = await gameSettingsService.getSettings(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to fetch game settings',
        error,
        { metadata: { boardId } }
      );
    });

    it('should handle validation error', async () => {
      const invalidSettings = { invalid: 'data' };
      mockFrom.single.mockResolvedValueOnce({
        data: { settings: invalidSettings },
        error: null,
      });

      mockZBoardSettings.safeParse.mockReturnValueOnce({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await gameSettingsService.getSettings(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid board settings format');
      expect(log.error).toHaveBeenCalledWith(
        'Invalid board settings format',
        expect.any(Error),
        { metadata: { boardId, service: 'gameSettingsService' } }
      );
    });

    it('should handle abort signal', async () => {
      const abortController = new AbortController();
      const signal = abortController.signal;

      mockFrom.single.mockResolvedValueOnce({
        data: { settings: mockSettings },
        error: null,
      });

      mockZBoardSettings.safeParse.mockReturnValueOnce({
        success: true,
        data: mockSettings,
      });

      await gameSettingsService.getSettings(boardId, { signal });

      expect(mockFrom.abortSignal).toHaveBeenCalledWith(signal);
    });

    it('should handle unexpected error', async () => {
      mockFrom.single.mockRejectedValueOnce(new Error('Network error'));

      const result = await gameSettingsService.getSettings(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalledWith(
        'Game settings fetch error',
        expect.any(Error),
        { metadata: { boardId } }
      );
    });
  });

  describe('updateSettings', () => {
    const boardId = 'board-123';
    const settings = {
      team_mode: true,
      lockout: true,
      win_conditions: {
        line: true,
        majority: false,
        diagonal: true,
        corners: false,
      },
    };

    it('should update settings successfully', async () => {
      const transformedSettings = { ...settings, transformed: true };
      mockTransformBoardSettings.mockReturnValueOnce(transformedSettings);

      mockFrom.single.mockResolvedValueOnce({
        data: { settings: transformedSettings },
        error: null,
      });

      mockZBoardSettings.safeParse.mockReturnValueOnce({
        success: true,
        data: transformedSettings,
      });

      const result = await gameSettingsService.updateSettings(
        boardId,
        settings
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(transformedSettings);
      expect(mockTransformBoardSettings).toHaveBeenCalledWith(settings);
      expect(mockFrom.update).toHaveBeenCalledWith({
        settings: transformedSettings,
      });
      expect(mockFrom.eq).toHaveBeenCalledWith('id', boardId);
      expect(mockFrom.select).toHaveBeenCalledWith('settings');
    });

    it('should handle update with null settings in response', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { settings: null },
        error: null,
      });

      const result = await gameSettingsService.updateSettings(
        boardId,
        settings
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(settings);
    });

    it('should handle database error during update', async () => {
      const error = { message: 'Update failed' };
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error,
      });

      const result = await gameSettingsService.updateSettings(
        boardId,
        settings
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to update game settings',
        error,
        { metadata: { boardId, settings } }
      );
    });

    it('should handle validation error after update', async () => {
      const invalidSettings = { invalid: 'data' };
      mockFrom.single.mockResolvedValueOnce({
        data: { settings: invalidSettings },
        error: null,
      });

      mockZBoardSettings.safeParse.mockReturnValueOnce({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await gameSettingsService.updateSettings(
        boardId,
        settings
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid updated board settings format');
      expect(log.error).toHaveBeenCalledWith(
        'Invalid updated board settings format',
        expect.any(Error),
        { metadata: { boardId, service: 'gameSettingsService' } }
      );
    });

    it('should handle abort signal during update', async () => {
      const abortController = new AbortController();
      const signal = abortController.signal;

      mockFrom.single.mockResolvedValueOnce({
        data: { settings },
        error: null,
      });

      mockZBoardSettings.safeParse.mockReturnValueOnce({
        success: true,
        data: settings,
      });

      await gameSettingsService.updateSettings(boardId, settings, { signal });

      expect(mockFrom.abortSignal).toHaveBeenCalledWith(signal);
    });

    it('should handle unexpected error during update', async () => {
      mockFrom.single.mockRejectedValueOnce(new Error('Network error'));

      const result = await gameSettingsService.updateSettings(
        boardId,
        settings
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalledWith(
        'Game settings update error',
        expect.any(Error),
        { metadata: { boardId, settings } }
      );
    });
  });

  describe('validateSettings', () => {
    it('should validate correct settings', () => {
      const validSettings = {
        team_mode: false,
        lockout: true,
        win_conditions: {
          line: true,
          majority: false,
          diagonal: false,
          corners: false,
        },
      };

      const result = gameSettingsService.validateSettings(validSettings);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate team mode with lockout', () => {
      const validSettings = {
        team_mode: true,
        lockout: true,
        win_conditions: {
          line: true,
          majority: false,
          diagonal: false,
          corners: false,
        },
      };

      const result = gameSettingsService.validateSettings(validSettings);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject team mode without lockout', () => {
      const invalidSettings = {
        team_mode: true,
        lockout: false,
        win_conditions: {
          line: true,
          majority: false,
          diagonal: false,
          corners: false,
        },
      };

      const result = gameSettingsService.validateSettings(invalidSettings);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Team mode requires lockout to be enabled');
    });

    it('should reject settings with no win conditions', () => {
      const invalidSettings = {
        team_mode: false,
        lockout: true,
        win_conditions: {
          line: false,
          majority: false,
          diagonal: false,
          corners: false,
        },
      };

      const result = gameSettingsService.validateSettings(invalidSettings);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('At least one win condition must be active');
    });

    it('should validate settings with multiple win conditions', () => {
      const validSettings = {
        team_mode: false,
        lockout: true,
        win_conditions: {
          line: true,
          majority: true,
          diagonal: true,
          corners: true,
        },
      };

      const result = gameSettingsService.validateSettings(validSettings);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle validation errors', () => {
      const invalidSettings = null as any;

      const result = gameSettingsService.validateSettings(invalidSettings);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid settings format');
      expect(log.error).toHaveBeenCalledWith(
        'Settings validation error',
        expect.any(Error),
        { metadata: { settings: invalidSettings } }
      );
    });

    it('should validate each win condition independently', () => {
      // Test line condition only
      const lineOnly = {
        team_mode: false,
        lockout: true,
        win_conditions: {
          line: true,
          majority: false,
          diagonal: false,
          corners: false,
        },
      };
      expect(gameSettingsService.validateSettings(lineOnly).valid).toBe(true);

      // Test majority condition only
      const majorityOnly = {
        team_mode: false,
        lockout: true,
        win_conditions: {
          line: false,
          majority: true,
          diagonal: false,
          corners: false,
        },
      };
      expect(gameSettingsService.validateSettings(majorityOnly).valid).toBe(
        true
      );

      // Test diagonal condition only
      const diagonalOnly = {
        team_mode: false,
        lockout: true,
        win_conditions: {
          line: false,
          majority: false,
          diagonal: true,
          corners: false,
        },
      };
      expect(gameSettingsService.validateSettings(diagonalOnly).valid).toBe(
        true
      );

      // Test corners condition only
      const cornersOnly = {
        team_mode: false,
        lockout: true,
        win_conditions: {
          line: false,
          majority: false,
          diagonal: false,
          corners: true,
        },
      };
      expect(gameSettingsService.validateSettings(cornersOnly).valid).toBe(
        true
      );
    });
  });

  describe('getBoardSettings', () => {
    const boardId = 'board-123';
    const mockSettings = {
      team_mode: false,
      lockout: true,
      win_conditions: {
        line: true,
        majority: false,
        diagonal: true,
        corners: false,
      },
    };

    it('should return board settings successfully', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { settings: mockSettings },
        error: null,
      });

      mockZBoardSettings.safeParse.mockReturnValueOnce({
        success: true,
        data: mockSettings,
      });

      const result = await gameSettingsService.getBoardSettings(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSettings);
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_boards');
      expect(mockFrom.select).toHaveBeenCalledWith('settings');
      expect(mockFrom.eq).toHaveBeenCalledWith('id', boardId);
    });

    it('should return null when settings are null', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { settings: null },
        error: null,
      });

      const result = await gameSettingsService.getBoardSettings(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle database error', async () => {
      const error = new Error('Database error');
      mockFrom.single.mockRejectedValueOnce(error);

      const result = await gameSettingsService.getBoardSettings(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalledWith(
        'Error getting board settings',
        error,
        { metadata: { boardId, service: 'gameSettingsService' } }
      );
    });

    it('should handle validation error', async () => {
      const invalidSettings = { invalid: 'data' };
      mockFrom.single.mockResolvedValueOnce({
        data: { settings: invalidSettings },
        error: null,
      });

      mockZBoardSettings.safeParse.mockReturnValueOnce({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await gameSettingsService.getBoardSettings(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid board settings format');
      expect(log.error).toHaveBeenCalledWith(
        'Invalid board settings format',
        expect.any(Error),
        { metadata: { boardId, service: 'gameSettingsService' } }
      );
    });

    it('should handle Supabase error thrown directly', async () => {
      const error = { message: 'Supabase error', code: 'PGRST116' };
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error,
      });

      const result = await gameSettingsService.getBoardSettings(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Supabase error');
    });

    it('should handle non-Error objects', async () => {
      const errorString = 'String error';
      mockFrom.single.mockRejectedValueOnce(errorString);

      const result = await gameSettingsService.getBoardSettings(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
      expect(log.error).toHaveBeenCalledWith(
        'Error getting board settings',
        expect.any(Error),
        { metadata: { boardId, service: 'gameSettingsService' } }
      );
    });
  });

  describe('updateBoardSettings', () => {
    const boardId = 'board-123';
    const settings = {
      team_mode: true,
      lockout: true,
      win_conditions: {
        line: true,
        majority: false,
        diagonal: true,
        corners: false,
      },
    };

    it('should update board settings successfully', async () => {
      const transformedSettings = { ...settings, transformed: true };
      mockTransformBoardSettings.mockReturnValueOnce(transformedSettings);

      mockFrom.single.mockResolvedValueOnce({
        data: { settings: transformedSettings },
        error: null,
      });

      mockZBoardSettings.safeParse.mockReturnValueOnce({
        success: true,
        data: transformedSettings,
      });

      const result = await gameSettingsService.updateBoardSettings(
        boardId,
        settings
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(transformedSettings);
      expect(mockTransformBoardSettings).toHaveBeenCalledWith(settings);
      expect(mockFrom.update).toHaveBeenCalledWith({
        settings: transformedSettings,
      });
      expect(mockFrom.eq).toHaveBeenCalledWith('id', boardId);
      expect(mockFrom.select).toHaveBeenCalledWith('settings');
    });

    it('should handle database error during update', async () => {
      const error = new Error('Update failed');
      mockFrom.single.mockRejectedValueOnce(error);

      const result = await gameSettingsService.updateBoardSettings(
        boardId,
        settings
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(log.error).toHaveBeenCalledWith(
        'Error updating board settings',
        error,
        { metadata: { boardId, service: 'gameSettingsService' } }
      );
    });

    it('should handle validation error after update', async () => {
      const invalidSettings = { invalid: 'data' };
      mockFrom.single.mockResolvedValueOnce({
        data: { settings: invalidSettings },
        error: null,
      });

      mockZBoardSettings.safeParse.mockReturnValueOnce({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await gameSettingsService.updateBoardSettings(
        boardId,
        settings
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to parse updated board settings');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to parse updated board settings',
        expect.any(Error),
        { metadata: { boardId, service: 'gameSettingsService' } }
      );
    });

    it('should handle Supabase error thrown directly', async () => {
      const error = { message: 'Supabase error', code: 'PGRST302' };
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error,
      });

      const result = await gameSettingsService.updateBoardSettings(
        boardId,
        settings
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Supabase error');
    });

    it('should handle non-Error objects', async () => {
      const errorString = 'String error';
      mockFrom.single.mockRejectedValueOnce(errorString);

      const result = await gameSettingsService.updateBoardSettings(
        boardId,
        settings
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
      expect(log.error).toHaveBeenCalledWith(
        'Error updating board settings',
        expect.any(Error),
        { metadata: { boardId, service: 'gameSettingsService' } }
      );
    });

    it('should handle null data response', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      mockZBoardSettings.safeParse.mockReturnValueOnce({
        success: false,
        error: new Error('Cannot parse null'),
      });

      const result = await gameSettingsService.updateBoardSettings(
        boardId,
        settings
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to parse updated board settings');
    });
  });
});
