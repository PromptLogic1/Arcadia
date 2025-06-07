import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimiter } from '@/lib/rate-limiter';
import { log } from '@/lib/logger';
import { sessionsService } from '@/services/sessions.service';
import { authService } from '@/services/auth.service';
import { validateRequestBody } from '@/lib/validation/middleware';
import { joinSessionRequestSchema } from '@/lib/validation/schemas/sessions';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let userIdForLog: string | undefined;
  let sessionIdForLog: string | undefined;

  try {
    const authResult = await authService.getCurrentUser();
    if (!authResult.success || !authResult.data) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = authResult.data;
    userIdForLog = user.id;

    const rateLimitResult = await rateLimiter.check(request, 20, user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const validation = await validateRequestBody(
      request,
      joinSessionRequestSchema
    );
    if (!validation.success) {
      return validation.error;
    }

    const { sessionId, displayName, color, team } = validation.data;
    sessionIdForLog = sessionId;

    // Use the service to join the session
    const result = await sessionsService.joinSessionById(sessionId, user.id, {
      display_name: displayName,
      color,
      team,
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
      error as Error,
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
      { error: (error as Error).message || 'Failed to join session' },
      { status: 500 }
    );
  }
}
