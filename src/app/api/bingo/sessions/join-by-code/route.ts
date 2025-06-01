import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';
import type { Database } from '@/types/database-generated';

interface JoinByCodeRequest {
  session_code: string;
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    const body = (await request.json()) as JoinByCodeRequest;
    const { session_code, user_id, display_name, avatar_url } = body;

    // Validate required fields
    if (!session_code || !user_id || !display_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find session by code
    const { data: session, error: sessionError } = await supabase
      .from('bingo_sessions')
      .select('*')
      .eq('session_code', session_code.toUpperCase())
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Session already started' },
        { status: 400 }
      );
    }

    // Check if user already in session
    const { data: existingPlayer } = await supabase
      .from('bingo_session_players')
      .select('*')
      .eq('session_id', session.id)
      .eq('user_id', user_id)
      .single();

    if (existingPlayer) {
      return NextResponse.json({ session, player: existingPlayer });
    }

    // Check max players
    const { count: playerCount } = await supabase
      .from('bingo_session_players')
      .select('*', { count: 'exact' })
      .eq('session_id', session.id);

    const maxPlayers = session.settings?.max_players || 50;
    if ((playerCount || 0) >= maxPlayers) {
      return NextResponse.json({ error: 'Session is full' }, { status: 400 });
    }

    // Add player to session
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
      '#DDA0DD',
    ] as const;
    const playerColor = colors[(playerCount || 0) % colors.length] || colors[0];

    const playerInsert: Database['public']['Tables']['bingo_session_players']['Insert'] =
      {
        session_id: session.id,
        user_id: user_id,
        display_name: display_name,
        avatar_url: avatar_url ?? null,
        color: playerColor,
        team: null,
        score: 0,
      };

    const { data: newPlayer, error: playerError } = await supabase
      .from('bingo_session_players')
      .insert(playerInsert)
      .select()
      .single();

    if (playerError) {
      return NextResponse.json({ error: playerError.message }, { status: 400 });
    }

    return NextResponse.json({ session, player: newPlayer });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
