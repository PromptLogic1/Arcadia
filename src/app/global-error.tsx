'use client';

import NextError from 'next/error';
import { useEffect } from 'react';
import { shouldSendToSentry } from '@/lib/error-deduplication';
import { reportError } from '@/lib/error-reporting';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    // Check if error should be sent to Sentry (deduplication)
    if (!shouldSendToSentry(error)) {
      // Error already reported to Sentry, skipping duplicate
      return;
    }

    // Only capture if not already captured by RootErrorBoundary
    // GlobalError only catches errors that escape all other boundaries
    const errorId = `global-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    reportError(error, {
      errorId,
      level: 'global',
      metadata: {
        digest: error.digest,
        caught: 'global-error',
        framework: 'nextjs',
      },
    });
  }, [error]);

  return (
    <html>
      <body>
        {/* `NextError` is the default Next.js error page component. Its type
        definition requires a `statusCode` prop. However, since the App Router
        does not expose status codes for errors, we simply pass 0 to render a
        generic error message. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
