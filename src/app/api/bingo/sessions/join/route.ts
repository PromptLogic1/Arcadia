import { createServerComponentClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/rate-limiter';
import { log } from '@/lib/logger';
import { sessionsService } from '@/src/services/sessions.service';

const rateLimiter = new RateLimiter();

interface JoinSessionRequest {
  sessionId: string;
  displayName: string;
  color: string;
  team?: number | null;
}

interface JoinRoutePayloadForLog {
  displayName?: string;
  color?: string;
  team?: number | null;
}

export async function POST(request: Request): Promise<NextResponse> {
  let userIdForLog: string | undefined;
  let sessionIdForLog: string | undefined;
  let joinPayloadForLog: JoinRoutePayloadForLog = {};
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (await rateLimiter.isLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createServerComponentClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    userIdForLog = user?.id;
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as JoinSessionRequest;
    const { sessionId, displayName, color, team } = body;
    sessionIdForLog = sessionId;
    joinPayloadForLog = { displayName, color, team };

    // Use the service to join the session
    const result = await sessionsService.joinSessionById(
      sessionId,
      user.id,
      {
        display_name: displayName,
        color,
        team,
      }
    );

    if (result.error) {
      // Map specific error messages to appropriate HTTP status codes
      let status = 400;
      if (result.error === 'Session not found') {
        status = 404;
      } else if (result.error === 'Already in session') {
        status = 409;
      }

      return NextResponse.json({ error: result.error }, { status });
    }

    if (!result.player) {
      log.error('No player data returned from joinSessionById', new Error('Player data missing'), {
        metadata: {
          apiRoute: 'bingo/sessions/join',
          method: 'POST',
          userId: userIdForLog,
          sessionId: sessionIdForLog,
          ...joinPayloadForLog,
        },
      });
      return NextResponse.json(
        { error: 'Failed to join session' },
        { status: 500 }
      );
    }

    return NextResponse.json(result.player);
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
          ...joinPayloadForLog,
        },
      }
    );
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to join session' },
      { status: 500 }
    );
  }
}
