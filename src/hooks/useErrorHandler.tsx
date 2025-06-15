/**
 * React hooks for standardized error handling in components
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/UseToast';
import {
  handleError,
  toClientError,
  isRetryableError,
  isArcadiaError,
  ErrorCode,
  type ArcadiaError,
} from '@/lib/error-handler';
import { logger, type LogContext } from '@/lib/logger';

interface UseErrorHandlerOptions {
  component?: string;
  feature?: string;
  showToast?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

interface ErrorState {
  error: ArcadiaError | null;
  isLoading: boolean;
  retryCount: number;
}

interface UseErrorHandlerReturn {
  error: ArcadiaError | null;
  isLoading: boolean;
  retryCount: number;
  handleError: (error: unknown, context?: Partial<LogContext>) => void;
  clearError: () => void;
  retry: (() => void) | null;
  executeWithErrorHandling: <T>(
    asyncFn: () => Promise<T>,
    context?: Partial<LogContext>
  ) => Promise<T | null>;
}

/**
 * Main error handling hook for React components
 */
export function useErrorHandler(
  options: UseErrorHandlerOptions = {}
): UseErrorHandlerReturn {
  const {
    component,
    feature,
    showToast: enableToast = true,
    autoRetry = false,
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  const { showToast } = useToast();
  const [state, setState] = useState<ErrorState>({
    error: null,
    isLoading: false,
    retryCount: 0,
  });

  const [lastFailedAction, setLastFailedAction] = useState<
    (() => Promise<void>) | null
  >(null);

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (autoRetryTimeoutRef.current) {
        clearTimeout(autoRetryTimeoutRef.current);
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null, retryCount: 0 }));
    setLastFailedAction(null);
  }, []);

  const handleErrorInternal = useCallback(
    (error: unknown, context?: Partial<LogContext>) => {
      const logContext: LogContext = {
        component,
        feature,
        ...context,
        metadata: {
          ...context?.metadata,
          retryCount: state.retryCount,
        },
      };

      const arcadiaError = handleError(error, logContext);

      setState(prev => ({
        ...prev,
        error: arcadiaError,
        isLoading: false,
      }));

      // Show toast notification if enabled
      if (enableToast) {
        const clientError = toClientError(arcadiaError);
        showToast({
          title: getErrorTitle(arcadiaError.code),
          description: clientError.message,
          variant: 'destructive',
        });
      }

      // Log component error
      logger.error(
        `Component error in ${component || 'unknown'}`,
        arcadiaError,
        logContext
      );
    },
    [component, feature, state.retryCount, enableToast, showToast]
  );

  const retry = useCallback(() => {
    if (!lastFailedAction || !state.error || !isRetryableError(state.error)) {
      return;
    }

    if (state.retryCount >= maxRetries) {
      logger.warn(`Max retries (${maxRetries}) reached for ${component}`, {
        component,
        feature,
        metadata: { errorCode: state.error.code },
      });
      return;
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      retryCount: prev.retryCount + 1,
    }));

    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    // Retry with exponential backoff
    const delay = retryDelay * Math.pow(2, state.retryCount);
    retryTimeoutRef.current = setTimeout(() => {
      lastFailedAction()
        .then(() => {
          setState(prev => ({ ...prev, isLoading: false }));
          setLastFailedAction(null);
          retryTimeoutRef.current = null;
        })
        .catch(error => {
          handleErrorInternal(error, {
            metadata: { isRetry: true, retryAttempt: state.retryCount + 1 },
          });
          retryTimeoutRef.current = null;
        });
    }, delay);
  }, [
    lastFailedAction,
    state.error,
    state.retryCount,
    maxRetries,
    retryDelay,
    component,
    feature,
    handleErrorInternal,
  ]);

  const executeWithErrorHandling = useCallback(
    async function <T>(
      asyncFn: () => Promise<T>,
      context?: Partial<LogContext>
    ): Promise<T | null> {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        const result = await asyncFn();

        setState(prev => ({ ...prev, isLoading: false }));

        return result;
      } catch (error) {
        // Store the failed action for potential retry
        setLastFailedAction(() => async () => {
          await asyncFn();
        });

        handleErrorInternal(error, context);

        // Auto retry if enabled and error is retryable
        if (
          autoRetry &&
          isRetryableError(error) &&
          state.retryCount < maxRetries
        ) {
          // Clear any existing auto-retry timeout
          if (autoRetryTimeoutRef.current) {
            clearTimeout(autoRetryTimeoutRef.current);
          }
          autoRetryTimeoutRef.current = setTimeout(() => {
            retry();
            autoRetryTimeoutRef.current = null;
          }, retryDelay);
        }

        return null;
      }
    },
    [
      autoRetry,
      maxRetries,
      retryDelay,
      state.retryCount,
      retry,
      handleErrorInternal,
    ]
  );

  return {
    error: state.error,
    isLoading: state.isLoading,
    retryCount: state.retryCount,
    handleError: handleErrorInternal,
    clearError,
    retry:
      lastFailedAction && state.error && isRetryableError(state.error)
        ? retry
        : null,
    executeWithErrorHandling,
  };
}

