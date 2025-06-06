import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter-middleware';
import { log } from '@/lib/logger';
import { gameStateService } from '@/src/services';

// POST handler with rate limiting for game actions
export const POST = withRateLimit(
  async (
    request: NextRequest,
    { params }: { params: { id: string } }
  ): Promise<NextResponse> => {
  let userId: string | undefined;
  let sessionId: string | undefined;
  let cellPosition: number | undefined;
  let action: string | undefined;

  try {
    sessionId = params.id;

    const body = await request.json();
    const {
      cell_position,
      user_id,
      action: actionValue, // 'mark' | 'unmark'
      version,
    } = body;

    userId = user_id;
    cellPosition = cell_position;
    action = actionValue;

    // Use the game state service
    const result = await gameStateService.markCell(sessionId, {
      cell_position,
      user_id,
      action: actionValue,
      version,
    });

    if (result.error) {
      if (result.error === 'VERSION_CONFLICT') {
        return NextResponse.json(
          { error: 'Version conflict', current_version: result.version },
          { status: 409 }
        );
      }
      if (result.error === 'Session not found') {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      if (result.error === 'Session not active') {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      current_state: result.boardState,
      version: result.version,
    });
  } catch (error) {
    log.error('Error marking cell in bingo session', error as Error, {
      metadata: {
        apiRoute: 'bingo/sessions/[id]/mark-cell',
        method: 'POST',
        sessionId,
        userId,
        cellPosition,
        action,
      },
    });
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to mark cell' },
      { status: 500 }
    );
  }
  },
  RATE_LIMIT_CONFIGS.gameAction
);
