import { NextResponse } from 'next/server';
import { bingoBoardsService } from '@/src/services/bingo-boards.service';
import { authService } from '@/src/services/auth.service';
import type { CompositeTypes, Enums } from '@/types/database-generated';
import { DIFFICULTIES, GAME_CATEGORIES } from '@/src/types/index';
import { RateLimiter } from '@/lib/rate-limiter';
import { log } from '@/lib/logger';

const rateLimiter = new RateLimiter();

// Type aliases
type BoardCell = CompositeTypes<'board_cell'>;
type BoardSettings = CompositeTypes<'board_settings'>;
type GameCategory = Enums<'game_category'>;
type DifficultyLevel = Enums<'difficulty_level'>;

interface CreateBoardRequest {
  title: string;
  size: number;
  settings: BoardSettings;
  game_type: GameCategory;
  difficulty: DifficultyLevel;
  is_public: boolean;
  board_state: BoardCell[];
}

// Helper function to validate enum values (using database-derived constants)
function isValidGameCategory(value: string | null): value is GameCategory {
  return value !== null && GAME_CATEGORIES.includes(value as GameCategory);
}

function isValidDifficultyLevel(
  value: string | null
): value is DifficultyLevel {
  return value !== null && DIFFICULTIES.includes(value as DifficultyLevel);
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const game = searchParams.get('game');
    const difficulty = searchParams.get('difficulty');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate enum values
    const validGame = game && isValidGameCategory(game) ? game : null;
    const validDifficulty = difficulty && isValidDifficultyLevel(difficulty) ? difficulty : null;

    // Use service layer to fetch boards
    const { boards, error } = await bingoBoardsService.getBoards({
      game: validGame,
      difficulty: validDifficulty,
      limit,
      offset,
    });

    if (error) {
      log.error('Error fetching bingo boards', new Error(error), {
        metadata: {
          apiRoute: 'bingo',
          method: 'GET',
          filters: { game, difficulty, limit, offset },
        },
      });
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json(boards);
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

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (await rateLimiter.isLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Use service layer for authentication
    const { user, error: authError } = await authService.getCurrentUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as CreateBoardRequest;
    const {
      title,
      size,
      settings,
      game_type,
      difficulty,
      is_public,
      board_state,
    } = body;

    // Validate enum values
    if (!isValidGameCategory(game_type)) {
      return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
    }

    if (!isValidDifficultyLevel(difficulty)) {
      return NextResponse.json(
        { error: 'Invalid difficulty level' },
        { status: 400 }
      );
    }

    // Use service layer to create board
    const { board, error } = await bingoBoardsService.createBoardFromAPI({
      title,
      size,
      settings,
      game_type,
      difficulty,
      is_public,
      board_state,
      userId: user.id,
    });

    if (error) {
      log.error('Error creating bingo board', new Error(error), {
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
      });
      return NextResponse.json({ error }, { status: 500 });
    }

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
