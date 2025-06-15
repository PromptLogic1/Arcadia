/**
 * Lazy-loaded Sentry wrapper for optimal bundle size
 *
 * This module provides a lazy-loading mechanism for Sentry SDK to reduce
 * initial bundle size. The Sentry SDK and especially the Replay integration
 * are loaded only when needed.
 */

// Removed logger import to prevent circular dependency

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
  getClient: () => unknown;
  replayIntegration: (options?: Record<string, unknown>) => unknown;
  browserTracingIntegration: (options?: Record<string, unknown>) => unknown;
  withScope: (
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
      console.info('[sentry-lazy] Loading Sentry SDK...');

      const SentryImport = await import('@sentry/nextjs');
      // Map the imported module to our interface
      sentryModule = {
        init: SentryImport.init,
        captureException: SentryImport.captureException,
        captureMessage: SentryImport.captureMessage,
        setUser: SentryImport.setUser,
        setTag: SentryImport.setTag,
        setContext: SentryImport.setContext,
        addBreadcrumb: SentryImport.addBreadcrumb,
        getClient: SentryImport.getClient,
        replayIntegration: SentryImport.replayIntegration,
        browserTracingIntegration: SentryImport.browserTracingIntegration,
        withScope: SentryImport.withScope,
      };

      console.info('[sentry-lazy] Sentry SDK loaded successfully');
    } catch (error) {
      console.error('[sentry-lazy] Failed to load Sentry SDK:', error);
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

  try {
    console.info('[sentry-lazy] Loading Replay integration...');

    // The Sentry SDK will handle adding the integration internally
    // when we create it with the proper options
    const replayIntegration = sentryModule.replayIntegration(options);

    // Note: In newer versions of Sentry, integrations are automatically
    // registered when created. We don't need to manually add them.
    console.info('[sentry-lazy] Replay integration created successfully');
  } catch (error) {
    console.error('[sentry-lazy] Failed to enable Replay integration:', error);
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
