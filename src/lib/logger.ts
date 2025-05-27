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

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';
  
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const contextStr = context ? ` [${Object.entries(context).map(([k, v]) => `${k}:${v}`).join(', ')}]` : '';
    return `${prefix}${contextStr} ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    if (this.isProduction) {
      // In production, only log warnings and errors
      return ['warn', 'error'].includes(level);
    }
    return true;
  }

  private createLogEntry(level: LogLevel, message: string, context?: LogContext, error?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      stack: error?.stack,
    };
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      const formattedMessage = this.formatMessage('debug', message, context);
      console.debug(formattedMessage);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      const formattedMessage = this.formatMessage('info', message, context);
      console.info(formattedMessage);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      const formattedMessage = this.formatMessage('warn', message, context);
      console.warn(formattedMessage);
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const formattedMessage = this.formatMessage('error', message, context);
      console.error(formattedMessage, error);
      
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
    console.error('Send to monitoring service:', logEntry);
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
}; 