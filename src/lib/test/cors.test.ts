/**
 * @jest-environment node
 */

import type { NextRequest, NextResponse } from 'next/server';
import {
  applyCorsHeaders,
  handleCorsPreflightRequest,
  withCors,
  validateWebSocketOrigin,
  getApiCorsConfig,
} from '@/lib/cors';

// Mock NextRequest and NextResponse
const createMockRequest = (
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
  } = {}
): NextRequest => {
  const request = new Request(url, {
    method: options.method || 'GET',
    headers: options.headers || {},
  });
  return request as NextRequest;
};

const createMockResponse = (
  data: unknown = null,
  init: ResponseInit = {}
): NextResponse => {
  const response = new Response(JSON.stringify(data), {
    status: 200,
    ...init,
  });
  return response as NextResponse;
};

describe('CORS Utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('applyCorsHeaders', () => {
    it('should apply CORS headers with default options', () => {
      const request = createMockRequest('https://example.com/api/test', {
        headers: { origin: 'https://allowed-origin.com' },
      });
      const response = createMockResponse();

      const result = applyCorsHeaders(request, response);

      // Check that headers were set (exact values depend on production vs development)
      expect(result.headers.has('Access-Control-Allow-Methods')).toBe(true);
      expect(result.headers.has('Access-Control-Allow-Headers')).toBe(true);
      expect(result.headers.has('Access-Control-Max-Age')).toBe(true);
    });

    it('should set wildcard origin in development when origin is not in allowed list', () => {
      (process.env as any).NODE_ENV = 'development';
      
      const request = createMockRequest('https://example.com/api/test', {
        headers: { origin: 'https://any-origin.com' },
      });
      const response = createMockResponse();

      // Use strict options that don't allow the origin
      const options = { origin: ['https://allowed-only.com'] };
      const result = applyCorsHeaders(request, response, options);

      expect(result.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should handle requests without origin header', () => {
      const request = createMockRequest('https://example.com/api/test');
      const response = createMockResponse();

      const result = applyCorsHeaders(request, response);

      // Should still set other CORS headers
      expect(result.headers.has('Access-Control-Allow-Methods')).toBe(true);
      expect(result.headers.has('Access-Control-Allow-Headers')).toBe(true);
    });

    it('should apply custom CORS options', () => {
      const request = createMockRequest('https://example.com/api/test', {
        headers: { origin: 'https://custom-origin.com' },
      });
      const response = createMockResponse();

      const customOptions = {
        origin: 'https://custom-origin.com',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Custom-Header'],
        credentials: false,
        maxAge: 3600,
      };

      const result = applyCorsHeaders(request, response, customOptions);

      expect(result.headers.get('Access-Control-Allow-Origin')).toBe('https://custom-origin.com');
      expect(result.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST');
      expect(result.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Custom-Header');
      expect(result.headers.get('Access-Control-Max-Age')).toBe('3600');
      expect(result.headers.has('Access-Control-Allow-Credentials')).toBe(false);
    });

    it('should set credentials header when enabled', () => {
      const request = createMockRequest('https://example.com/api/test', {
        headers: { origin: 'https://allowed-origin.com' },
      });
      const response = createMockResponse();

      const options = { credentials: true };

      const result = applyCorsHeaders(request, response, options);

      expect(result.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('should handle array of allowed origins', () => {
      const allowedOrigins = ['https://app1.com', 'https://app2.com'];
      const request = createMockRequest('https://example.com/api/test', {
        headers: { origin: 'https://app1.com' },
      });
      const response = createMockResponse();

      const options = { origin: allowedOrigins };

      const result = applyCorsHeaders(request, response, options);

      expect(result.headers.get('Access-Control-Allow-Origin')).toBe('https://app1.com');
    });

    it('should reject disallowed origins in production', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com';
      
      const request = createMockRequest('https://example.com/api/test', {
        headers: { origin: 'https://malicious-site.com' },
      });
      const response = createMockResponse();

      const options = { origin: ['https://myapp.com'] };

      const result = applyCorsHeaders(request, response, options);

      expect(result.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('should handle origin: false option', () => {
      const request = createMockRequest('https://example.com/api/test', {
        headers: { origin: 'https://any-origin.com' },
      });
      const response = createMockResponse();

      const options = { origin: false };

      const result = applyCorsHeaders(request, response, options);

      expect(result.headers.has('Access-Control-Allow-Origin')).toBe(false);
    });
  });

  describe('handleCorsPreflightRequest', () => {
    it('should create proper preflight response', () => {
      const request = createMockRequest('https://example.com/api/test', {
        method: 'OPTIONS',
        headers: { origin: 'https://allowed-origin.com' },
      });

      const response = handleCorsPreflightRequest(request);

      expect(response.status).toBe(200);
      expect(response.headers.has('Access-Control-Allow-Methods')).toBe(true);
      expect(response.headers.has('Access-Control-Allow-Headers')).toBe(true);
    });

    it('should apply custom options to preflight response', () => {
      const request = createMockRequest('https://example.com/api/test', {
        method: 'OPTIONS',
        headers: { origin: 'https://custom-origin.com' },
      });

      const customOptions = {
        origin: 'https://custom-origin.com',
        methods: ['GET', 'POST'],
        maxAge: 7200,
      };

      const response = handleCorsPreflightRequest(request, customOptions);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://custom-origin.com');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST');
      expect(response.headers.get('Access-Control-Max-Age')).toBe('7200');
    });
  });

  describe('withCors', () => {
    const mockHandler = jest.fn();

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it('should handle OPTIONS requests as preflight', async () => {
      const request = createMockRequest('https://example.com/api/test', {
        method: 'OPTIONS',
        headers: { origin: 'https://allowed-origin.com' },
      });

      const corsHandler = withCors(mockHandler);
      const response = await corsHandler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.headers.has('Access-Control-Allow-Methods')).toBe(true);
    });

    it('should process non-OPTIONS requests and apply CORS headers', async () => {
      const request = createMockRequest('https://example.com/api/test', {
        method: 'GET',
        headers: { origin: 'https://allowed-origin.com' },
      });

      const mockResponse = createMockResponse({ data: 'test' });
      mockHandler.mockResolvedValue(mockResponse);

      const corsHandler = withCors(mockHandler);
      const response = await corsHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(request);
      expect(response.headers.has('Access-Control-Allow-Methods')).toBe(true);
    });

    it('should apply custom CORS options', async () => {
      const request = createMockRequest('https://example.com/api/test', {
        method: 'POST',
        headers: { origin: 'https://custom-origin.com' },
      });

      const mockResponse = createMockResponse({ success: true });
      mockHandler.mockResolvedValue(mockResponse);

      const customOptions = {
        origin: 'https://custom-origin.com',
        methods: ['POST'],
        credentials: true,
      };

      const corsHandler = withCors(mockHandler, customOptions);
      const response = await corsHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(request);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://custom-origin.com');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST');
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('should handle async handler errors', async () => {
      const request = createMockRequest('https://example.com/api/test', {
        method: 'GET',
      });

      const error = new Error('Handler failed');
      mockHandler.mockRejectedValue(error);

      const corsHandler = withCors(mockHandler);

      await expect(corsHandler(request)).rejects.toThrow('Handler failed');
      expect(mockHandler).toHaveBeenCalledWith(request);
    });
  });

  describe('validateWebSocketOrigin', () => {
    it('should allow all origins in development', () => {
      (process.env as any).NODE_ENV = 'development';
      
      const request = createMockRequest('wss://example.com/ws', {
        headers: { origin: 'https://malicious-site.com' },
      });

      expect(validateWebSocketOrigin(request)).toBe(true);
    });

    it('should validate origins against production list', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com';
      
      const validRequest = createMockRequest('wss://example.com/ws', {
        headers: { origin: 'https://myapp.com' },
      });

      const invalidRequest = createMockRequest('wss://example.com/ws', {
        headers: { origin: 'https://malicious-site.com' },
      });

      expect(validateWebSocketOrigin(validRequest)).toBe(true);
      expect(validateWebSocketOrigin(invalidRequest)).toBe(false);
    });

    it('should handle requests without origin in production', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com';
      
      const request = createMockRequest('wss://example.com/ws');

      expect(validateWebSocketOrigin(request)).toBe(false);
    });

    it('should handle www variant origins', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com';
      
      const request = createMockRequest('wss://example.com/ws', {
        headers: { origin: 'https://www.myapp.com' },
      });

      expect(validateWebSocketOrigin(request)).toBe(true);
    });
  });

  describe('getApiCorsConfig', () => {
    it('should return auth-specific configuration', () => {
      const config = getApiCorsConfig('auth');

      expect(config.credentials).toBe(true);
      expect(config.methods).toContain('GET');
      expect(config.methods).toContain('POST');
      expect(config.allowedHeaders).toContain('Authorization');
    });

    it('should return realtime-specific configuration', () => {
      const config = getApiCorsConfig('realtime');

      expect(config.methods).toEqual(['GET', 'POST', 'OPTIONS']);
      expect(config.credentials).toBe(true);
    });

    it('should return public-specific configuration', () => {
      const config = getApiCorsConfig('public');

      expect(config.credentials).toBe(false);
      expect(config.methods).toContain('GET');
    });

    it('should return default configuration for unknown endpoints', () => {
      const config = getApiCorsConfig('unknown');

      expect(config.methods).toContain('GET');
      expect(config.methods).toContain('POST');
      expect(config.methods).toContain('PUT');
      expect(config.methods).toContain('DELETE');
      expect(config.credentials).toBe(true);
      expect(config.maxAge).toBe(86400);
    });

    it('should include standard headers in all configurations', () => {
      const authConfig = getApiCorsConfig('auth');
      const realtimeConfig = getApiCorsConfig('realtime');
      const publicConfig = getApiCorsConfig('public');

      [authConfig, realtimeConfig, publicConfig].forEach(config => {
        expect(config.allowedHeaders).toContain('Content-Type');
        expect(config.allowedHeaders).toContain('Authorization');
        expect(config.allowedHeaders).toContain('X-Requested-With');
      });
    });
  });

  describe('production origin handling', () => {
    it('should handle missing NEXT_PUBLIC_APP_URL gracefully', () => {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.NEXT_PUBLIC_APP_URL;

      const request = createMockRequest('https://example.com/api/test', {
        headers: { origin: 'https://any-origin.com' },
      });

      expect(() => validateWebSocketOrigin(request)).not.toThrow();
      expect(validateWebSocketOrigin(request)).toBe(false);
    });

    it('should create www variant for non-www domains', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com';

      const request = createMockRequest('wss://example.com/ws', {
        headers: { origin: 'https://www.myapp.com' },
      });

      expect(validateWebSocketOrigin(request)).toBe(true);
    });

    it('should not create duplicate www variants', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_APP_URL = 'https://www.myapp.com';

      const request = createMockRequest('wss://example.com/ws', {
        headers: { origin: 'https://www.myapp.com' },
      });

      expect(validateWebSocketOrigin(request)).toBe(true);
    });

    it('should handle domains with ports', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com:3000';

      const request = createMockRequest('wss://example.com/ws', {
        headers: { origin: 'https://www.myapp.com:3000' },
      });

      expect(validateWebSocketOrigin(request)).toBe(true);
    });
  });
});