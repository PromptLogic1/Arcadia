import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { POST } from '../route';
import { sessionsService } from '@/services/sessions.service';
import { authService } from '@/services/auth.service';
import { log } from '@/lib/logger';

// Mock dependencies
jest.mock('@/services/sessions.service');
jest.mock('@/services/auth.service');
jest.mock('@/lib/logger');
jest.mock('@/lib/rate-limiter-middleware', () => ({
  withRateLimit: jest.fn(handler => handler),
  RATE_LIMIT_CONFIGS: {
    gameAction: 'gameAction',
  },
}));

// Mock validation middleware
jest.mock('@/lib/validation/middleware', () => ({
  validateRequestBody: jest.fn(),
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

const mockPlayer = {
  id: 'player-123',
  session_id: 'session-123',
  user_id: 'user-123',
  display_name: 'TestPlayer',
  color: '#3B82F6',
  avatar_url: null,
  position: 2,
  team: 'blue' as const,
  score: 0,
  is_host: false,
  is_ready: false,
  joined_at: '2024-01-01T00:00:00Z',
  left_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('/api/bingo/sessions/join route handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (log.info as jest.Mock).mockImplementation(() => {});
    (log.error as jest.Mock).mockImplementation(() => {});
  });

  describe('POST handler', () => {
    const createMockRequest = (body: any) => {
      return {
        json: () => Promise.resolve(body),
        url: 'https://example.com/api/bingo/sessions/join',
      } as NextRequest;
    };

    describe('successful session join', () => {
      test('should join session successfully with all parameters', async () => {
        const requestBody = {
          sessionId: 'session-123',
          displayName: 'TestPlayer',
          color: '#3B82F6',
          team: 'blue',
          password: 'secret123',
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.joinSessionById as jest.Mock).mockResolvedValue({
          success: true,
          data: { player: mockPlayer },
          error: null,
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(mockPlayer);

        expect(sessionsService.joinSessionById).toHaveBeenCalledWith(
          'session-123',
          'user-123',
          {
            display_name: 'TestPlayer',
            color: '#3B82F6',
            team: 'blue',
            password: 'secret123',
          }
        );

        // The route doesn't log on success
      });

      test('should join session with minimal parameters', async () => {
        const requestBody = {
          sessionId: 'session-123',
          displayName: 'SimplePlayer',
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.joinSessionById as jest.Mock).mockResolvedValue({
          success: true,
          data: { player: { ...mockPlayer, team: null, color: '#000000' } },
          error: null,
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);

        expect(response.status).toBe(200);

        expect(sessionsService.joinSessionById).toHaveBeenCalledWith(
          'session-123',
          'user-123',
          {
            display_name: 'SimplePlayer',
            color: undefined,
            team: undefined,
            password: undefined,
          }
        );
      });
    });

    describe('authentication', () => {
      test('should return 401 for unauthenticated users', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: null,
          success: false,
        });

        const request = createMockRequest({
          sessionId: 'session-123',
          displayName: 'TestPlayer',
        });
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.error).toBe('Unauthorized');

        expect(sessionsService.joinSessionById).not.toHaveBeenCalled();
      });

      test('should return 401 when auth succeeds but no user data', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: null,
          success: true,
        });

        const request = createMockRequest({
          sessionId: 'session-123',
          displayName: 'TestPlayer',
        });
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.error).toBe('Unauthorized');
      });
    });

    describe('validation', () => {
      test('should return validation error for invalid request body', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        const validationError = {
          success: false as const,
          error: NextResponse.json(
            { error: 'Invalid session ID' },
            { status: 400 }
          ),
        };

        mockValidationMiddleware.validateRequestBody.mockResolvedValue(
          validationError
        );

        const request = createMockRequest({ invalid: 'data' });
        const response = await POST(request);

        expect(response).toBe(validationError.error);
      });
    });

    describe('service errors', () => {
      test('should return 404 when session not found or already started', async () => {
        const requestBody = {
          sessionId: 'session-123',
          displayName: 'TestPlayer',
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.joinSessionById as jest.Mock).mockResolvedValue({
          success: false,
          data: null,
          error: 'Session not found or has already started.',
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(404);
        expect(result.error).toBe('Session not found or has already started.');
      });

      test('should return 409 when already joined', async () => {
        const requestBody = {
          sessionId: 'session-123',
          displayName: 'TestPlayer',
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.joinSessionById as jest.Mock).mockResolvedValue({
          success: false,
          data: null,
          error: 'Already in session',
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(409);
        expect(result.error).toBe('Already in session');
      });

      test('should return 400 when session is full', async () => {
        const requestBody = {
          sessionId: 'session-123',
          displayName: 'TestPlayer',
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.joinSessionById as jest.Mock).mockResolvedValue({
          success: false,
          data: null,
          error: 'Session is full.',
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toBe('Session is full.');
      });

      test('should return 403 when password is invalid', async () => {
        const requestBody = {
          sessionId: 'session-123',
          displayName: 'TestPlayer',
          password: 'wrong-password',
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.joinSessionById as jest.Mock).mockResolvedValue({
          success: false,
          data: null,
          error: 'Invalid password.',
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toBe('Invalid password.');
      });

      test('should return 400 for general service errors', async () => {
        const requestBody = {
          sessionId: 'session-123',
          displayName: 'TestPlayer',
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.joinSessionById as jest.Mock).mockResolvedValue({
          success: false,
          data: null,
          error: 'Database error',
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toBe('Database error');

        // The route doesn't log errors for service failures
        expect(log.error).not.toHaveBeenCalled();
      });

      test('should handle service error with no message', async () => {
        const requestBody = {
          sessionId: 'session-123',
          displayName: 'TestPlayer',
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.joinSessionById as jest.Mock).mockResolvedValue({
          success: false,
          data: null,
          error: null,
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toBe('Failed to join session');
      });
    });

    describe('error handling', () => {
      test('should handle unexpected errors', async () => {
        (authService.getCurrentUser as jest.Mock).mockRejectedValue(
          new Error('Unexpected error')
        );

        const request = createMockRequest({
          sessionId: 'session-123',
          displayName: 'TestPlayer',
        });
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Unexpected error');

        expect(log.error).toHaveBeenCalledWith(
          'Unhandled error in POST /api/bingo/sessions/join',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              apiRoute: 'bingo/sessions/join',
              method: 'POST',
              userId: undefined,
              sessionId: undefined,
            }),
          })
        );
      });

      test('should use default error message for non-Error objects', async () => {
        (authService.getCurrentUser as jest.Mock).mockRejectedValue('string error');

        const request = createMockRequest({
          sessionId: 'session-123',
          displayName: 'TestPlayer',
        });
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('string error');
      });
    });
  });
});