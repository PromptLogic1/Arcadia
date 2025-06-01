import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get session and verify host
    const { data: session, error: sessionError } = await supabase
      .from('bingo_sessions')
      .select('host_id, status')
      .eq('id', params.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Only host can start the session
    if (session.host_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the host can start the session' },
        { status: 403 }
      );
    }

    if (session.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Session is not in waiting state' },
        { status: 400 }
      );
    }

    // Check if there are enough players
    const { count: playerCount } = await supabase
      .from('bingo_session_players')
      .select('*', { count: 'exact' })
      .eq('session_id', params.id);

    if ((playerCount || 0) < 2) {
      return NextResponse.json(
        { error: 'Need at least 2 players to start' },
        { status: 400 }
      );
    }

    // Update session status to active
    const { data: updatedSession, error: updateError } = await supabase
      .from('bingo_sessions')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Log session start event
    await supabase.from('bingo_session_events').insert({
      session_id: params.id,
      user_id: user.id,
      event_type: 'session_started',
      event_data: { player_count: playerCount },
      timestamp: Date.now(),
    });

    return NextResponse.json(updatedSession);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
