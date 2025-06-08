/**
 * Production-ready logger utility for better debugging and monitoring
 * Custom implementation without pino to avoid thread-stream dependency issues in Next.js
 */

import * as Sentry from '@sentry/nextjs';
import { addBreadcrumb } from './sentry-utils';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Type guard for LogLevel
function isValidLogLevel(value: string): value is LogLevel {
  return ['debug', 'info', 'warn', 'error'].includes(value);
}

interface LogContext {
  userId?: string;
  sessionId?: string;
  boardId?: string;
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

// Define proper types for log objects
interface LogObject {
  level: LogLevel;
  time: number;
  msg: string;
  context?: LogContext;
  err?: Error;
  [key: string]: unknown;
}

// Logger interface that matches our usage patterns
interface LoggerMethods {
  debug: (obj: Record<string, unknown>, msg?: string) => void;
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
  error: (obj: Record<string, unknown>, msg?: string) => void;
}

// Custom logger implementation without any external dependencies
const createCustomLogger = (): LoggerMethods => {
  const getLogLevel = (): LogLevel => {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    if (envLevel && isValidLogLevel(envLevel)) {
      return envLevel;
    }
    return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  };

  const shouldLog = (level: LogLevel): boolean => {
    const currentLevel = getLogLevel();
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(currentLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  };

  const formatLog = (logObject: LogObject) => {
    const { level, time, msg, context, err, ...rest } = logObject;
    const timestamp = new Date(time).toISOString();

    // Create base log object
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message: msg,
      ...(context && { context }),
      ...(Object.keys(rest).length > 0 && { data: rest }),
      ...(err && {
        error: {
          name: err.name,
          message: err.message,
          stack: err.stack,
        },
      }),
      ...(typeof process !== 'undefined' &&
        process.pid && { pid: process.pid }),
    };

    // In development, use colorized console output
    if (process.env.NODE_ENV === 'development') {
      const levelColors = {
        debug: '\x1b[36m', // cyan
        info: '\x1b[32m', // green
        warn: '\x1b[33m', // yellow
        error: '\x1b[31m', // red
      };
      const resetColor = '\x1b[0m';
      const color = levelColors[level as keyof typeof levelColors] || '';

      let logLine = `${color}[${new Date(time).toLocaleTimeString()}] ${level.toUpperCase()}${resetColor}: ${msg}`;

      if (context) {
        logLine += ` | Context: ${JSON.stringify(context)}`;
      }

      if (Object.keys(rest).length > 0) {
        logLine += ` | Data: ${JSON.stringify(rest)}`;
      }

      if (err) {
        logLine += `\n  Error: ${err.message}`;
        if (err.stack) {
          logLine += `\n  Stack: ${err.stack}`;
        }
      }

      return logLine;
    }

    // In production, use JSON format
    return JSON.stringify(logEntry);
  };

  const logMessage = (
    level: LogLevel,
    obj: Record<string, unknown>,
    msg?: string
  ) => {
    if (!shouldLog(level)) return;

    const logObj: LogObject = {
      ...obj,
      level,
      time: Date.now(),
      msg: msg || '',
    };

    const formatted = formatLog(logObj);

    // Use appropriate console method
    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  };

  return {
    debug: (obj: Record<string, unknown>, msg?: string) =>
      logMessage('debug', obj, msg),
    info: (obj: Record<string, unknown>, msg?: string) =>
      logMessage('info', obj, msg),
    warn: (obj: Record<string, unknown>, msg?: string) =>
      logMessage('warn', obj, msg),
    error: (obj: Record<string, unknown>, msg?: string) =>
      logMessage('error', obj, msg),
  };
};

// Create logger instance
const activeLogger: LoggerMethods = createCustomLogger();

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  private shouldLog(_level: LogLevel): boolean {
    // Level filtering is handled by the underlying logger
    return true;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    // This is mainly for sendToMonitoringService
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
      activeLogger.debug({ context }, message);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      activeLogger.info({ context }, message);

      // Add Sentry breadcrumb for info logs
      addBreadcrumb(message, 'logger', context?.metadata, 'info');
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      activeLogger.warn({ context }, message);

      // Add Sentry breadcrumb for warnings
      addBreadcrumb(message, 'logger', context?.metadata, 'warning');

      // Also capture warnings as Sentry messages in production
      if (this.isProduction) {
        Sentry.captureMessage(message, 'warning');
      }
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog('error')) {
      // Use our custom error handling
      activeLogger.error(
        { ...(context && { context }), ...(error && { err: error }) },
        message
      );

      // Send to Sentry
      if (error) {
        Sentry.withScope(scope => {
          // Add context
          if (context) {
            // Convert LogContext to the format Sentry expects
            const sentryContext: { [key: string]: unknown } = {
              userId: context.userId,
              sessionId: context.sessionId,
              component: context.component,
              feature: context.feature,
              ...context.metadata,
            };
            scope.setContext('logger', sentryContext);
          }

          // Set level
          scope.setLevel('error');

          // Add breadcrumb
          scope.addBreadcrumb({
            category: 'logger',
            message,
            level: 'error',
            data: context,
          });

          // Capture exception - ensure it's an Error object
          if (error instanceof Error) {
            Sentry.captureException(error);
          } else {
            // For non-Error objects, create a proper Error with the object as context
            const wrappedError = new Error(message);
            Object.defineProperty(wrappedError, 'cause', {
              value: error,
              writable: true,
              enumerable: false,
              configurable: true,
            });
            Sentry.captureException(wrappedError);
          }
        });
      } else {
        // For errors without an Error object, capture as message
        Sentry.captureMessage(message, 'error');
      }

      // In production, you might want to send errors to a monitoring service
      if (this.isProduction && error) {
        this.sendToMonitoringService(
          this.createLogEntry('error', message, context, error)
        );
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

  apiError(
    method: string,
    url: string,
    error: Error,
    context?: LogContext
  ): void {
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
  gameEvent(
    eventType: string,
    data: Record<string, unknown>,
    context?: LogContext
  ): void {
    this.info(`Game Event: ${eventType}`, {
      ...context,
      metadata: { ...context?.metadata, eventData: data },
    });
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
    if (this.isDevelopment) {
      // Use our simple console output to avoid any dependency issues
      console.warn(
        '[Logger] Sending to monitoring service (dev mode)',
        logEntry
      );
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
  debug: (message: string, context?: LogContext) =>
    logger.debug(message, context),
  info: (message: string, context?: LogContext) =>
    logger.info(message, context),
  warn: (message: string, context?: LogContext) =>
    logger.warn(message, context),
  error: (message: string, error?: Error, context?: LogContext) =>
    logger.error(message, error, context),
  storeAction: (action: string, context?: LogContext) =>
    logger.storeAction(action, context),
  apiCall: (method: string, url: string, context?: LogContext) =>
    logger.apiCall(method, url, context),
  apiError: (method: string, url: string, error: Error, context?: LogContext) =>
    logger.apiError(method, url, error, context),
  gameEvent: (
    eventType: string,
    data: Record<string, unknown>,
    context?: LogContext
  ) => logger.gameEvent(eventType, data, context),
  performance: (metric: string, value: number, context?: LogContext) =>
    logger.performance(metric, value, context),
  userAction: (action: string, context?: LogContext) =>
    logger.userAction(action, context),
  componentMount: (componentName: string, context?: LogContext) =>
    logger.componentMount(componentName, context),
  componentUnmount: (componentName: string, context?: LogContext) =>
    logger.componentUnmount(componentName, context),
};
