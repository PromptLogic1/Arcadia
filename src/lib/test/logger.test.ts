/**
 * @jest-environment node
 */

/* eslint-disable testing-library/no-debugging-utils */

import { logger, log, type LogContext } from '../logger';

// Mock console methods
const mockConsole = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock dynamic imports
jest.mock('@sentry/nextjs', () => ({
  addBreadcrumb: jest.fn(),
  captureMessage: jest.fn(),
  captureException: jest.fn(),
  withScope: jest.fn((callback) => callback({ 
    setContext: jest.fn(),
    setLevel: jest.fn(),
    addBreadcrumb: jest.fn(),
  })),
}), { virtual: true });

// Store original console methods
const originalConsole = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods
    console.debug = mockConsole.debug;
    console.info = mockConsole.info;
    console.warn = mockConsole.warn;
    console.error = mockConsole.error;
    
    // Reset environment
    delete process.env.LOG_LEVEL;
  });

  afterAll(() => {
    // Restore console methods
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe('Log Levels', () => {
    it('should respect LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'warn';
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should default to debug level in development', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      expect(mockConsole.debug).toHaveBeenCalled();
      expect(mockConsole.info).toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should default to info level in production', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      });
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should handle invalid LOG_LEVEL values', () => {
      process.env.LOG_LEVEL = 'invalid';
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });
      
      logger.debug('Debug message');
      
      expect(mockConsole.debug).toHaveBeenCalled();
    });
  });

  describe('Basic Logging Methods', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });
    });

    it('should log debug messages', () => {
      const context: LogContext = { userId: '123', component: 'test' };
      logger.debug('Debug message', context);

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Debug message')
      );
    });

    it('should log info messages', () => {
      const context: LogContext = { userId: '123' };
      logger.info('Info message', context);

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('Info message')
      );
    });

    it('should log warn messages', () => {
      const context: LogContext = { sessionId: 'abc123' };
      logger.warn('Warning message', context);

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Warning message')
      );
    });

    it('should log error messages', () => {
      const error = new Error('Test error');
      const context: LogContext = { component: 'TestComponent' };
      logger.error('Error occurred', error, context);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Error occurred')
      );
    });

    it('should log error messages without error object', () => {
      logger.error('Error message without error object');

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Error message without error object')
      );
    });
  });

  describe('Log Formatting', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });
    });

    it('should include context in log output', () => {
      const context: LogContext = {
        userId: '123',
        sessionId: 'abc',
        component: 'TestComponent',
        metadata: { extra: 'data' },
      };

      logger.info('Test message', context);

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(/Context:.*userId.*123/)
      );
    });

    it('should include error details in error logs', () => {
      const error = new Error('Test error details');
      error.stack = 'Error: Test error details\n    at test';

      logger.error('Error occurred', error);

      const logCall = mockConsole.error.mock.calls[0][0];
      expect(logCall).toContain('Error: Test error details');
      expect(logCall).toContain('Stack:');
    });

    it('should format logs differently for production vs development', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      });
      
      logger.info('Production log');
      
      // In production, logs should be JSON formatted
      const logCall = mockConsole.info.mock.calls[0][0];
      expect(() => JSON.parse(logCall)).not.toThrow();
      
      const parsed = JSON.parse(logCall);
      expect(parsed.level).toBe('INFO');
      expect(parsed.message).toBe('Production log');
      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Specialized Logging Methods', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });
    });

    it('should log store actions', () => {
      const context: LogContext = { component: 'Store' };
      logger.storeAction('updateUser', context);

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Store Action: updateUser')
      );
    });

    it('should log API calls', () => {
      const context: LogContext = { feature: 'authentication' };
      logger.apiCall('POST', '/api/login', context);

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('API Call: POST /api/login')
      );
    });

    it('should log API errors', () => {
      const error = new Error('Network timeout');
      const context: LogContext = { feature: 'authentication' };
      logger.apiError('POST', '/api/login', error, context);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('API Error: POST /api/login')
      );
    });

    it('should log component lifecycle events', () => {
      const context: LogContext = { feature: 'bingo' };
      
      logger.componentMount('BingoBoard', context);
      logger.componentUnmount('BingoBoard', context);

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Component Mounted: BingoBoard')
      );
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Component Unmounted: BingoBoard')
      );
    });

    it('should log game events', () => {
      const eventData = { cellId: '5', player: 'user123' };
      const context: LogContext = { sessionId: 'game456' };
      
      logger.gameEvent('cell_marked', eventData, context);

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('Game Event: cell_marked')
      );
    });

    it('should log performance metrics', () => {
      const context: LogContext = { component: 'LoadTime' };
      logger.performance('page_load', 1250, context);

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('Performance: page_load = 1250ms')
      );
    });

    it('should log user actions', () => {
      const context: LogContext = { userId: 'user123' };
      logger.userAction('button_click', context);

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('User Action: button_click')
      );
    });
  });

  describe('Sentry Integration', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      });
    });

    it('should handle Sentry import failures gracefully', async () => {
      // Mock dynamic import to fail
      const originalImport = (global as any).import;
      (global as any).import = jest.fn().mockRejectedValue(new Error('Sentry not available'));

      // These should not throw errors
      expect(() => {
        logger.info('Info message');
        logger.warn('Warning message');
        logger.error('Error message', new Error('Test error'));
      }).not.toThrow();

      // Restore
      (global as any).import = originalImport;
    });
  });

  describe('Monitoring Service Integration', () => {
    it('should call monitoring service in production for errors', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      });
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const error = new Error('Critical error');
      const context: LogContext = { component: 'CriticalComponent' };
      
      logger.error('Critical failure', error, context);

      // Should not call console.warn in production (monitoring service is mocked)
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Sending to monitoring service')
      );

      consoleSpy.mockRestore();
    });

    it('should indicate monitoring service calls in development', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });

      const error = new Error('Test error');
      logger.error('Test error message', error);

      // In development, it should indicate the monitoring service would be called
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Sending to monitoring service (dev mode)'),
        expect.any(Object)
      );
    });
  });

  describe('Convenience Functions (log export)', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });
    });

    it('should provide working convenience functions', () => {
      const context: LogContext = { userId: '123' };
      const error = new Error('Test error');

      log.debug('Debug via convenience', context);
      log.info('Info via convenience', context);
      log.warn('Warn via convenience', context);
      log.error('Error via convenience', error, context);
      log.storeAction('testAction', context);
      log.apiCall('GET', '/test', context);
      log.apiError('POST', '/test', error, context);
      log.gameEvent('test_event', { data: 'test' }, context);
      log.performance('test_metric', 100, context);
      log.userAction('test_action', context);
      log.componentMount('TestComponent', context);
      log.componentUnmount('TestComponent', context);

      expect(mockConsole.debug).toHaveBeenCalledTimes(5); // debug, storeAction, apiCall, componentMount, componentUnmount
      expect(mockConsole.info).toHaveBeenCalledTimes(4); // info, gameEvent, performance, userAction
      expect(mockConsole.warn).toHaveBeenCalledTimes(3); // warn + 2 monitoring service dev warnings (error and apiError)
      expect(mockConsole.error).toHaveBeenCalledTimes(2); // error, apiError
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });
    });

    it('should handle empty contexts', () => {
      expect(() => {
        logger.info('Message with empty context', {});
      }).not.toThrow();
    });

    it('should handle undefined contexts', () => {
      expect(() => {
        logger.info('Message with undefined context', undefined);
      }).not.toThrow();
    });

    it('should handle complex metadata', () => {
      const context: LogContext = {
        metadata: {
          nested: { deep: { object: 'value' } },
          array: [1, 2, 3],
          nullValue: null,
          undefinedValue: undefined,
        },
      };

      expect(() => {
        logger.info('Complex metadata', context);
      }).not.toThrow();
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      
      expect(() => {
        logger.info(longMessage);
      }).not.toThrow();
    });

    it('should handle circular references in context metadata', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      const context: LogContext = {
        metadata: { circular },
      };

      // Should not throw even with circular references
      expect(() => {
        logger.info('Circular reference test', context);
      }).not.toThrow();
    });
  });

  describe('Error Object Handling', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });
    });

    it('should handle Error objects with custom properties', () => {
      const error = new Error('Test error') as any;
      error.code = 'CUSTOM_CODE';
      error.statusCode = 400;
      error.customProperty = 'custom value';

      expect(() => {
        logger.error('Custom error test', error);
      }).not.toThrow();
    });

    it('should handle non-Error objects passed as errors', () => {
      const notAnError = { message: 'Not an error object', code: 500 };

      expect(() => {
        logger.error('Non-error object test', notAnError as any);
      }).not.toThrow();
    });

    it('should handle null/undefined error objects', () => {
      expect(() => {
        logger.error('Null error test', null as any);
        logger.error('Undefined error test', undefined as any);
      }).not.toThrow();
    });
  });

  describe('Environment-Specific Behavior', () => {
    it('should handle missing NODE_ENV', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      
      expect(() => {
        logger.info('Message without NODE_ENV');
      }).not.toThrow();
      
      // Restore original value
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalNodeEnv,
        writable: true,
        configurable: true,
      });
    });

    it('should handle test environment', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'test',
        writable: true,
        configurable: true,
      });
      
      expect(() => {
        logger.debug('Test env debug');
        logger.info('Test env info');
        logger.warn('Test env warn');
        logger.error('Test env error');
      }).not.toThrow();
    });
  });
});