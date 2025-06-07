import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { gameStateService } from '@/services/game-state.service';
import { sessionsService } from '@/services/sessions.service';
import { withErrorHandling } from '@/lib/error-handler';
import { rateLimiter } from '@/lib/rate-limiter';
import { log } from '@/lib/logger';
import { authService } from '@/services/auth.service';

export const POST = withErrorHandling(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    // Apply rate limiting
    const rateLimitResult = await rateLimiter.check(request, 10, params.id);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
        }
      );
    }

    // Get current user
    const { data: user, success } = await authService.getCurrentUser();

    if (!success || !user) {
      log.warn('Unauthorized attempt to start session', {
        metadata: {
          sessionId: params.id,
          apiRoute: 'bingo/sessions/[id]/start',
          method: 'POST',
        },
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the service to start the session
    const result = await gameStateService.startSession(params.id, user.id);

    if (!result.success) {
      // Map specific error messages to appropriate HTTP status codes
      const errorMessage = result.error || 'Failed to start session';
      let status = 400;

      if (errorMessage === 'Session not found') {
        status = 404;
      } else if (errorMessage === 'Only the host can start the session') {
        status = 403;
      }

      log.error('Failed to start session', new Error(errorMessage), {
        metadata: {
          sessionId: params.id,
          userId: user.id,
          apiRoute: 'bingo/sessions/[id]/start',
          method: 'POST',
        },
      });

      return NextResponse.json({ error: errorMessage }, { status });
    }

    // Get the updated session data using the service
    const sessionResult = await sessionsService.getSessionById(params.id);

    if (sessionResult.error) {
      log.error(
        'Failed to get updated session after start',
        new Error(sessionResult.error),
        {
          metadata: {
            sessionId: params.id,
            apiRoute: 'bingo/sessions/[id]/start',
            method: 'POST',
          },
        }
      );

      // Return success with minimal data since the session was started successfully
      return NextResponse.json({ id: params.id, status: 'active' });
    }

    return NextResponse.json(sessionResult.data);
  }
);
