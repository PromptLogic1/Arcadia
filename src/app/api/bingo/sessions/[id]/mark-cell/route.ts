import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  withRateLimit,
  RATE_LIMIT_CONFIGS,
} from '@/lib/rate-limiter-middleware';
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

      if (result.error === 'VERSION_CONFLICT') {
        // It's a non-critical error, so we return a 409 Conflict status
        // We also return the current version from the server so the client can sync
        return NextResponse.json(
          { error: 'Version conflict', current_version: result.data?.version },
          { status: 409 }
        );
      }

      // For critical errors, return 500
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      // On success, return the updated board state
      return NextResponse.json({
        message: 'Cell marked successfully',
        current_state: result.data?.boardState,
        version: result.data?.version,
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
