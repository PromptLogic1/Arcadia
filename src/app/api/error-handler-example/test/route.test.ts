/**
 * @jest-environment node
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock external dependencies before any imports that use them
jest.mock('@/lib/error-handler', () => {
  const actual = jest.requireActual('@/lib/error-handler');
  return {
    toApiResponse: jest.fn(),
    ErrorFactory: {
      validation: jest.fn(),
      unauthorized: jest.fn(),
      database: jest.fn(),
      rateLimit: jest.fn(),
    },
    withErrorHandling: jest.fn((handler) => handler),
    ArcadiaError: actual.ArcadiaError,
    ErrorCode: actual.ErrorCode,
  };
});

jest.mock('@/lib/supabase', () => ({
  createServerComponentClient: jest.fn(),
}));

// Import after mocks are set up
import {
  toApiResponse,
  ErrorFactory,
  ArcadiaError,
  ErrorCode,
} from '@/lib/error-handler';
import { createServerComponentClient } from '@/lib/supabase';
import { GET, POST } from '../route';

const mockToApiResponse = toApiResponse as jest.MockedFunction<typeof toApiResponse>;
const mockErrorFactory = ErrorFactory as jest.Mocked<typeof ErrorFactory>;
const mockCreateServerComponentClient = createServerComponentClient as jest.MockedFunction<typeof createServerComponentClient>;

// Mock Response properly for Node environment
const mockResponseJson = jest.fn((data: unknown) => ({
  json: async () => data,
  status: 200,
  headers: new Headers(),
}));

// Mock Response constructor
(global as any).Response = class MockResponse {
  body: unknown;
  status: number;
  headers: Headers;

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    this.body = body;
    this.status = init?.status || 200;
    this.headers = new Headers(init?.headers);
  }

  static json(data: unknown, _init?: ResponseInit) {
    return mockResponseJson(data);
  }

  async json() {
    if (typeof this.body === 'string') {
      return JSON.parse(this.body);
    }
    return this.body;
  }
};

describe('GET /api/error-handler-example', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (searchParams: Record<string, string> = {}): NextRequest => {
    const url = new URL('https://localhost:3000/api/error-handler-example');
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    return new NextRequest(url, {
      headers: {
        'user-agent': 'test-agent',
        'x-forwarded-for': '127.0.0.1',
      },
    });
  };

  describe('Successful Requests', () => {
    it('should return success response when no error parameter is provided', async () => {
      const request = createRequest();
      const response = await GET(request);

      expect(mockResponseJson).toHaveBeenCalledWith({
        message: 'Error handler test successful',
        timestamp: expect.any(String),
      });
      
      const jsonData = await response.json();
      expect(jsonData).toEqual({
        message: 'Error handler test successful',
        timestamp: expect.any(String),
      });
    });

    it('should return success response for unknown error parameter', async () => {
      const request = createRequest({ error: 'unknown' });
      const response = await GET(request);

      expect(mockResponseJson).toHaveBeenCalledWith({
        message: 'Error handler test successful',
        timestamp: expect.any(String),
      });
      
      const jsonData = await response.json();
      expect(jsonData).toEqual({
        message: 'Error handler test successful',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Error Simulation', () => {
    it('should simulate validation error', async () => {
      const validationError = new ArcadiaError({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid test parameter',
      });
      const mockApiResponse = NextResponse.json(
        { error: 'Validation error' },
        { status: 400 }
      );

      mockErrorFactory.validation.mockReturnValue(validationError);
      mockToApiResponse.mockReturnValue(mockApiResponse);

      const request = createRequest({ error: 'validation' });
      const response = await GET(request);

      expect(mockErrorFactory.validation).toHaveBeenCalledWith('Invalid test parameter');
      expect(mockToApiResponse).toHaveBeenCalledWith(
        validationError,
        {
          component: 'error-handler-example',
          metadata: {
            method: 'GET',
            userAgent: 'test-agent',
            ip: '127.0.0.1',
          },
        }
      );
      expect(response).toBe(mockApiResponse);
    });

    it('should simulate unauthorized error', async () => {
      const unauthorizedError = new ArcadiaError({
        code: ErrorCode.UNAUTHORIZED,
        message: 'User not authenticated',
      });
      const mockApiResponse = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );

      mockErrorFactory.unauthorized.mockReturnValue(unauthorizedError);
      mockToApiResponse.mockReturnValue(mockApiResponse);

      const request = createRequest({ error: 'unauthorized' });
      const response = await GET(request);

      expect(mockErrorFactory.unauthorized).toHaveBeenCalledWith('User not authenticated');
      expect(mockToApiResponse).toHaveBeenCalledWith(
        unauthorizedError,
        {
          component: 'error-handler-example',
          metadata: {
            method: 'GET',
            userAgent: 'test-agent',
            ip: '127.0.0.1',
          },
        }
      );
      expect(response).toBe(mockApiResponse);
    });

    it('should simulate database error', async () => {
      const dbError = new Error('Connection failed');
      const databaseError = new ArcadiaError({
        code: ErrorCode.DATABASE_ERROR,
        message: 'Database error',
      });
      const mockApiResponse = NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );

      mockErrorFactory.database.mockReturnValue(databaseError);
      mockToApiResponse.mockReturnValue(mockApiResponse);

      const request = createRequest({ error: 'database' });
      const response = await GET(request);

      expect(mockErrorFactory.database).toHaveBeenCalledWith(dbError);
      expect(mockToApiResponse).toHaveBeenCalledWith(
        databaseError,
        {
          component: 'error-handler-example',
          metadata: {
            method: 'GET',
            userAgent: 'test-agent',
            ip: '127.0.0.1',
          },
        }
      );
      expect(response).toBe(mockApiResponse);
    });

    it('should simulate rate limit error', async () => {
      const rateLimitError = new ArcadiaError({
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded',
      });
      const mockApiResponse = NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );

      mockErrorFactory.rateLimit.mockReturnValue(rateLimitError);
      mockToApiResponse.mockReturnValue(mockApiResponse);

      const request = createRequest({ error: 'rate-limit' });
      const response = await GET(request);

      expect(mockErrorFactory.rateLimit).toHaveBeenCalledWith({ 
        apiRoute: 'error-handler-example' 
      });
      expect(mockToApiResponse).toHaveBeenCalledWith(
        rateLimitError,
        {
          component: 'error-handler-example',
          metadata: {
            method: 'GET',
            userAgent: 'test-agent',
            ip: '127.0.0.1',
          },
        }
      );
      expect(response).toBe(mockApiResponse);
    });
  });

  describe('Metadata Handling', () => {
    it('should handle missing user-agent header', async () => {
      const validationError = new ArcadiaError({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid test parameter',
      });
      const mockApiResponse = NextResponse.json(
        { error: 'Validation error' },
        { status: 400 }
      );

      mockErrorFactory.validation.mockReturnValue(validationError);
      mockToApiResponse.mockReturnValue(mockApiResponse);

      const request = new NextRequest(
        'https://localhost:3000/api/error-handler-example?error=validation',
        {
          headers: {
            'x-forwarded-for': '127.0.0.1',
          },
        }
      );

      await GET(request);

      expect(mockToApiResponse).toHaveBeenCalledWith(
        validationError,
        {
          component: 'error-handler-example',
          metadata: {
            method: 'GET',
            userAgent: 'unknown',
            ip: '127.0.0.1',
          },
        }
      );
    });

    it('should handle missing x-forwarded-for header', async () => {
      const validationError = new ArcadiaError({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid test parameter',
      });
      const mockApiResponse = NextResponse.json(
        { error: 'Validation error' },
        { status: 400 }
      );

      mockErrorFactory.validation.mockReturnValue(validationError);
      mockToApiResponse.mockReturnValue(mockApiResponse);

      const request = new NextRequest(
        'https://localhost:3000/api/error-handler-example?error=validation',
        {
          headers: {
            'user-agent': 'test-agent',
          },
        }
      );

      await GET(request);

      expect(mockToApiResponse).toHaveBeenCalledWith(
        validationError,
        {
          component: 'error-handler-example',
          metadata: {
            method: 'GET',
            userAgent: 'test-agent',
            ip: 'unknown',
          },
        }
      );
    });

    it('should handle missing both headers', async () => {
      const validationError = new ArcadiaError({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid test parameter',
      });
      const mockApiResponse = NextResponse.json(
        { error: 'Validation error' },
        { status: 400 }
      );

      mockErrorFactory.validation.mockReturnValue(validationError);
      mockToApiResponse.mockReturnValue(mockApiResponse);

      const request = new NextRequest(
        'https://localhost:3000/api/error-handler-example?error=validation'
      );

      await GET(request);

      expect(mockToApiResponse).toHaveBeenCalledWith(
        validationError,
        {
          component: 'error-handler-example',
          metadata: {
            method: 'GET',
            userAgent: 'unknown',
            ip: 'unknown',
          },
        }
      );
    });
  });
});

describe('POST /api/error-handler-example', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (): NextRequest => {
    return new NextRequest('https://localhost:3000/api/error-handler-example', {
      method: 'POST',
    });
  };

  describe('withErrorHandling Wrapper', () => {
    it('should use withErrorHandling wrapper for POST requests', async () => {
      // The protectedHandler is created when the route module is loaded
      // So we just verify the behavior works correctly
      
      // Mock successful authentication and database query
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'user-123', username: 'testuser' },
                error: null,
              }),
            }),
          }),
        }),
      };

      mockCreateServerComponentClient.mockResolvedValue(mockSupabase as any);

      const request = createRequest();
      const response = await POST(request);

      expect(mockResponseJson).toHaveBeenCalledWith({ 
        user: { id: 'user-123', username: 'testuser' } 
      });
      
      const jsonData = await response.json();
      expect(jsonData).toEqual({ 
        user: { id: 'user-123', username: 'testuser' } 
      });
    });

    it('should handle authentication error in POST', async () => {
      const authError = new ArcadiaError({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Authentication required',
      });

      mockErrorFactory.unauthorized.mockReturnValue(authError);

      // Mock auth failure
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Auth error'),
          }),
        },
      };

      mockCreateServerComponentClient.mockResolvedValue(mockSupabase as any);

      const request = createRequest();
      
      await expect(POST(request)).rejects.toThrow(authError);
      
      expect(mockErrorFactory.unauthorized).toHaveBeenCalledWith('Authentication required');
    });

    it('should handle database error in POST', async () => {
      const dbError = { message: 'Database connection failed' };
      const databaseError = new ArcadiaError({
        code: ErrorCode.DATABASE_ERROR,
        message: 'Database error',
      });

      mockErrorFactory.database.mockReturnValue(databaseError);

      // Mock successful auth but database error
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: dbError,
              }),
            }),
          }),
        }),
      };

      mockCreateServerComponentClient.mockResolvedValue(mockSupabase as any);

      const request = createRequest();
      
      await expect(POST(request)).rejects.toThrow(databaseError);
      
      expect(mockErrorFactory.database).toHaveBeenCalledWith(dbError);
    });

    it('should handle successful POST request', async () => {
      // Mock successful authentication and database query
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'user-123', username: 'testuser' },
                error: null,
              }),
            }),
          }),
        }),
      };

      mockCreateServerComponentClient.mockResolvedValue(mockSupabase as any);

      const request = createRequest();
      const response = await POST(request);

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockResponseJson).toHaveBeenCalledWith({
        user: { id: 'user-123', username: 'testuser' }
      });
      
      const jsonData = await response.json();
      expect(jsonData).toEqual({
        user: { id: 'user-123', username: 'testuser' }
      });
    });
  });

  describe('Database Operations', () => {
    it('should query user data correctly', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn(),
      };

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'user-123', username: 'testuser' },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockChain);
      mockCreateServerComponentClient.mockResolvedValue(mockSupabase as any);

      const request = createRequest();
      await POST(request);

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockChain.select).toHaveBeenCalledWith('id, username');
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'user-123');
      expect(mockChain.single).toHaveBeenCalled();
    });
  });
});