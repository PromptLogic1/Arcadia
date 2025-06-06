import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { gameStateService } from '@/src/services/game-state.service';

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

    // Use the service to start the session
    const result = await gameStateService.startSession(params.id, user.id);

    if (!result.success) {
      // Map specific error messages to appropriate HTTP status codes
      const errorMessage = result.error || 'Failed to start session';
      let status = 400;

      if (errorMessage === 'Session not found') {
        status = 404;
      } else if (errorMessage === 'Only the host can start the session') {
        status = 403;
      }

      return NextResponse.json({ error: errorMessage }, { status });
    }

    // Get the updated session data to return
    const { data: updatedSession } = await supabase
      .from('bingo_sessions')
      .select('*')
      .eq('id', params.id)
      .single();

    return NextResponse.json(updatedSession || { id: params.id });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
