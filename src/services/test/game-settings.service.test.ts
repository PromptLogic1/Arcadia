/**
 * @jest-environment node
 */

import { gameSettingsService } from '../game-settings.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import { zBoardSettings } from '@/lib/validation/schemas/bingo';
import { transformBoardSettings } from '@/lib/validation/transforms';
import {
  createMockSupabaseClient,
  setupSupabaseMock,
  createSupabaseSuccessResponse,
  createSupabaseErrorResponse,
} from '@/lib/test/mocks/supabase.mock';
import type { BoardSettings } from '@/types';
import { ZodError } from 'zod';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');
jest.mock('@/lib/validation/schemas/bingo');
jest.mock('@/lib/validation/transforms');

const mockZBoardSettings = zBoardSettings as jest.Mocked<typeof zBoardSettings>;
const mockTransformBoardSettings =
  transformBoardSettings as jest.MockedFunction<typeof transformBoardSettings>;

describe('gameSettingsService', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  // Helper to create a mock query builder
  const createMockQueryBuilder = (response: ReturnType<typeof createSupabaseSuccessResponse> | ReturnType<typeof createSupabaseErrorResponse>) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(response),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    setupSupabaseMock(mockSupabase);

    // Mock transform function - properly transform to database format
    mockTransformBoardSettings.mockImplementation((settings) => {
      if (!settings) return null;
      const transformed: BoardSettings = {
        team_mode: settings.team_mode ?? false,
        lockout: settings.lockout ?? false,
        sound_enabled: settings.sound_enabled ?? true,
        win_conditions: settings.win_conditions ? {
          line: settings.win_conditions.line ?? false,
          majority: settings.win_conditions.majority ?? false,
          diagonal: settings.win_conditions.diagonal ?? false,
          corners: settings.win_conditions.corners ?? false,
        } : null,
      };
      return transformed;
    });
  });

  describe('getSettings', () => {
    const boardId = 'board-123';
    const mockSettings = {
      team_mode: false,
      lockout: true,
      sound_enabled: true,
      win_conditions: {
        line: true,
        majority: false,
        diagonal: true,
        corners: false,
      },
    };

    it('should return board settings when found and valid', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        abortSignal: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(
          createSupabaseSuccessResponse({ settings: mockSettings })
        ),
      };
      
      mockFrom.mockReturnValue(mockQueryBuilder);

      mockZBoardSettings.safeParse.mockReturnValueOnce({
        success: true,
        data: mockSettings,
      });

      const result = await gameSettingsService.getSettings(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSettings);
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_boards');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('settings');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', boardId);
      expect(mockZBoardSettings.safeParse).toHaveBeenCalledWith(mockSettings);
    });

    it('should return null when settings do not exist', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseSuccessResponse({ settings: null })
      );
      
      mockFrom.mockReturnValue(mockQueryBuilder);

      const result = await gameSettingsService.getSettings(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should return null when data is null', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseSuccessResponse(null)
      );
      mockFrom.mockReturnValue(mockQueryBuilder);

      const result = await gameSettingsService.getSettings(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle database error', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseErrorResponse('Database error')
      );
      mockFrom.mockReturnValue(mockQueryBuilder);

      const result = await gameSettingsService.getSettings(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to fetch game settings',
        {
          message: 'Database error',
          details: null,
          hint: null,
          code: 'UNKNOWN'
        },
        { metadata: { boardId } }
      );
    });

    it('should handle validation error', async () => {
      const invalidSettings = { invalid: 'data' };
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseSuccessResponse({ settings: invalidSettings })
      );
      mockFrom.mockReturnValue(mockQueryBuilder);

      const zodError = new Error('Validation failed') as any;
      zodError.issues = [{ code: 'invalid_type', path: [], message: 'Validation failed', expected: 'object', received: 'undefined' }];
      zodError.errors = zodError.issues;
      zodError.format = () => ({ _errors: ['Validation failed'] });
      zodError.message = 'Validation failed';
      zodError.isEmpty = false;
      zodError.addIssue = () => {};
      zodError.addIssues = () => {};

      mockZBoardSettings.safeParse.mockReturnValueOnce({
        success: false,
        error: zodError,
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

      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseSuccessResponse({ settings: mockSettings })
      );
      mockFrom.mockReturnValue(mockQueryBuilder);

      mockZBoardSettings.safeParse.mockReturnValueOnce({
        success: true,
        data: mockSettings,
      });

      await gameSettingsService.getSettings(boardId, { signal });

      expect(mockQueryBuilder.abortSignal).toHaveBeenCalledWith(signal);
    });

    it('should handle unexpected error', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseSuccessResponse({})
      );
      mockQueryBuilder.single.mockRejectedValueOnce(new Error('Network error'));
      mockFrom.mockReturnValue(mockQueryBuilder);

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
      sound_enabled: true,
      win_conditions: {
        line: true,
        majority: false,
        diagonal: true,
        corners: false,
      },
    };

    it('should update settings successfully', async () => {
      const transformedSettings = {
        team_mode: true,
        lockout: true,
        sound_enabled: true,
        win_conditions: {
          line: true,
          majority: false,
          diagonal: true,
          corners: false,
        },
      };
      mockTransformBoardSettings.mockReturnValueOnce(transformedSettings);

      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseSuccessResponse({ settings: transformedSettings })
      );
      mockFrom.mockReturnValue(mockQueryBuilder);

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
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        settings: transformedSettings,
      });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', boardId);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('settings');
    });

    it('should handle update with null settings in response', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseSuccessResponse({ settings: null })
      );
      mockFrom.mockReturnValue(mockQueryBuilder);

      const result = await gameSettingsService.updateSettings(
        boardId,
        settings
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(settings);
    });

    it('should handle database error during update', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseErrorResponse('Update failed')
      );
      mockFrom.mockReturnValue(mockQueryBuilder);

      const result = await gameSettingsService.updateSettings(
        boardId,
        settings
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to update game settings',
        {
          message: 'Update failed',
          details: null,
          hint: null,
          code: 'UNKNOWN'
        },
        { metadata: { boardId, settings } }
      );
    });

    it('should handle validation error after update', async () => {
      const invalidSettings = { invalid: 'data' };
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseSuccessResponse({ settings: invalidSettings })
      );
      mockFrom.mockReturnValue(mockQueryBuilder);

      const zodError = new Error('Validation failed') as any;
      zodError.issues = [{ code: 'invalid_type', path: [], message: 'Validation failed', expected: 'object', received: 'undefined' }];
      zodError.errors = zodError.issues;
      zodError.format = () => ({ _errors: ['Validation failed'] });
      zodError.message = 'Validation failed';
      zodError.isEmpty = false;
      zodError.addIssue = () => {};
      zodError.addIssues = () => {};

      mockZBoardSettings.safeParse.mockReturnValueOnce({
        success: false,
        error: zodError,
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

      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseSuccessResponse({ settings })
      );
      mockFrom.mockReturnValue(mockQueryBuilder);

      mockZBoardSettings.safeParse.mockReturnValueOnce({
        success: true,
        data: settings,
      });

      await gameSettingsService.updateSettings(boardId, settings, { signal });

      expect(mockQueryBuilder.abortSignal).toHaveBeenCalledWith(signal);
    });

    it('should handle unexpected error during update', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseSuccessResponse({})
      );
      mockQueryBuilder.single.mockRejectedValueOnce(new Error('Network error'));
      mockFrom.mockReturnValue(mockQueryBuilder);

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
      sound_enabled: true,
      win_conditions: {
        line: true,
        majority: false,
        diagonal: true,
        corners: false,
      },
    };

    it('should return board settings successfully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseSuccessResponse({ settings: mockSettings })
      );
      mockFrom.mockReturnValue(mockQueryBuilder);

      mockZBoardSettings.safeParse.mockReturnValueOnce({
        success: true,
        data: mockSettings,
      });

      const result = await gameSettingsService.getBoardSettings(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSettings);
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_boards');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('settings');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', boardId);
    });

    it('should return null when settings are null', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseSuccessResponse({ settings: null })
      );
      mockFrom.mockReturnValue(mockQueryBuilder);

      const result = await gameSettingsService.getBoardSettings(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle database error', async () => {
      const error = new Error('Database error');
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseSuccessResponse({})
      );
      mockQueryBuilder.single.mockRejectedValueOnce(error);
      mockFrom.mockReturnValue(mockQueryBuilder);

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
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseSuccessResponse({ settings: invalidSettings })
      );
      mockFrom.mockReturnValue(mockQueryBuilder);

      const zodError = new Error('Validation failed') as any;
      zodError.issues = [{ code: 'invalid_type', path: [], message: 'Validation failed', expected: 'object', received: 'undefined' }];
      zodError.errors = zodError.issues;
      zodError.format = () => ({ _errors: ['Validation failed'] });
      zodError.message = 'Validation failed';
      zodError.isEmpty = false;
      zodError.addIssue = () => {};
      zodError.addIssues = () => {};

      mockZBoardSettings.safeParse.mockReturnValueOnce({
        success: false,
        error: zodError,
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
      const _error = { message: 'Supabase error', code: 'PGRST116' };
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseErrorResponse('Supabase error', 'PGRST116')
      );
      mockFrom.mockReturnValue(mockQueryBuilder);

      const result = await gameSettingsService.getBoardSettings(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Supabase error');
    });

    it('should handle non-Error objects', async () => {
      const errorString = 'String error';
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseSuccessResponse({})
      );
      mockQueryBuilder.single.mockRejectedValueOnce(errorString);
      mockFrom.mockReturnValue(mockQueryBuilder);

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
      sound_enabled: true,
      win_conditions: {
        line: true,
        majority: false,
        diagonal: true,
        corners: false,
      },
    };

    it('should update board settings successfully', async () => {
      const transformedSettings = {
        team_mode: true,
        lockout: true,
        sound_enabled: true,
        win_conditions: {
          line: true,
          majority: false,
          diagonal: true,
          corners: false,
        },
      };
      mockTransformBoardSettings.mockReturnValueOnce(transformedSettings);

      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseSuccessResponse({ settings: transformedSettings })
      );
      mockFrom.mockReturnValue(mockQueryBuilder);

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
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        settings: transformedSettings,
      });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', boardId);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('settings');
    });

    it('should handle database error during update', async () => {
      const error = new Error('Update failed');
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseSuccessResponse({})
      );
      mockQueryBuilder.single.mockRejectedValueOnce(error);
      mockFrom.mockReturnValue(mockQueryBuilder);

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
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseSuccessResponse({ settings: invalidSettings })
      );
      mockFrom.mockReturnValue(mockQueryBuilder);

      const zodError = new Error('Validation failed') as any;
      zodError.issues = [{ code: 'invalid_type', path: [], message: 'Validation failed', expected: 'object', received: 'undefined' }];
      zodError.errors = zodError.issues;
      zodError.format = () => ({ _errors: ['Validation failed'] });
      zodError.message = 'Validation failed';
      zodError.isEmpty = false;
      zodError.addIssue = () => {};
      zodError.addIssues = () => {};

      mockZBoardSettings.safeParse.mockReturnValueOnce({
        success: false,
        error: zodError,
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
      const _error = { message: 'Supabase error', code: 'PGRST302' };
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseErrorResponse('Supabase error', 'PGRST302')
      );
      mockFrom.mockReturnValue(mockQueryBuilder);

      const result = await gameSettingsService.updateBoardSettings(
        boardId,
        settings
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Supabase error');
    });

    it('should handle non-Error objects', async () => {
      const errorString = 'String error';
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseSuccessResponse({})
      );
      mockQueryBuilder.single.mockRejectedValueOnce(errorString);
      mockFrom.mockReturnValue(mockQueryBuilder);

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
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = createMockQueryBuilder(
        createSupabaseSuccessResponse(null)
      );
      mockFrom.mockReturnValue(mockQueryBuilder);

      mockZBoardSettings.safeParse.mockReturnValueOnce({
        success: false,
        error: new ZodError([
          {
            code: 'custom',
            message: 'Cannot parse null',
            path: [],
          },
        ]),
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
