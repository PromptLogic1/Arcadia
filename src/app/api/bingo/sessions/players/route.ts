import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sessionsService } from '@/services/sessions.service';
import { authService } from '@/services/auth.service';
import {
  withRateLimit,
  RATE_LIMIT_CONFIGS,
} from '@/lib/rate-limiter-middleware';
import {
  validateRequestBody,
  validateQueryParams,
} from '@/lib/validation/middleware';
import {
  joinSessionRequestSchema,
  updatePlayerRequestSchema,
  leaveSessionRequestSchema,
} from '@/lib/validation/schemas/sessions';

export const POST = withRateLimit(
  async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await authService.getCurrentUser();
    if (!authResult.success || !authResult.data) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = authResult.data;

    const validation = await validateRequestBody(
      request,
      joinSessionRequestSchema
    );
    if (!validation.success) {
      return validation.error;
    }

    const { sessionId, displayName, color, team } = validation.data;

    const result = await sessionsService.joinSession({
      session_id: sessionId,
      user_id: user.id,
      display_name: displayName,
      color,
      team,
    });

    if (!result.success) {
      const errorMessage = result.error || 'An unknown error occurred';
      const status = errorMessage.includes('not found')
        ? 404
        : errorMessage.includes('already')
          ? 409
          : 400;
      return NextResponse.json({ error: errorMessage }, { status });
    }

    return NextResponse.json(result.data);
  },
  RATE_LIMIT_CONFIGS.gameAction
);

export const PATCH = withRateLimit(
  async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await authService.getCurrentUser();
    if (!authResult.success || !authResult.data) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = authResult.data;

    const validation = await validateRequestBody(
      request,
      updatePlayerRequestSchema
    );
    if (!validation.success) {
      return validation.error;
    }

    const { sessionId, ...updates } = validation.data;

    const result = await sessionsService.updatePlayer(
      sessionId,
      user.id,
      updates
    );

    if (!result.success) {
      const errorMessage = result.error || 'An unknown error occurred';
      const status = errorMessage.includes('taken') ? 409 : 400;
      return NextResponse.json({ error: errorMessage }, { status });
    }

    return NextResponse.json(result.data);
  },
  RATE_LIMIT_CONFIGS.gameAction
);

export const DELETE = withRateLimit(
  async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await authService.getCurrentUser();
    if (!authResult.success || !authResult.data) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = authResult.data;

    const { searchParams } = new URL(request.url);
    const validation = validateQueryParams(
      searchParams,
      leaveSessionRequestSchema
    );
    if (!validation.success) {
      return validation.error;
    }

    const { sessionId } = validation.data;
    const result = await sessionsService.leaveSession(sessionId, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return new NextResponse(null, { status: 204 });
  },
  RATE_LIMIT_CONFIGS.gameAction
);
