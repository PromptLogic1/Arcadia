'use client';

import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';
import { useEffect } from 'react';
import { shouldSendToSentry } from '@/lib/error-deduplication';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    // Check if error should be sent to Sentry (deduplication)
    if (!shouldSendToSentry(error)) {
      console.debug(
        'GlobalError: Error already reported to Sentry, skipping duplicate'
      );
      return;
    }

    // Only capture if not already captured by RootErrorBoundary
    // GlobalError only catches errors that escape all other boundaries
    Sentry.withScope(scope => {
      // Add tag to identify this came from GlobalError
      scope.setTag('errorBoundary', true);
      scope.setTag('errorBoundary.level', 'global');
      scope.setTag('errorBoundary.nextjs', true);

      // Add error digest if available (Next.js specific)
      if (error.digest) {
        scope.setTag('error.digest', error.digest);
        scope.setFingerprint(['global-error', error.digest]);
      } else {
        scope.setFingerprint(['global-error', error.name, error.message]);
      }

      // Add context that this is a global/unhandled error
      scope.setContext('globalError', {
        digest: error.digest,
        caught: 'global-error',
        framework: 'nextjs',
      });

      Sentry.captureException(error);
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
