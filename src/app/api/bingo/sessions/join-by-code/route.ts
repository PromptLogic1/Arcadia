import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import type { Database } from '@/types/database-generated';

interface JoinByCodeRequest {
  sessionCode: string;
  password?: string;
  displayName?: string;
  color?: string;
  team?: number | null;
}

export async function POST(request: NextRequest) {
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

    const body = (await request.json()) as JoinByCodeRequest;
    const { sessionCode, password, displayName, color, team } = body;
    sessionCodeForLog = sessionCode;

    // Validate required fields
    if (!sessionCode?.trim()) {
      return NextResponse.json(
        { error: 'Session code is required' },
        { status: 400 }
      );
    }

    // Get user profile for display name fallback
    const { data: profile } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single();

    const playerDisplayName = displayName || profile?.username || 'Anonymous';
    const playerColor = color || '#3B82F6'; // Default blue

    // Find session by code
    const { data: session, error: sessionError } = await supabase
      .from('bingo_sessions')
      .select('*')
      .eq('session_code', sessionCode.toUpperCase())
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Session is no longer accepting players' },
        { status: 400 }
      );
    }

    // Check password if session is password protected
    const sessionPassword = session.settings?.password;
    if (sessionPassword && sessionPassword.trim()) {
      if (!password || password.trim() !== sessionPassword.trim()) {
        return NextResponse.json(
          { error: 'Incorrect password' },
          { status: 401 }
        );
      }
    }

    // Check if user already in session
    const { data: existingPlayer } = await supabase
      .from('bingo_session_players')
      .select('*')
      .eq('session_id', session.id)
      .eq('user_id', user.id)
      .single();

    if (existingPlayer) {
      return NextResponse.json({
        sessionId: session.id,
        session,
        player: existingPlayer,
      });
    }

    // Check max players
    const { count: playerCount } = await supabase
      .from('bingo_session_players')
      .select('*', { count: 'exact' })
      .eq('session_id', session.id);

    const maxPlayers = session.settings?.max_players || 4;
    if ((playerCount || 0) >= maxPlayers) {
      return NextResponse.json({ error: 'Session is full' }, { status: 400 });
    }

    // Check if host approval is required
    if (session.settings?.require_approval) {
      // For now, we'll just join directly. In a full implementation,
      // this would add to a queue for host approval
      // TODO: Implement approval queue system
    }

    const now = new Date().toISOString();

    // Add player to session
    const playerInsert: Database['public']['Tables']['bingo_session_players']['Insert'] =
      {
        session_id: session.id,
        user_id: user.id,
        display_name: playerDisplayName,
        color: playerColor,
        team: team ?? null,
        score: 0,
        is_host: false,
        is_ready: false,
        joined_at: now,
      };

    const { data: newPlayer, error: playerError } = await supabase
      .from('bingo_session_players')
      .insert(playerInsert)
      .select()
      .single();

    if (playerError) {
      throw playerError;
    }

    return NextResponse.json({
      sessionId: session.id,
      session,
      player: newPlayer,
    });
  } catch (error) {
    log.error('Error joining session by code', error as Error, {
      metadata: {
        apiRoute: 'bingo/sessions/join-by-code',
        method: 'POST',
        userId: userIdForLog,
        sessionCode: sessionCodeForLog,
      },
    });
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to join session' },
      { status: 500 }
    );
  }
}
