export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../instrumentation-server');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../instrumentation-server');
  }
}

// Only export onRequestError if Sentry is loaded
export const onRequestError = async (
  error: unknown,
  request: Request,
  context: { routerKind: string; routePath: string; routeType: string }
) => {
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs');
    // Create RequestInfo object with required properties
    const requestInfo = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      path: new URL(request.url).pathname,
    };
    return Sentry.captureRequestError(error, requestInfo as any, context);
  }
};
