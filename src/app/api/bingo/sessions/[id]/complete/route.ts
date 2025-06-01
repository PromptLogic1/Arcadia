import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import type { WinPattern } from '@/features/bingo-boards/types';
import type { Json } from '@/types/database-generated';

interface CompleteSessionRequest {
  winner_id: string;
  winning_patterns: WinPattern[];
  final_score: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const body: CompleteSessionRequest = await request.json();
    const { winner_id, winning_patterns, final_score } = body;

    // Verify session exists and is active
    const { data: session, error: sessionError } = await supabase
      .from('bingo_sessions')
      .select('status, started_at')
      .eq('id', params.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'active') {
      return NextResponse.json(
        { error: 'Session is not active' },
        { status: 400 }
      );
    }

    // Calculate time to win
    const timeToWin = session.started_at
      ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
      : 0;

    // Update session status
    const { data: updatedSession, error: updateError } = await supabase
      .from('bingo_sessions')
      .update({
        status: 'completed',
        winner_id,
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Log the winning event
    await supabase.from('bingo_session_events').insert({
      session_id: params.id,
      user_id: winner_id,
      event_type: 'game_won',
      event_data: {
        patterns: winning_patterns,
        final_score,
        time_to_win: timeToWin,
      } as unknown as Json,
      timestamp: Date.now(),
    });

    // Create game result entry for the winner
    await supabase.from('game_results').insert({
      session_id: params.id,
      user_id: winner_id,
      final_score,
      patterns_achieved: winning_patterns as unknown as Json,
      time_to_win: timeToWin,
      placement: 1,
      mistake_count: 0, // TODO: Track this in the game
      bonus_points: 0, // Calculated in scoring service
    });

    return NextResponse.json({
      session: updatedSession,
      winner: {
        id: winner_id,
        patterns: winning_patterns,
        score: final_score,
        timeToWin,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
