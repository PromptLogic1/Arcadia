import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  withRateLimit,
  RATE_LIMIT_CONFIGS,
} from '@/lib/rate-limiter-middleware';
import { log } from '@/lib/logger';
import { gameStateService } from '@/services/game-state.service';
import { validateRequestBody } from '@/lib/validation/middleware';
import { completeSessionRequestSchema } from '@/lib/validation/schemas/sessions';
import { sessionsService } from '@/services/sessions.service';
import { authService } from '@/services/auth.service';
import { toError, getErrorMessage } from '@/lib/error-guards';

export const POST = withRateLimit(
  async (
    request: NextRequest,
    { params }: { params: { id: string } }
  ): Promise<NextResponse> => {
    let sessionId: string | undefined;

    try {
      sessionId = params.id;

      const validation = await validateRequestBody(
        request,
        completeSessionRequestSchema
      );
      if (!validation.success) {
        return validation.error;
      }

      const { winnerId, winning_patterns, final_score } = validation.data;

      const { data: user } = await authService.getCurrentUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const playersResponse =
        await sessionsService.getSessionPlayers(sessionId);
      if (!playersResponse.success || !playersResponse.data) {
        return NextResponse.json(
          { error: playersResponse.error || 'Failed to get players' },
          { status: 500 }
        );
      }

      const result = await gameStateService.completeGame(sessionId, {
        winner_id: winnerId,
        winning_patterns,
        final_score,
        players: playersResponse.data,
      });

      if (!result.success) {
        const status = result.error === 'Session not found' ? 404 : 400;
        return NextResponse.json({ error: result.error }, { status });
      }

      return NextResponse.json(result.data);
    } catch (error) {
      log.error('Error completing bingo session', toError(error), {
        metadata: {
          apiRoute: 'bingo/sessions/[id]/complete',
          method: 'POST',
          sessionId,
        },
      });
      return NextResponse.json(
        { error: getErrorMessage(error) || 'Failed to complete session' },
        { status: 500 }
      );
    }
  },
  RATE_LIMIT_CONFIGS.gameAction
);
