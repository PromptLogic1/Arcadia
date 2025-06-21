import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import {
  withRateLimit,
  RATE_LIMIT_CONFIGS,
} from '@/lib/rate-limiter-middleware';
import { joinByCodeRequestSchema } from '@/lib/validation/schemas/sessions';
import {
  validateRequestBody,
  isValidationError,
} from '@/lib/validation/middleware';
import { sessionsService } from '@/services/sessions.service';
import { userService } from '@/services/user.service';
import { toError, getErrorMessage } from '@/lib/error-guards';

export const POST = withRateLimit(
  async (request: NextRequest): Promise<NextResponse> => {
    let userIdForLog: string | undefined;
    let sessionCodeForLog: string | undefined;

    try {
      const supabase = await createServerComponentClient();

      // Get authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      userIdForLog = user?.id;

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Validate request body with Zod
      const validation = await validateRequestBody(
        request,
        joinByCodeRequestSchema,
        {
          apiRoute: 'bingo/sessions/join-by-code',
          method: 'POST',
          userId: user.id,
        }
      );

      if (isValidationError(validation)) {
        return validation.error;
      }

      // Note: The schema expects userId in the body, but we use the authenticated user's ID
      const { sessionCode, password, displayName, color, team } =
        validation.data;
      sessionCodeForLog = sessionCode;

      // Get user profile for display name fallback
      const profileResult = await userService.getUserProfile(user.id);
      const playerDisplayName =
        displayName || profileResult.data?.username || 'Anonymous';
      const playerColor = color || '#3B82F6'; // Default blue

      // Join session using service
      const result = await sessionsService.joinSessionByCode(
        sessionCode,
        user.id,
        {
          display_name: playerDisplayName,
          color: playerColor,
          team: team ?? null,
          password,
        }
      );

      if (result.error) {
        const statusCode =
          result.error === 'Session not found'
            ? 404
            : result.error === 'Incorrect password'
              ? 401
              : result.error === 'Session is full' ||
                  result.error === 'Session is no longer accepting players'
                ? 400
                : 500;

        return NextResponse.json(
          { error: result.error },
          { status: statusCode }
        );
      }

      return NextResponse.json({
        sessionId: result.session?.id,
        session: result.session,
        player: result.player,
      });
    } catch (error) {
      log.error('Error joining session by code', toError(error), {
        metadata: {
          apiRoute: 'bingo/sessions/join-by-code',
          method: 'POST',
          userId: userIdForLog,
          sessionCode: sessionCodeForLog,
        },
      });
      return NextResponse.json(
        { error: getErrorMessage(error) || 'Failed to join session' },
        { status: 500 }
      );
    }
  },
  RATE_LIMIT_CONFIGS.gameAction
);
