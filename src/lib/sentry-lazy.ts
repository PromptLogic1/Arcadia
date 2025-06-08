/**
 * Lazy-loaded Sentry wrapper for optimal bundle size
 *
 * This module provides a lazy-loading mechanism for Sentry SDK to reduce
 * initial bundle size. The Sentry SDK and especially the Replay integration
 * are loaded only when needed.
 */

import { log } from '@/lib/logger';

// Type definitions for lazy-loaded Sentry
interface SentryModule {
  init: (options: Record<string, unknown>) => void;
  captureException: (error: unknown) => void;
  captureMessage: (
    message: string,
    level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug'
  ) => void;
  setUser: (
    user: {
      id?: string;
      username?: string;
      email?: string;
      [key: string]: unknown;
    } | null
  ) => void;
  setTag: (key: string, value: string) => void;
  setContext: (key: string, context: Record<string, unknown> | null) => void;
  addBreadcrumb: (breadcrumb: {
    message?: string;
    level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';
    category?: string;
    type?: string;
    data?: Record<string, unknown>;
    timestamp?: number;
  }) => void;
  getClient: () =>
    | {
        getIntegrationByName?: (name: string) => unknown;
        addIntegration?: (integration: unknown) => void;
      }
    | undefined;
  replayIntegration: (options?: Record<string, unknown>) => unknown;
  browserTracingIntegration: (options?: Record<string, unknown>) => unknown;
  withScope: (
    callback: (scope: { setTag: (key: string, value: string) => void }) => void
  ) => void;
  configureScope: (
    callback: (scope: { setTag: (key: string, value: string) => void }) => void
  ) => void;
}

// Lazy-loaded Sentry instance
let sentryModule: SentryModule | null = null;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

/**
 * Load Sentry SDK dynamically
 */
async function loadSentry(): Promise<void> {
  if (sentryModule) return;
  if (loadPromise) return loadPromise;

  isLoading = true;

  loadPromise = (async () => {
    try {
      log.info('Loading Sentry SDK...', { component: 'sentry-lazy' });

      const Sentry = await import('@sentry/nextjs');
      sentryModule = Sentry as unknown as SentryModule;

      log.info('Sentry SDK loaded successfully', { component: 'sentry-lazy' });
    } catch (error) {
      log.error(
        'Failed to load Sentry SDK',
        error instanceof Error ? error : new Error('Failed to load Sentry SDK'),
        {
          component: 'sentry-lazy',
        }
      );
      throw error;
    } finally {
      isLoading = false;
    }
  })();

  return loadPromise;
}

/**
 * Initialize Sentry with configuration
 */
export async function initSentry(
  config: Record<string, unknown>
): Promise<void> {
  await loadSentry();
  if (!sentryModule) return;

  sentryModule.init(config);
}

/**
 * Load and add Replay integration to existing Sentry client
 */
export async function enableReplay(
  options?: Record<string, unknown>
): Promise<void> {
  await loadSentry();
  if (!sentryModule) return;

  const client = sentryModule.getClient();
  if (!client) {
    log.warn('Sentry client not initialized', { component: 'sentry-lazy' });
    return;
  }

  // Check if replay is already enabled
  const existingReplay = client.getIntegrationByName?.('Replay');
  if (existingReplay) {
    log.info('Replay integration already enabled', {
      component: 'sentry-lazy',
    });
    return;
  }

  try {
    log.info('Loading Replay integration...', { component: 'sentry-lazy' });

    const replayIntegration = sentryModule.replayIntegration(options);
    client.addIntegration?.(replayIntegration);

    log.info('Replay integration enabled successfully', {
      component: 'sentry-lazy',
    });
  } catch (error) {
    log.error(
      'Failed to enable Replay integration',
      error instanceof Error
        ? error
        : new Error('Failed to enable Replay integration'),
      {
        component: 'sentry-lazy',
      }
    );
  }
}

/**
 * Capture exception with lazy-loaded Sentry
 */
export async function captureException(error: unknown): Promise<void> {
  // For critical errors, ensure Sentry is loaded
  if (!sentryModule && !isLoading) {
    await loadSentry();
  }

  if (sentryModule) {
    sentryModule.captureException(error);
  } else {
    // Fallback to console if Sentry isn't available
    console.error('Sentry not loaded, logging error to console:', error);
  }
}

/**
 * Capture message with lazy-loaded Sentry
 */
export async function captureMessage(
  message: string,
  level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug'
): Promise<void> {
  if (!sentryModule && !isLoading) {
    await loadSentry();
  }

  if (sentryModule) {
    sentryModule.captureMessage(message, level);
  }
}

/**
 * Set user context
 */
export async function setUser(
  user: {
    id?: string;
    username?: string;
    email?: string;
    [key: string]: unknown;
  } | null
): Promise<void> {
  if (!sentryModule && !isLoading) {
    await loadSentry();
  }

  if (sentryModule) {
    sentryModule.setUser(user);
  }
}

/**
 * Add breadcrumb
 */
export async function addBreadcrumb(breadcrumb: {
  message?: string;
  level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';
  category?: string;
  type?: string;
  data?: Record<string, unknown>;
  timestamp?: number;
}): Promise<void> {
  if (!sentryModule && !isLoading) {
    await loadSentry();
  }

  if (sentryModule) {
    sentryModule.addBreadcrumb(breadcrumb);
  }
}

/**
 * Check if Sentry is loaded
 */
export function isSentryLoaded(): boolean {
  return sentryModule !== null;
}

/**
 * Get Sentry client (if loaded)
 */
export function getSentryClient(): ReturnType<SentryModule['getClient']> {
  return sentryModule?.getClient();
}
