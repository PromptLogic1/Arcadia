import { createServerComponentClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/database-generated';
import { RateLimiter } from '@/lib/rate-limiter';
import { log } from '@/lib/logger';

const rateLimiter = new RateLimiter();

interface JoinSessionRequest {
  sessionId: string;
  displayName: string;
  color: string;
  team?: number | null;
}

interface PlayerUpdatesForLog {
  display_name?: string;
  color?: string;
  team?: number | null;
}

interface PatchPlayerRequest {
  sessionId: string;
  displayName?: string;
  color?: string;
  team?: number | null;
}

export async function POST(request: Request): Promise<NextResponse> {
  let userIdForLog: string | undefined;
  let sessionIdForLog: string | undefined;
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

    if (authError || !user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as JoinSessionRequest;
    const { sessionId, displayName, color, team } = body;
    sessionIdForLog = sessionId;

    // Validate display name
    if (!displayName || displayName.length < 3 || displayName.length > 20) {
      return NextResponse.json(
        { error: 'Display name must be between 3 and 20 characters' },
        { status: 400 }
      );
    }

    // Check if session exists and is active
    const { data: session, error: sessionError } = await supabase
      .from('bingo_sessions')
      .select('status')
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

    // Check if player already exists in session
    const { data: existingPlayer } = await supabase
      .from('bingo_session_players')
      .select()
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (existingPlayer) {
      return NextResponse.json(
        { error: 'Player already in session' },
        { status: 409 }
      );
    }

    // Check if color is already taken
    const { data: colorCheck } = await supabase
      .from('bingo_session_players')
      .select('color')
      .eq('session_id', sessionId)
      .eq('color', color)
      .single();

    if (colorCheck) {
      return NextResponse.json(
        { error: 'Color already taken' },
        { status: 409 }
      );
    }

    // Add player directly to session
    const { data: player, error: playerError } = await supabase
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

    if (playerError) {
      log.error('Error adding player to session', playerError, {
        metadata: {
          apiRoute: 'bingo/sessions/players',
          method: 'POST',
          userId: userIdForLog,
          sessionId: sessionIdForLog,
          displayName,
          color,
          team,
        },
      });
      return NextResponse.json({ error: playerError.message }, { status: 500 });
    }

    return NextResponse.json(player);
  } catch (error) {
    log.error(
      'Unhandled error in POST /api/bingo/sessions/players (join session)',
      error as Error,
      {
        metadata: {
          apiRoute: 'bingo/sessions/players',
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

export async function PATCH(request: Request): Promise<NextResponse> {
  let userIdForLog: string | undefined;
  let playerIdForLog: string | undefined;
  let updatesForLog: PlayerUpdatesForLog = {};
  try {
    const supabase = await createServerComponentClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    userIdForLog = user?.id;

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as PatchPlayerRequest;
    const { sessionId, displayName, color, team } = body;
    playerIdForLog = user?.id;

    // Prepare the update object for Supabase. This must match Supabase's expected type.
    const supabaseUpdatePayload: Database['public']['Tables']['bingo_session_players']['Update'] =
      {};
    if (displayName !== undefined)
      supabaseUpdatePayload.display_name = displayName;
    if (color !== undefined) supabaseUpdatePayload.color = color;
    if (team !== undefined) supabaseUpdatePayload.team = team ?? null;

    // For logging, we can use a slightly different structure if needed, but here it's the same.
    updatesForLog = supabaseUpdatePayload;

    // Validate display name
    if (displayName && (displayName.length < 3 || displayName.length > 20)) {
      return NextResponse.json(
        { error: 'Display name must be between 3 and 20 characters' },
        { status: 400 }
      );
    }

    // Check if color is already taken by another player
    if (color) {
      const { data: colorCheck } = await supabase
        .from('bingo_session_players')
        .select('user_id')
        .eq('session_id', sessionId)
        .eq('color', color)
        .neq('user_id', user.id)
        .single();

      if (colorCheck) {
        return NextResponse.json(
          { error: 'Color already taken' },
          { status: 409 }
        );
      }
    }

    // Update player
    const { data, error } = await supabase
      .from('bingo_session_players')
      .update(supabaseUpdatePayload)
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      log.error('Error updating player', error, {
        metadata: {
          apiRoute: 'bingo/sessions/players',
          method: 'PATCH',
          userId: userIdForLog,
          playerId: playerIdForLog,
          updates: updatesForLog,
        },
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    log.error(
      'Unhandled error in PATCH /api/bingo/sessions/players (update player)',
      error as Error,
      {
        metadata: {
          apiRoute: 'bingo/sessions/players',
          method: 'PATCH',
          userId: userIdForLog,
          playerId: playerIdForLog,
          updates: updatesForLog,
        },
      }
    );
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to update player' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  let userIdForLog: string | undefined;
  let sessionIdForLog: string | undefined;
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
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

    // Check if session is active
    const { data: session } = await supabase
      .from('bingo_sessions')
      .select('status')
      .eq('id', sessionId)
      .single();

    if (session?.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot leave completed session' },
        { status: 400 }
      );
    }

    const { error: leaveError } = await supabase
      .from('bingo_session_players')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', user.id);

    if (leaveError) throw leaveError;

    sessionIdForLog = sessionId;

    return NextResponse.json({ message: 'Successfully left session' });
  } catch (error) {
    log.error(
      'Unhandled error in DELETE /api/bingo/sessions/players (leave session)',
      error as Error,
      {
        metadata: {
          apiRoute: 'bingo/sessions/players',
          method: 'DELETE',
          userId: userIdForLog,
          sessionId: sessionIdForLog,
        },
      }
    );
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to leave session' },
      { status: 500 }
    );
  }
}
