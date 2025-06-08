import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sessionsService } from '@/services/sessions.service';
import { boardCellSchema } from '@/lib/validation/schemas/common';
import { withErrorHandling } from '@/lib/error-handler';
import { validateRequestBody } from '@/lib/validation/middleware';
import {
  withRateLimit,
  RATE_LIMIT_CONFIGS,
} from '@/lib/rate-limiter-middleware';
import { log } from '@/lib/logger';

// Request validation schemas
const updateBoardStateSchema = z.object({
  board_state: z.array(boardCellSchema),
  version: z.number().int().min(0),
});

type UpdateBoardStateRequest = z.infer<typeof updateBoardStateSchema>;

export const PATCH = withRateLimit(
  withErrorHandling(
    async (request: NextRequest, { params }: { params: { id: string } }) => {
      // Parse and validate request body
      const validationResult = await validateRequestBody(
        request,
        updateBoardStateSchema
      );

      if (!validationResult.success) {
        return validationResult.error;
      }

      const { board_state, version }: UpdateBoardStateRequest =
        validationResult.data;

      // Use service to update board state with optimistic locking
      const result = await sessionsService.updateBoardState(
        params.id,
        board_state,
        version
      );

      if (result.error) {
        // Check if it's a version conflict
        if (result.error.includes('Version conflict')) {
          log.info('Board state version conflict', {
            metadata: {
              sessionId: params.id,
              requestedVersion: version,
              apiRoute: 'bingo/sessions/[id]/board-state',
              method: 'PATCH',
            },
          });

          return NextResponse.json({ error: result.error }, { status: 409 });
        }

        log.error('Failed to update board state', new Error(result.error), {
          metadata: {
            sessionId: params.id,
            apiRoute: 'bingo/sessions/[id]/board-state',
            method: 'PATCH',
          },
        });

        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json(result.data);
    }
  ),
  RATE_LIMIT_CONFIGS.gameAction
);

export const GET = withRateLimit(
  withErrorHandling(
    async (request: NextRequest, { params }: { params: { id: string } }) => {
      // Use service to get session board state
      const result = await sessionsService.getSessionById(params.id);

      if (result.error) {
        log.error(
          'Failed to get session board state',
          new Error(result.error),
          {
            metadata: {
              sessionId: params.id,
              apiRoute: 'bingo/sessions/[id]/board-state',
              method: 'GET',
            },
          }
        );

        return NextResponse.json({ error: result.error }, { status: 404 });
      }

      if (!result.data) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      // Return only the board state and version
      return NextResponse.json({
        current_state: result.data.current_state,
        version: result.data.version,
      });
    }
  ),
  RATE_LIMIT_CONFIGS.read
);
