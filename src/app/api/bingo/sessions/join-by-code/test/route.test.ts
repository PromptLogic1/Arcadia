import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { POST } from '../route';
import { createServerComponentClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import { sessionsService } from '@/services/sessions.service';
import { userService } from '@/services/user.service';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');
jest.mock('@/services/sessions.service');
jest.mock('@/services/user.service');
jest.mock('@/lib/rate-limiter-middleware', () => ({
  withRateLimit: jest.fn(handler => handler),
  RATE_LIMIT_CONFIGS: {
    gameAction: 'gameAction',
  },
}));

// Mock validation middleware
jest.mock('@/lib/validation/middleware', () => ({
  validateRequestBody: jest.fn(),
  isValidationError: jest.fn(),
}));

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
      headers: init?.headers,
    })),
  },
}));

import * as validationMiddleware from '@/lib/validation/middleware';
const mockValidationMiddleware = validationMiddleware as jest.Mocked<
  typeof validationMiddleware
>;

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockUserProfile = {
  id: 'user-123',
  username: 'TestUser',
  display_name: 'Test User',
  email: 'test@example.com',
  avatar_url: null,
  bio: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockSession = {
  id: 'session-123',
  board_id: 'board-123',
  host_id: 'host-456',
  session_code: 'ABCD12',
  status: 'waiting' as const,
  settings: null,
  current_state: null,
  started_at: null,
  ended_at: null,
  winner_id: null,
  version: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockPlayer = {
  id: 'player-123',
  session_id: 'session-123',
  user_id: 'user-123',
  display_name: 'Test User',
  color: '#3B82F6',
  avatar_url: null,
  position: 2,
  team: null,
  score: 0,
  is_host: false,
  is_ready: false,
  joined_at: '2024-01-01T00:00:00Z',
  left_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
};

describe('/api/bingo/sessions/join-by-code route handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (log.error as jest.Mock).mockImplementation(() => {});
    (createServerComponentClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  const createMockRequest = (body: any) => {
    return {
      json: () => Promise.resolve(body),
      url: 'https://example.com/api/bingo/sessions/join-by-code',
    } as NextRequest;
  };

  describe('POST handler', () => {
    describe('successful session join', () => {
      test('should join session successfully with all player details', async () => {
        const requestBody = {
          sessionCode: 'ABCD12',
          password: 'test-password',
          displayName: 'Custom Name',
          color: '#FF0000',
          team: 'Team A',
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (userService.getUserProfile as jest.Mock).mockResolvedValue({
          success: true,
          data: mockUserProfile,
          error: null,
        });

        (sessionsService.joinSessionByCode as jest.Mock).mockResolvedValue({
          success: true,
          session: mockSession,
          player: mockPlayer,
          error: null,
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({
          sessionId: 'session-123',
          session: mockSession,
          player: mockPlayer,
        });

        expect(sessionsService.joinSessionByCode).toHaveBeenCalledWith(
          'ABCD12',
          'user-123',
          {
            display_name: 'Custom Name',
            color: '#FF0000',
            team: 'Team A',
            password: 'test-password',
          }
        );
      });

      test('should use profile username as fallback for display name', async () => {
        const requestBody = {
          sessionCode: 'ABCD12',
          password: null,
          displayName: null,
          color: null,
          team: null,
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (userService.getUserProfile as jest.Mock).mockResolvedValue({
          success: true,
          data: mockUserProfile,
          error: null,
        });

        (sessionsService.joinSessionByCode as jest.Mock).mockResolvedValue({
          success: true,
          session: mockSession,
          player: mockPlayer,
          error: null,
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({
          sessionId: mockSession.id,
          session: mockSession,
          player: mockPlayer,
        });

        expect(sessionsService.joinSessionByCode).toHaveBeenCalledWith(
          'ABCD12',
          'user-123',
          {
            display_name: 'TestUser',
            color: '#3B82F6',
            team: null,
            password: null,
          }
        );
      });

      test('should use "Anonymous" as final fallback for display name', async () => {
        const requestBody = {
          sessionCode: 'ABCD12',
          password: null,
          displayName: null,
          color: '#00FF00',
          team: null,
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (userService.getUserProfile as jest.Mock).mockResolvedValue({
          success: true,
          data: null, // No profile found
          error: null,
        });

        (sessionsService.joinSessionByCode as jest.Mock).mockResolvedValue({
          success: true,
          session: mockSession,
          player: mockPlayer,
          error: null,
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({
          sessionId: mockSession.id,
          session: mockSession,
          player: mockPlayer,
        });

        expect(sessionsService.joinSessionByCode).toHaveBeenCalledWith(
          'ABCD12',
          'user-123',
          {
            display_name: 'Anonymous',
            color: '#00FF00',
            team: null,
            password: null,
          }
        );
      });
    });

    describe('authentication', () => {
      test('should return 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        });

        const request = createMockRequest({
          sessionCode: 'ABCD12',
        });
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.error).toBe('Unauthorized');

        expect(sessionsService.joinSessionByCode).not.toHaveBeenCalled();
      });

      test('should return 401 for auth errors', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid token' },
        });

        const request = createMockRequest({
          sessionCode: 'ABCD12',
        });
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.error).toBe('Unauthorized');
      });
    });

    describe('validation', () => {
      test('should return validation error for invalid request body', async () => {
        const validationError = {
          success: false as const,
          error: NextResponse.json(
            { error: 'Invalid session code' },
            { status: 400 }
          ),
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue(
          validationError
        );

        mockValidationMiddleware.isValidationError.mockReturnValue(true);

        const request = createMockRequest({ invalid: 'data' });
        const response = await POST(request);

        expect(response).toBe(validationError.error);
        expect(sessionsService.joinSessionByCode).not.toHaveBeenCalled();
      });
    });

    describe('session join errors', () => {
      beforeEach(() => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: {
            sessionCode: 'ABCD12',
            password: null,
            displayName: 'Test User',
            color: '#3B82F6',
            team: null,
          },
        });

        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (userService.getUserProfile as jest.Mock).mockResolvedValue({
          success: true,
          data: mockUserProfile,
          error: null,
        });
      });

      test('should return 404 when session is not found', async () => {
        (sessionsService.joinSessionByCode as jest.Mock).mockResolvedValue({
          success: false,
          session: null,
          player: null,
          error: 'Session not found',
        });

        const request = createMockRequest({
          sessionCode: 'INVALID',
          displayName: 'Test User',
        });
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(404);
        expect(result.error).toBe('Session not found');
      });

      test('should return 401 for incorrect password', async () => {
        (sessionsService.joinSessionByCode as jest.Mock).mockResolvedValue({
          success: false,
          session: null,
          player: null,
          error: 'Incorrect password',
        });

        const request = createMockRequest({
          sessionCode: 'ABCD12',
          password: 'wrong-password',
          displayName: 'Test User',
        });
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.error).toBe('Incorrect password');
      });

      test('should return 400 when session is full', async () => {
        (sessionsService.joinSessionByCode as jest.Mock).mockResolvedValue({
          success: false,
          session: null,
          player: null,
          error: 'Session is full',
        });

        const request = createMockRequest({
          sessionCode: 'ABCD12',
          displayName: 'Test User',
        });
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toBe('Session is full');
      });

      test('should return 400 when session is no longer accepting players', async () => {
        (sessionsService.joinSessionByCode as jest.Mock).mockResolvedValue({
          success: false,
          session: null,
          player: null,
          error: 'Session is no longer accepting players',
        });

        const request = createMockRequest({
          sessionCode: 'ABCD12',
          displayName: 'Test User',
        });
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toBe('Session is no longer accepting players');
      });

      test('should return 500 for other service errors', async () => {
        (sessionsService.joinSessionByCode as jest.Mock).mockResolvedValue({
          success: false,
          session: null,
          player: null,
          error: 'Database connection failed',
        });

        const request = createMockRequest({
          sessionCode: 'ABCD12',
          displayName: 'Test User',
        });
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Database connection failed');
      });
    });

    describe('error handling', () => {
      test('should handle unexpected errors', async () => {
        mockSupabase.auth.getUser.mockRejectedValue(
          new Error('Unexpected error')
        );

        const request = createMockRequest({
          sessionCode: 'ABCD12',
          displayName: 'Test User',
        });
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Unexpected error');

        expect(log.error).toHaveBeenCalledWith(
          'Error joining session by code',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              apiRoute: 'bingo/sessions/join-by-code',
              method: 'POST',
            }),
          })
        );
      });

      test('should use default error message when error message is not available', async () => {
        mockSupabase.auth.getUser.mockRejectedValue({});

        const request = createMockRequest({
          sessionCode: 'ABCD12',
          displayName: 'Test User',
        });
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('An unexpected error occurred');
      });
    });

    describe('user profile handling', () => {
      test('should handle user profile service error gracefully', async () => {
        const requestBody = {
          sessionCode: 'ABCD12',
          password: null,
          displayName: null,
          color: null,
          team: null,
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (userService.getUserProfile as jest.Mock).mockResolvedValue({
          success: false,
          data: null,
          error: 'Profile service error',
        });

        (sessionsService.joinSessionByCode as jest.Mock).mockResolvedValue({
          success: true,
          session: mockSession,
          player: mockPlayer,
          error: null,
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);

        // Should still work with fallback to "Anonymous"
        expect(response.status).toBe(200);
        expect(sessionsService.joinSessionByCode).toHaveBeenCalledWith(
          'ABCD12',
          'user-123',
          {
            display_name: 'Anonymous',
            color: '#3B82F6',
            team: null,
            password: null,
          }
        );
      });
    });
  });
});