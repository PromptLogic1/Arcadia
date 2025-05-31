import { createServerComponentClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/rate-limiter';
import { DEFAULT_MAX_PLAYERS } from '@/features/bingo-boards/types';
import { log } from '@/lib/logger';

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

    // Check if session exists and is active
    const { data: session, error: sessionError } = await supabase
      .from('bingo_sessions')
      .select(
        `
        *,
        players:bingo_session_players(count)
      `
      )
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Session is not accepting new players' },
        { status: 400 }
      );
    }

    // Check player limit
    const currentPlayerCount = session.players?.[0]?.count ?? 0;
    if (currentPlayerCount >= DEFAULT_MAX_PLAYERS) {
      return NextResponse.json({ error: 'Session is full' }, { status: 400 });
    }

    // Check if player is already in session
    const { data: existingPlayer } = await supabase
      .from('bingo_session_players')
      .select('user_id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (existingPlayer) {
      return NextResponse.json(
        { error: 'Already in session' },
        { status: 400 }
      );
    }

    // Add player directly (assuming this is an older or different join mechanism)
    const { data: player, error: playerInsertError } = await supabase
      .from('bingo_session_players')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        display_name: displayName,
        color,
        team: team ?? null,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (playerInsertError) {
      log.error('Error inserting player to join session', playerInsertError, {
        metadata: {
          apiRoute: 'bingo/sessions/join',
          method: 'POST',
          userId: userIdForLog,
          sessionId: sessionIdForLog,
          ...joinPayloadForLog,
        },
      });
      return NextResponse.json(
        { error: playerInsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(player);
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
