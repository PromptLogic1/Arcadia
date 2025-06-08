/**
 * Hook for lazy-loading Sentry Replay integration
 *
 * This hook enables the Sentry Replay feature on demand, reducing
 * initial bundle size by ~80-100kB.
 */

import { useEffect, useState, useCallback } from 'react';
import { enableReplay, isSentryLoaded } from '@/lib/sentry-lazy';
import { log } from '@/lib/logger';

interface UseSentryReplayOptions {
  /**
   * Whether to enable replay immediately when the hook mounts
   */
  enableOnMount?: boolean;

  /**
   * Options to pass to the Replay integration
   */
  replayOptions?: {
    maskAllText?: boolean;
    blockAllMedia?: boolean;
    sampleRate?: number;
    errorSampleRate?: number;
    networkDetailAllowUrls?: string[];
    networkDetailDenyUrls?: string[];
    networkCaptureBodies?: boolean;
    networkRequestHeaders?: string[];
    networkResponseHeaders?: string[];
    mask?: string[];
    unmask?: string[];
    block?: string[];
    unblock?: string[];
    ignore?: string[];
    maskTextFn?: (text: string) => string;
    beforeAddRecordingEvent?: (event: unknown) => unknown | null;
  };

  /**
   * Callback when replay is successfully enabled
   */
  onSuccess?: () => void;

  /**
   * Callback when replay fails to enable
   */
  onError?: (error: Error) => void;
}

interface UseSentryReplayReturn {
  /**
   * Whether the Replay integration is currently loading
   */
  isLoading: boolean;

  /**
   * Whether the Replay integration is enabled
   */
  isEnabled: boolean;

  /**
   * Error that occurred during loading (if any)
   */
  error: Error | null;

  /**
   * Manually enable the Replay integration
   */
  enable: () => Promise<void>;
}

/**
 * Hook for lazy-loading Sentry Replay integration
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { enable, isEnabled, isLoading } = useSentryReplay({
 *     enableOnMount: false,
 *     replayOptions: {
 *       maskAllText: true,
 *       blockAllMedia: true
 *     }
 *   });
 *
 *   return (
 *     <button onClick={enable} disabled={isEnabled || isLoading}>
 *       {isEnabled ? 'Replay Enabled' : 'Enable Session Replay'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useSentryReplay({
  enableOnMount = false,
  replayOptions = {},
  onSuccess,
  onError,
}: UseSentryReplayOptions = {}): UseSentryReplayReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const enable = useCallback(async () => {
    if (isEnabled || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      await enableReplay(replayOptions);
      setIsEnabled(true);

      log.info('Sentry Replay enabled via hook', {
        component: 'useSentryReplay',
        metadata: { replayOptions },
      });

      onSuccess?.();
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error('Failed to enable Sentry Replay');
      setError(error);

      log.error('Failed to enable Sentry Replay', error, {
        component: 'useSentryReplay',
      });

      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [isEnabled, isLoading, replayOptions, onSuccess, onError]);

  // Check if Sentry is already loaded and Replay is enabled
  useEffect(() => {
    if (isSentryLoaded()) {
      // Import getSentryClient from our lazy module
      import('@/lib/sentry-lazy').then(({ getSentryClient }) => {
        const client = getSentryClient();
        if (client?.getIntegrationByName?.('Replay')) {
          setIsEnabled(true);
        }
      });
    }
  }, []);

  // Enable on mount if requested
  useEffect(() => {
    if (enableOnMount && !isEnabled && !isLoading) {
      enable();
    }
  }, [enableOnMount, isEnabled, isLoading, enable]);

  return {
    isLoading,
    isEnabled,
    error,
    enable,
  };
}

/**
 * Hook for enabling Sentry Replay based on user preferences
 *
 * This hook checks for user consent or preferences before enabling
 * the Replay integration.
 */
export function useSentryReplayWithConsent() {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    // Check for user consent from localStorage or cookies
    const consent = localStorage.getItem('sentry-replay-consent');
    setHasConsent(consent === 'true');
  }, []);

  const replayControls = useSentryReplay({
    enableOnMount: hasConsent,
    replayOptions: {
      maskAllText: true,
      blockAllMedia: true,
      // Only capture 10% of sessions to reduce costs
      sampleRate: 0.1,
      // Capture all sessions with errors
      errorSampleRate: 1.0,
    },
  });

  const enableWithConsent = useCallback(async () => {
    localStorage.setItem('sentry-replay-consent', 'true');
    setHasConsent(true);
    await replayControls.enable();
  }, [replayControls]);

  return {
    ...replayControls,
    hasConsent,
    enable: enableWithConsent,
  };
}
