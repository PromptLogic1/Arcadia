import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  withRateLimit,
  RATE_LIMIT_CONFIGS,
} from '@/lib/rate-limiter-middleware';
import { log } from '@/lib/logger';
import { sessionsService } from '@/services/sessions.service';
import { authService } from '@/services/auth.service';
import { validateRequestBody } from '@/lib/validation/middleware';
import { joinSessionRequestSchema } from '@/lib/validation/schemas/sessions';
import { toError, getErrorMessage } from '@/lib/error-guards';

export const POST = withRateLimit(
  async (request: NextRequest): Promise<NextResponse> => {
    let userIdForLog: string | undefined;
    let sessionIdForLog: string | undefined;

    try {
      const authResult = await authService.getCurrentUser();
      if (!authResult.success || !authResult.data) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const user = authResult.data;
      userIdForLog = user.id;

      const validation = await validateRequestBody(
        request,
        joinSessionRequestSchema
      );
      if (!validation.success) {
        return validation.error;
      }

      const { sessionId, displayName, color, team, password } = validation.data;
      sessionIdForLog = sessionId;

      // Use the service to join the session
      const result = await sessionsService.joinSessionById(sessionId, user.id, {
        display_name: displayName,
        color,
        team,
        password,
      });

      if (!result.success) {
        // Map specific error messages to appropriate HTTP status codes
        let status = 400;
        const errorMessage = result.error || 'Failed to join session';
        if (errorMessage === 'Session not found or has already started.') {
          status = 404;
        } else if (errorMessage === 'Already in session') {
          status = 409;
        }

        return NextResponse.json({ error: errorMessage }, { status });
      }

      if (!result.data) {
        return NextResponse.json(
          { error: 'Failed to join session' },
          { status: 500 }
        );
      }

      return NextResponse.json(result.data.player);
    } catch (error) {
      log.error(
        'Unhandled error in POST /api/bingo/sessions/join',
        toError(error),
        {
          metadata: {
            apiRoute: 'bingo/sessions/join',
            method: 'POST',
            userId: userIdForLog,
            sessionId: sessionIdForLog,
          },
        }
      );
      return NextResponse.json(
        { error: getErrorMessage(error) || 'Failed to join session' },
        { status: 500 }
      );
    }
  },
  RATE_LIMIT_CONFIGS.gameAction
);
