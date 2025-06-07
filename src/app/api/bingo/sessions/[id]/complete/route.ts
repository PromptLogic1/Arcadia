import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/rate-limiter';
import { log } from '@/lib/logger';
import { gameStateService } from '@/services/game-state.service';
import { validateRequestBody } from '@/lib/validation/middleware';
import { completeSessionRequestSchema } from '@/lib/validation/schemas/sessions';
import { sessionsService } from '@/services/sessions.service';
import { authService } from '@/services/auth.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let sessionId: string | undefined;

  try {
    sessionId = params.id;
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = await rateLimiter.check(request, 10, ip);
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    }

    const playersResponse = await sessionsService.getSessionPlayers(sessionId);
    if (!playersResponse.success || !playersResponse.data) {
      return new Response(
        JSON.stringify({
          error: playersResponse.error || 'Failed to get players',
        }),
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
    log.error('Error completing bingo session', error as Error, {
      metadata: {
        apiRoute: 'bingo/sessions/[id]/complete',
        method: 'POST',
        sessionId,
      },
    });
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to complete session' },
      { status: 500 }
    );
  }
}
