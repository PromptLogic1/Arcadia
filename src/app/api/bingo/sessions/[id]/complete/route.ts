import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/rate-limiter';
import { log } from '@/lib/logger';
import { gameStateService } from '@/src/services';
import type { WinPattern } from '@/features/bingo-boards/types';

const rateLimiter = new RateLimiter();

interface CompleteSessionRequest {
  winner_id: string;
  winning_patterns: WinPattern[];
  final_score: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let winnerId: string | undefined;
  let sessionId: string | undefined;

  try {
    sessionId = params.id;
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (await rateLimiter.isLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body: CompleteSessionRequest = await request.json();
    const { winner_id, winning_patterns, final_score } = body;
    winnerId = winner_id;

    // Use the game state service
    const result = await gameStateService.completeGame(sessionId, {
      winner_id,
      winning_patterns: winning_patterns.map(p => p.name), // Convert to string[] as expected by service
      final_score,
    });

    if (result.error) {
      if (result.error === 'Session not found') {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      if (result.error === 'Session is not active') {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      winner: result.winner,
    });
  } catch (error) {
    log.error('Error completing bingo session', error as Error, {
      metadata: {
        apiRoute: 'bingo/sessions/[id]/complete',
        method: 'POST',
        sessionId,
        winnerId,
      },
    });
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to complete session' },
      { status: 500 }
    );
  }
}
