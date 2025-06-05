import { createServerComponentClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import type {
  BoardCell,
  DifficultyLevel,
  GameCategory,
  BoardSettings,
  Database,
} from '@/types';
import { DIFFICULTIES, GAME_CATEGORIES } from '@/src/types/index';
import { RateLimiter } from '@/lib/rate-limiter';
import { log } from '@/lib/logger';

const rateLimiter = new RateLimiter();

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

    const supabase = await createServerComponentClient();

    let query = supabase
      .from('bingo_boards')
      .select(
        `
        *,
        creator:creator_id(
          username,
          avatar_url
        )
      `
      )
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (game && game !== 'All Games' && isValidGameCategory(game)) {
      query = query.eq('game_type', game);
    }

    if (difficulty && isValidDifficultyLevel(difficulty)) {
      query = query.eq('difficulty', difficulty);
    }

    const { data: boards, error } = await query;

    if (error) {
      log.error('Error fetching bingo boards', error, {
        metadata: {
          apiRoute: 'bingo',
          method: 'GET',
          filters: { game, difficulty, limit, offset },
        },
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
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

    const supabase = await createServerComponentClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

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

    const { data, error } = await supabase
      .from('bingo_boards')
      .insert({
        title,
        creator_id: user.id,
        size,
        settings:
          settings as Database['public']['CompositeTypes']['board_settings'],
        game_type,
        difficulty,
        is_public,
        board_state:
          board_state as Database['public']['CompositeTypes']['board_cell'][],
        status: 'draft' as const,
        cloned_from: null,
      })
      .select()
      .single();

    if (error) {
      log.error('Error creating bingo board', error, {
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
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