/**
 * Hook for API error handling with automatic retry logic
 */
export function useApiErrorHandler(options: UseErrorHandlerOptions = {}) {
  const errorHandler = useErrorHandler(options);

  const executeApiCall = useCallback(
    async function <T>(
      apiCall: () => Promise<T>,
      context?: Partial<LogContext>
    ): Promise<T | null> {
      return errorHandler.executeWithErrorHandling(apiCall, {
        ...context,
        metadata: {
          ...context?.metadata,
          apiCall: true,
        },
      });
    },
    [errorHandler]
  );

  return {
    ...errorHandler,
    executeApiCall,
  };
}

/**
 * Hook for form error handling
 */
export function useFormErrorHandler(formName: string) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const errorHandler = useErrorHandler({
    component: 'Form',
    feature: formName,
    showToast: true,
  });

  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: message }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const handleFormError = useCallback(
    (error: unknown, field?: string) => {
      if (
        isArcadiaError(error) &&
        error.code === ErrorCode.VALIDATION_ERROR &&
        field
      ) {
        setFieldError(field, error.userMessage);
      } else {
        errorHandler.handleError(error, {
          metadata: { formName, field },
        });
      }
    },
    [errorHandler, formName, setFieldError]
  );

  return {
    ...errorHandler,
    fieldErrors,
    setFieldError,
    clearFieldError,
    clearAllFieldErrors,
    handleFormError,
  };
}

/**
 * Hook for game-specific error handling
 */
export function useGameErrorHandler(_gameContext: {
  boardId?: string;
  sessionId?: string;
  userId?: string;
}) {
  return useErrorHandler({
    component: 'Game',
    feature: 'BingoGame',
    showToast: true,
    autoRetry: true,
    maxRetries: 2,
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function getErrorTitle(code: ErrorCode): string {
  const titles: Record<ErrorCode, string> = {
    [ErrorCode.UNAUTHORIZED]: 'Authentication Required',
    [ErrorCode.FORBIDDEN]: 'Access Denied',
    [ErrorCode.TOKEN_EXPIRED]: 'Session Expired',
    [ErrorCode.INVALID_CREDENTIALS]: 'Login Failed',
    [ErrorCode.VALIDATION_ERROR]: 'Validation Error',
    [ErrorCode.INVALID_INPUT]: 'Invalid Input',
    [ErrorCode.MISSING_REQUIRED_FIELD]: 'Missing Information',
    [ErrorCode.DATABASE_ERROR]: 'Database Error',
    [ErrorCode.RECORD_NOT_FOUND]: 'Not Found',
    [ErrorCode.DUPLICATE_RECORD]: 'Already Exists',
    [ErrorCode.FOREIGN_KEY_VIOLATION]: 'Related Data Exists',
    [ErrorCode.BINGO_BOARD_FULL]: 'Board Full',
    [ErrorCode.SESSION_ALREADY_STARTED]: 'Session Started',
    [ErrorCode.INVALID_GAME_STATE]: 'Game State Error',
    [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'Insufficient Permissions',
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too Many Requests',
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'Service Unavailable',
    [ErrorCode.NETWORK_ERROR]: 'Network Error',
    [ErrorCode.INTERNAL_SERVER_ERROR]: 'Server Error',
    [ErrorCode.NOT_IMPLEMENTED]: 'Not Implemented',
    [ErrorCode.MAINTENANCE_MODE]: 'Maintenance',
    [ErrorCode.CLIENT_ERROR]: 'Client Error',
    [ErrorCode.TIMEOUT_ERROR]: 'Request Timeout',
  };

  return titles[code] || 'Error';
}

/**
 * Higher-order component for wrapping components with error handling
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorHandlerOptions?: UseErrorHandlerOptions
) {
  return function WrappedComponent(props: P) {
    const errorHandler = useErrorHandler(errorHandlerOptions);

    if (errorHandler.error) {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 p-8">
          <h2 className="text-xl font-bold text-red-500">
            {getErrorTitle(errorHandler.error.code)}
          </h2>
          <p className="text-gray-600">{errorHandler.error.userMessage}</p>
          {errorHandler.retry && (
            <button
              onClick={errorHandler.retry}
              className="rounded bg-cyan-500 px-4 py-2 text-gray-900 hover:bg-cyan-600"
              disabled={errorHandler.isLoading}
            >
              {errorHandler.isLoading ? 'Retrying...' : 'Try Again'}
            </button>
          )}
          <button
            onClick={errorHandler.clearError}
            className="text-gray-500 hover:text-gray-700"
          >
            Dismiss
          </button>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
