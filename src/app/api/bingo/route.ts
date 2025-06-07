import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { bingoBoardsService } from '@/services/bingo-boards.service';
import { authService } from '@/services/auth.service';
import {
  getBingoBoardsQuerySchema,
  createBingoBoardSchema,
} from '@/lib/validation/schemas/bingo';
import {
  validateQueryParams,
  validateRequestBody,
} from '@/lib/validation/middleware';
import { rateLimiter } from '@/lib/rate-limiter';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitResult = await rateLimiter.check(request, 60, ip);

  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const validation = validateQueryParams(
      searchParams,
      getBingoBoardsQuerySchema
    );

    if (!validation.success) {
      return validation.error;
    }

    const { game, difficulty, limit, offset } = validation.data;

    const numericLimit = typeof limit === 'number' ? limit : undefined;
    const numericOffset = typeof offset === 'number' ? offset : undefined;

    // Use service layer to fetch boards
    const response = await bingoBoardsService.getBoards({
      game: game || null,
      difficulty: difficulty || null,
      limit: numericLimit,
      offset: numericOffset,
    });

    if (response.error || !response.data) {
      log.error(
        'Error fetching bingo boards',
        new Error(response.error || 'Unknown error'),
        {
          metadata: {
            apiRoute: 'bingo',
            method: 'GET',
            filters: { game, difficulty, limit, offset },
          },
        }
      );
      return NextResponse.json(
        { error: response.error || 'Failed to fetch boards' },
        { status: 500 }
      );
    }

    return NextResponse.json(response.data);
  } catch (error) {
    log.error('Unhandled error in GET /api/bingo', error as Error, {
      metadata: { apiRoute: 'bingo', method: 'GET' },
    });
    return NextResponse.json(
      { error: 'Failed to fetch bingo boards' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResponse = await authService.getCurrentUser();

  if (authResponse.error || !authResponse.data) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = authResponse.data;

  const rateLimitResult = await rateLimiter.check(request, 15, user.id);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const validation = await validateRequestBody(
      request,
      createBingoBoardSchema
    );
    if (!validation.success) {
      return validation.error;
    }

    const {
      title,
      size,
      settings,
      game_type,
      difficulty,
      is_public,
      board_state,
    } = validation.data;

    // Use service layer to create board
    const createResponse = await bingoBoardsService.createBoardFromAPI({
      title,
      size,
      settings,
      game_type,
      difficulty,
      is_public: is_public ?? false,
      board_state,
      userId: user.id,
    });

    if (createResponse.error || !createResponse.data) {
      log.error(
        'Error creating bingo board',
        new Error(createResponse.error || 'Unknown error'),
        {
          metadata: {
            apiRoute: 'bingo',
            method: 'POST',
            userId: user.id,
            boardData: {
              title,
              size,
              settings,
              game_type,
              difficulty,
              is_public,
              board_state,
            },
          },
        }
      );
      return NextResponse.json(
        { error: createResponse.error || 'Failed to create board' },
        { status: 500 }
      );
    }

    const board = createResponse.data;

    return NextResponse.json(board);
  } catch (error) {
    log.error('Unhandled error in POST /api/bingo', error as Error, {
      metadata: { apiRoute: 'bingo', method: 'POST' },
    });
    return NextResponse.json(
      { error: 'Failed to create bingo board' },
      { status: 500 }
    );
  }
}
