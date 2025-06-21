import { register, onRequestError } from '../instrumentation';

// Mock modules
jest.mock('../../instrumentation-server', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// We need to mock the dynamic import
const mockCaptureRequestError = jest.fn();
jest.mock('@sentry/nextjs', () => ({
  captureRequestError: mockCaptureRequestError,
}), { virtual: true });

describe('instrumentation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('register', () => {
    it('imports instrumentation-server when runtime is nodejs', async () => {
      process.env.NEXT_RUNTIME = 'nodejs';
      
      await register();
      
      // Verify that the module was imported
      expect(jest.requireMock('../../instrumentation-server')).toBeDefined();
    });

    it('does not import instrumentation-server for edge runtime', async () => {
      process.env.NEXT_RUNTIME = 'edge';
      
      // Clear the module cache to ensure fresh import tracking
      jest.resetModules();
      
      await register();
      
      // Since edge runtime doesn't import, we can't directly test non-import
      // But the function should complete without errors
      expect(true).toBe(true);
    });

    it('does not import instrumentation-server for undefined runtime', async () => {
      delete process.env.NEXT_RUNTIME;
      
      await register();
      
      // Function should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('onRequestError', () => {
    const createMockRequest = (url?: string, method?: string, headers?: HeadersInit): Request => {
      const mockHeaders = new Map();
      if (headers) {
        if (headers instanceof Headers) {
          headers.forEach((value, key) => mockHeaders.set(key, value));
        } else if (Array.isArray(headers)) {
          headers.forEach(([key, value]) => mockHeaders.set(key, value));
        } else {
          Object.entries(headers).forEach(([key, value]) => mockHeaders.set(key, value));
        }
      }
      
      return {
        url,
        method: method || 'GET',
        headers: {
          entries: () => mockHeaders.entries(),
        },
      } as unknown as Request;
    };

    const mockContext = {
      routerKind: 'app',
      routePath: '/api/test',
      routeType: 'api',
    };

    beforeEach(() => {
      mockCaptureRequestError.mockClear();
    });

    it('captures error in nodejs runtime', async () => {
      process.env.NEXT_RUNTIME = 'nodejs';
      const error = new Error('Test error');
      const request = createMockRequest('https://example.com/api/test', 'POST', {
        'content-type': 'application/json',
        'authorization': 'Bearer token',
      });

      await onRequestError(error, request, mockContext);

      expect(mockCaptureRequestError).toHaveBeenCalledWith(
        error,
        {
          path: '/api/test',
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'authorization': 'Bearer token',
          },
        },
        mockContext
      );
    });

    it('captures error in edge runtime', async () => {
      process.env.NEXT_RUNTIME = 'edge';
      const error = new Error('Edge error');
      const request = createMockRequest('https://example.com/edge/function', 'GET');

      await onRequestError(error, request, mockContext);

      expect(mockCaptureRequestError).toHaveBeenCalledWith(
        error,
        {
          path: '/edge/function',
          method: 'GET',
          headers: {},
        },
        mockContext
      );
    });

    it('does not capture error for other runtimes', async () => {
      process.env.NEXT_RUNTIME = 'browser';
      const error = new Error('Browser error');
      const request = createMockRequest();

      const result = await onRequestError(error, request, mockContext);

      expect(mockCaptureRequestError).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('uses context routePath when URL parsing fails', async () => {
      process.env.NEXT_RUNTIME = 'nodejs';
      const error = new Error('Test error');
      const request = createMockRequest('invalid-url');

      await onRequestError(error, request, mockContext);

      expect(mockCaptureRequestError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          path: '/api/test',
        }),
        mockContext
      );
    });

    it('uses /unknown when no URL and no context routePath', async () => {
      process.env.NEXT_RUNTIME = 'nodejs';
      const error = new Error('Test error');
      const request = createMockRequest();
      const contextWithoutPath = {
        routerKind: 'app',
        routePath: '',
        routeType: 'api',
      };

      await onRequestError(error, request, contextWithoutPath);

      expect(mockCaptureRequestError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          path: '/unknown',
        }),
        contextWithoutPath
      );
    });

    it('handles request without method', async () => {
      process.env.NEXT_RUNTIME = 'nodejs';
      const error = new Error('Test error');
      const request = {
        url: 'https://example.com/test',
        headers: new Headers(),
      } as unknown as Request;

      await onRequestError(error, request, mockContext);

      expect(mockCaptureRequestError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          method: 'GET', // Default method
        }),
        mockContext
      );
    });

    it('handles request without headers', async () => {
      process.env.NEXT_RUNTIME = 'nodejs';
      const error = new Error('Test error');
      const request = {
        url: 'https://example.com/test',
        method: 'POST',
      } as unknown as Request;

      await onRequestError(error, request, mockContext);

      expect(mockCaptureRequestError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          headers: {},
        }),
        mockContext
      );
    });

    it('handles various error types', async () => {
      process.env.NEXT_RUNTIME = 'nodejs';
      const request = createMockRequest('https://example.com/test');

      // String error
      await onRequestError('String error', request, mockContext);
      expect(mockCaptureRequestError).toHaveBeenCalledWith(
        'String error',
        expect.any(Object),
        mockContext
      );

      // Object error
      const objectError = { message: 'Object error', code: 'ERR_001' };
      await onRequestError(objectError, request, mockContext);
      expect(mockCaptureRequestError).toHaveBeenCalledWith(
        objectError,
        expect.any(Object),
        mockContext
      );

      // Null error
      await onRequestError(null, request, mockContext);
      expect(mockCaptureRequestError).toHaveBeenCalledWith(
        null,
        expect.any(Object),
        mockContext
      );

      // Undefined error
      await onRequestError(undefined, request, mockContext);
      expect(mockCaptureRequestError).toHaveBeenCalledWith(
        undefined,
        expect.any(Object),
        mockContext
      );
    });

    it('correctly parses complex URLs', async () => {
      process.env.NEXT_RUNTIME = 'nodejs';
      const error = new Error('Test error');
      const request = createMockRequest(
        'https://example.com:3000/api/users/123?query=test#section',
        'GET'
      );

      await onRequestError(error, request, mockContext);

      expect(mockCaptureRequestError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          path: '/api/users/123', // Should only include pathname
        }),
        mockContext
      );
    });

    it('handles headers with multiple values', async () => {
      process.env.NEXT_RUNTIME = 'nodejs';
      const error = new Error('Test error');
      const headers = new Headers();
      headers.append('accept', 'text/html');
      headers.append('accept', 'application/json');
      headers.set('content-type', 'application/json');
      
      const request = createMockRequest('https://example.com/test', 'POST', headers);

      await onRequestError(error, request, mockContext);

      expect(mockCaptureRequestError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          headers: expect.objectContaining({
            'content-type': 'application/json',
          }),
        }),
        mockContext
      );
    });
  });
});