import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { POST, PATCH, DELETE } from '../route';
import { sessionsService } from '@/services/sessions.service';
import { authService } from '@/services/auth.service';

// Mock dependencies
jest.mock('@/services/sessions.service');
jest.mock('@/services/auth.service');
jest.mock('@/lib/rate-limiter-middleware', () => ({
  withRateLimit: jest.fn(handler => handler),
  RATE_LIMIT_CONFIGS: {
    gameAction: 'gameAction',
  },
}));

// Mock validation middleware
jest.mock('@/lib/validation/middleware', () => ({
  validateRequestBody: jest.fn(),
  validateQueryParams: jest.fn(),
}));

// Mock NextResponse
jest.mock('next/server', () => {
  const mockConstructor = jest.fn((body, init) => ({
    status: init?.status || 200,
    headers: init?.headers,
    body,
  })) as jest.MockedFunction<any> & {
    json: jest.MockedFunction<any>;
  };
  
  mockConstructor.json = jest.fn((data, init) => ({
    json: async () => data,
    status: init?.status || 200,
    headers: init?.headers,
  }));
  
  return {
    NextResponse: mockConstructor,
  };
});


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
  display_name: 'Test Player',
  color: '#3B82F6',
  avatar_url: null,
  position: 1,
  team: 'Team A',
  score: 0,
  is_host: false,
  is_ready: true,
  joined_at: '2024-01-01T00:00:00Z',
  left_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('/api/bingo/sessions/players route handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body?: any, url = 'https://example.com/api/bingo/sessions/players') => {
    return {
      json: () => Promise.resolve(body || {}),
      url,
    } as NextRequest;
  };

  describe('POST /api/bingo/sessions/players', () => {
    describe('successful player join', () => {
      test('should join session successfully', async () => {
        const requestBody = {
          sessionId: 'session-123',
          displayName: 'Test Player',
          color: '#3B82F6',
          team: 'Team A',
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          success: true,
          data: mockUser,
          error: null,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.joinSession as jest.Mock).mockResolvedValue({
          success: true,
          data: mockPlayer,
          error: null,
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(mockPlayer);

        expect(sessionsService.joinSession).toHaveBeenCalledWith({
          session_id: 'session-123',
          user_id: 'user-123',
          display_name: 'Test Player',
          color: '#3B82F6',
          team: 'Team A',
        });
      });
    });

    describe('authentication', () => {
      test('should return 401 for unauthenticated users', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          success: false,
          data: null,
          error: 'Unauthorized',
        });

        const request = createMockRequest({
          sessionId: 'session-123',
          displayName: 'Test Player',
        });
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.error).toBe('Unauthorized');

        expect(sessionsService.joinSession).not.toHaveBeenCalled();
      });
    });

    describe('validation errors', () => {
      test('should return validation error for invalid request body', async () => {
        const validationError = NextResponse.json(
          { error: 'Invalid session ID' },
          { status: 400 }
        );

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          success: true,
          data: mockUser,
          error: null,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: false,
          error: validationError,
        });

        const request = createMockRequest({ invalid: 'data' });
        const response = await POST(request);

        expect(response).toBe(validationError);
        expect(sessionsService.joinSession).not.toHaveBeenCalled();
      });
    });

    describe('join session errors', () => {
      beforeEach(() => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          success: true,
          data: mockUser,
          error: null,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: {
            sessionId: 'session-123',
            displayName: 'Test Player',
            color: '#3B82F6',
            team: null,
          },
        });
      });

      test('should return 404 for session not found', async () => {
        (sessionsService.joinSession as jest.Mock).mockResolvedValue({
          success: false,
          data: null,
          error: 'Session not found',
        });

        const request = createMockRequest({
          sessionId: 'nonexistent',
          displayName: 'Test Player',
        });
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(404);
        expect(result.error).toBe('Session not found');
      });

      test('should return 409 for player already in session', async () => {
        (sessionsService.joinSession as jest.Mock).mockResolvedValue({
          success: false,
          data: null,
          error: 'Player already in session',
        });

        const request = createMockRequest({
          sessionId: 'session-123',
          displayName: 'Test Player',
        });
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(409);
        expect(result.error).toBe('Player already in session');
      });

      test('should return 400 for other join errors', async () => {
        (sessionsService.joinSession as jest.Mock).mockResolvedValue({
          success: false,
          data: null,
          error: 'Session is full',
        });

        const request = createMockRequest({
          sessionId: 'session-123',
          displayName: 'Test Player',
        });
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toBe('Session is full');
      });
    });
  });

  describe('PATCH /api/bingo/sessions/players', () => {
    describe('successful player update', () => {
      test('should update player successfully', async () => {
        const requestBody = {
          sessionId: 'session-123',
          displayName: 'Updated Name',
          color: '#FF0000',
          isReady: true,
        };

        const updatedPlayer = {
          ...mockPlayer,
          display_name: 'Updated Name',
          color: '#FF0000',
          is_ready: true,
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          success: true,
          data: mockUser,
          error: null,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.updatePlayer as jest.Mock).mockResolvedValue({
          success: true,
          data: updatedPlayer,
          error: null,
        });

        const request = createMockRequest(requestBody);
        const response = await PATCH(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(updatedPlayer);

        expect(sessionsService.updatePlayer).toHaveBeenCalledWith(
          'session-123',
          'user-123',
          {
            displayName: 'Updated Name',
            color: '#FF0000',
            isReady: true,
          }
        );
      });
    });

    describe('authentication', () => {
      test('should return 401 for unauthenticated users', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          success: false,
          data: null,
          error: 'Unauthorized',
        });

        const request = createMockRequest({
          sessionId: 'session-123',
          displayName: 'Updated Name',
        });
        const response = await PATCH(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.error).toBe('Unauthorized');

        expect(sessionsService.updatePlayer).not.toHaveBeenCalled();
      });
    });

    describe('update errors', () => {
      beforeEach(() => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          success: true,
          data: mockUser,
          error: null,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: {
            sessionId: 'session-123',
            displayName: 'Updated Name',
          },
        });
      });

      test('should return 409 for display name taken', async () => {
        (sessionsService.updatePlayer as jest.Mock).mockResolvedValue({
          success: false,
          data: null,
          error: 'Display name already taken',
        });

        const request = createMockRequest({
          sessionId: 'session-123',
          displayName: 'Taken Name',
        });
        const response = await PATCH(request);
        const result = await response.json();

        expect(response.status).toBe(409);
        expect(result.error).toBe('Display name already taken');
      });

      test('should return 400 for other update errors', async () => {
        (sessionsService.updatePlayer as jest.Mock).mockResolvedValue({
          success: false,
          data: null,
          error: 'Invalid update data',
        });

        const request = createMockRequest({
          sessionId: 'session-123',
          displayName: 'Updated Name',
        });
        const response = await PATCH(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toBe('Invalid update data');
      });
    });
  });

  describe('DELETE /api/bingo/sessions/players', () => {
    describe('successful player leave', () => {
      test('should leave session successfully', async () => {
        const url = 'https://example.com/api/bingo/sessions/players?sessionId=session-123';

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          success: true,
          data: mockUser,
          error: null,
        });

        mockValidationMiddleware.validateQueryParams.mockReturnValue({
          success: true,
          data: { sessionId: 'session-123' },
        });

        (sessionsService.leaveSession as jest.Mock).mockResolvedValue({
          success: true,
          data: null,
          error: null,
        });

        const request = createMockRequest(undefined, url);
        const response = await DELETE(request);

        expect(response.status).toBe(204);

        expect(sessionsService.leaveSession).toHaveBeenCalledWith(
          'session-123',
          'user-123'
        );
      });
    });

    describe('authentication', () => {
      test('should return 401 for unauthenticated users', async () => {
        const url = 'https://example.com/api/bingo/sessions/players?sessionId=session-123';

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          success: false,
          data: null,
          error: 'Unauthorized',
        });

        const request = createMockRequest(undefined, url);
        const response = await DELETE(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.error).toBe('Unauthorized');

        expect(sessionsService.leaveSession).not.toHaveBeenCalled();
      });
    });

    describe('validation errors', () => {
      test('should return validation error for invalid query params', async () => {
        const url = 'https://example.com/api/bingo/sessions/players?invalid=param';
        const validationError = NextResponse.json(
          { error: 'Missing sessionId' },
          { status: 400 }
        );

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          success: true,
          data: mockUser,
          error: null,
        });

        mockValidationMiddleware.validateQueryParams.mockReturnValue({
          success: false,
          error: validationError,
        });

        const request = createMockRequest(undefined, url);
        const response = await DELETE(request);

        expect(response).toBe(validationError);
        expect(sessionsService.leaveSession).not.toHaveBeenCalled();
      });
    });

    describe('leave session errors', () => {
      test('should return 400 for leave session errors', async () => {
        const url = 'https://example.com/api/bingo/sessions/players?sessionId=session-123';

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          success: true,
          data: mockUser,
          error: null,
        });

        mockValidationMiddleware.validateQueryParams.mockReturnValue({
          success: true,
          data: { sessionId: 'session-123' },
        });

        (sessionsService.leaveSession as jest.Mock).mockResolvedValue({
          success: false,
          data: null,
          error: 'Player not in session',
        });

        const request = createMockRequest(undefined, url);
        const response = await DELETE(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toBe('Player not in session');
      });
    });
  });
});