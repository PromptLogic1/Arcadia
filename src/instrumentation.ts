export async function register() {
  // Only import instrumentation-server for nodejs runtime
  // Edge runtime doesn't need separate instrumentation
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../instrumentation-server');
  }
}

// Define the RequestInfo type that Sentry expects
type SentryRequestInfo = {
  path: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
};

// Only export onRequestError if Sentry is loaded
export const onRequestError = async (
  error: unknown,
  request: Request,
  context: { routerKind: string; routePath: string; routeType: string }
) => {
  if (
    process.env.NEXT_RUNTIME === 'nodejs' ||
    process.env.NEXT_RUNTIME === 'edge'
  ) {
    const Sentry = await import('@sentry/nextjs');
    // Create RequestInfo object with required properties
    const requestInfo: SentryRequestInfo = {
      path: new URL(request.url).pathname,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
    };
    return Sentry.captureRequestError(error, requestInfo, context);
  }
};
