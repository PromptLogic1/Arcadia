'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Loader2 } from 'lucide-react';
import { useSentryReplayWithConsent } from '@/hooks/useSentryReplay';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Toggle component for enabling/disabling Sentry Session Replay
 *
 * This component demonstrates how to lazy-load the Sentry Replay feature
 * only when the user explicitly enables it, saving ~80-100kB in initial bundle size.
 */
export function SentryReplayToggle() {
  const { isEnabled, isLoading, enable, hasConsent } =
    useSentryReplayWithConsent();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={enable}
            disabled={isEnabled || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEnabled ? (
              <Video className="h-4 w-4 text-green-500" />
            ) : (
              <VideoOff className="h-4 w-4 text-gray-400" />
            )}
            <span className="sr-only">
              {isEnabled ? 'Session replay enabled' : 'Enable session replay'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            {isEnabled
              ? 'Session replay is active'
              : 'Enable session replay to help us improve your experience'}
          </p>
          {!hasConsent && !isEnabled && (
            <p className="mt-1 text-xs text-gray-400">
              Requires consent to record sessions
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Settings page component for Sentry Replay preferences
 */
export function SentryReplaySettings() {
  const { isEnabled, isLoading, enable } = useSentryReplayWithConsent();

  const handleToggle = async () => {
    if (!isEnabled && !isLoading) {
      await enable();
    } else {
      // To disable, we need to reload the page as Sentry doesn't support
      // disabling Replay once it's enabled
      localStorage.setItem('sentry-replay-consent', 'false');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-4 rounded-lg border p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Session Replay</h3>
          <p className="text-sm text-gray-500">
            Help us improve your experience by recording your sessions when
            errors occur
          </p>
        </div>
        <Button
          variant={isEnabled ? 'destructive' : 'default'}
          size="sm"
          onClick={handleToggle}
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEnabled ? 'Disable' : 'Enable'}
        </Button>
      </div>

      <div className="space-y-1 text-xs text-gray-400">
        <p>• Sessions are recorded only when errors occur</p>
        <p>• All text content is masked for privacy</p>
        <p>• You can disable this feature at any time</p>
        <p>• Saves ~100kB of bandwidth when disabled</p>
      </div>
    </div>
  );
}
