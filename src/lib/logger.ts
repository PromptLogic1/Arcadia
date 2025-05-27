import pino from 'pino';
import os from 'os';

/**
 * Production-ready logger utility for better debugging and monitoring
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  sessionId?: string;
  component?: string;
  feature?: string;
  metadata?: Record<string, unknown>;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  stack?: string;
}

const pinoLogger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  browser: {
    asObject: true, // Log an object instead of a string
  },
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      levelFirst: true,
      translateTime: 'SYS:standard',
    },
  } : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
    // Add context directly to the log object
    log: (obj) => {
      const { context, ...rest } = obj as any;
      if (context) {
        return { ...context, ...rest };
      }
      return rest;
    }
  },
  // Base properties to include in every log
  base: {
    pid: typeof process !== 'undefined' ? process.pid : undefined, // process is not available in browser
    hostname: typeof process !== 'undefined' ? os.hostname() : undefined, // os is not available in browser
  },
  // Serialize errors properly
  serializers: {
    ...pino.stdSerializers, // Includes err serializer
    error: pino.stdSerializers.err, // Explicitly use pino's error serializer
  },
  // Add a timestamp
  timestamp: pino.stdTimeFunctions.isoTime,
});

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';
  
  private shouldLog(level: LogLevel): boolean {
    // Pino handles level filtering based on its initialization
    return true; 
  }

  private createLogEntry(level: LogLevel, message: string, context?: LogContext, error?: Error): LogEntry {
    // This is mainly for sendToMonitoringService, pino handles its own entry structure
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    };
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      pinoLogger.debug({ context }, message);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      pinoLogger.info({ context }, message);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      pinoLogger.warn({ context }, message);
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog('error')) {
      // Pino's stdSerializers.err will handle the error object correctly
      pinoLogger.error({ context, err: error }, message);
      
      // In production, you might want to send errors to a monitoring service
      if (this.isProduction && error) {
        this.sendToMonitoringService(this.createLogEntry('error', message, context, error));
      }
    }
  }

  // Store creation context for better debugging
  storeAction(action: string, context?: LogContext): void {
    this.debug(`Store Action: ${action}`, context);
  }

  // API call logging
  apiCall(method: string, url: string, context?: LogContext): void {
    this.debug(`API Call: ${method} ${url}`, context);
  }

  apiError(method: string, url: string, error: Error, context?: LogContext): void {
    this.error(`API Error: ${method} ${url}`, error, context);
  }

  // Component lifecycle logging
  componentMount(componentName: string, context?: LogContext): void {
    this.debug(`Component Mounted: ${componentName}`, context);
  }

  componentUnmount(componentName: string, context?: LogContext): void {
    this.debug(`Component Unmounted: ${componentName}`, context);
  }

  // Game event logging
  gameEvent(eventType: string, data: Record<string, unknown>, context?: LogContext): void {
    this.info(`Game Event: ${eventType}`, { ...context, metadata: { ...context?.metadata, eventData: data } });
  }

  // Performance logging
  performance(metric: string, value: number, context?: LogContext): void {
    this.info(`Performance: ${metric} = ${value}ms`, context);
  }

  // User action logging (for analytics)
  userAction(action: string, context?: LogContext): void {
    this.info(`User Action: ${action}`, context);
  }

  private sendToMonitoringService(logEntry: LogEntry): void {
    // Placeholder for production monitoring service integration
    // You could integrate with services like Sentry, LogRocket, etc.
    // Avoid using console.error here to prevent potential logging loops
    if (this.isDevelopment) {
      // Use pino for this warning as well
      pinoLogger.warn({ logEntry, source: 'sendToMonitoringService' }, '[Logger] Sending to monitoring service (dev mode)');
    }
    // In a real production scenario, this would be an API call to your monitoring service.
    // For example: fetch('https://your-monitoring-service.com/logs', { method: 'POST', body: JSON.stringify(logEntry) });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for external use
export type { LogLevel, LogContext, LogEntry };

// Export convenience functions
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  error: (message: string, error?: Error, context?: LogContext) => logger.error(message, error, context),
  storeAction: (action: string, context?: LogContext) => logger.storeAction(action, context),
  apiCall: (method: string, url: string, context?: LogContext) => logger.apiCall(method, url, context),
  apiError: (method: string, url: string, error: Error, context?: LogContext) => logger.apiError(method, url, error, context),
  gameEvent: (eventType: string, data: Record<string, unknown>, context?: LogContext) => logger.gameEvent(eventType, data, context),
  performance: (metric: string, value: number, context?: LogContext) => logger.performance(metric, value, context),
  userAction: (action: string, context?: LogContext) => logger.userAction(action, context),
  componentMount: (componentName: string, context?: LogContext) => logger.componentMount(componentName, context),
  componentUnmount: (componentName: string, context?: LogContext) => logger.componentUnmount(componentName, context),
}; 