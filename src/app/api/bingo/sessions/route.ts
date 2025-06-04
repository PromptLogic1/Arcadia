import { createServerComponentClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/rate-limiter';
import { log } from '@/lib/logger';
import type { Database } from '@/types/database-generated';

type DbBoardCell = Database['public']['CompositeTypes']['board_cell'];
type DbSessionStatus = Database['public']['Enums']['session_status'];

const rateLimiter = new RateLimiter();

interface CreateSessionRequest {
  boardId: string;
  displayName?: string;
  color?: string;
  team?: number | null;
  settings?: {
    max_players?: number;
    allow_spectators?: boolean;
    auto_start?: boolean;
    time_limit?: number | null;
    require_approval?: boolean;
    password?: string;
  };
}

interface UpdatesForLog {
  currentState?: DbBoardCell[] | null;
  winnerId?: string | null;
  status?: DbSessionStatus | null;
}

interface PatchSessionRequest {
  sessionId: string;
  currentState?: DbBoardCell[] | null;
  winnerId?: string | null;
  status?: DbSessionStatus | null;
}

export async function POST(request: Request): Promise<NextResponse> {
  let userIdForLog: string | undefined;
  let boardIdForLog: string | undefined;
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
    userIdForLog = user?.id;

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as CreateSessionRequest;
    const { boardId, displayName, color, team, settings } = body;
    boardIdForLog = boardId;

    // Batch queries using Promise.all for better performance
    const [profileResult, boardResult] = await Promise.all([
      supabase
        .from('users')
        .select('username')
        .eq('id', user.id)
        .single(),
      supabase
        .from('bingo_boards')
        .select('id, status, board_state, size')
        .eq('id', boardId)
        .single()
    ]);

    const { data: profile } = profileResult;
    const { data: board, error: boardError } = boardResult;

    const playerDisplayName = displayName || profile?.username || 'Anonymous';
    const playerColor = color || '#3B82F6'; // Default blue

    if (boardError || !board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Allow sessions for 'active' boards, or boards owned by the current user
    if (board.status !== 'active') {
      const { data: boardOwner } = await supabase
        .from('bingo_boards')
        .select('creator_id')
        .eq('id', boardId)
        .single();

      if (boardOwner?.creator_id !== user.id) {
        return NextResponse.json(
          {
            error:
              'Board is not active. Sessions can only be created for active boards.',
          },
          { status: 400 }
        );
      }
    }

    // Generate unique session code
    const generateSessionCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    let sessionCode = generateSessionCode();

    // Ensure session code is unique
    let codeExists = true;
    let attempts = 0;
    while (codeExists && attempts < 10) {
      const { data: existingCode } = await supabase
        .from('bingo_sessions')
        .select('id')
        .eq('session_code', sessionCode)
        .single();

      if (!existingCode) {
        codeExists = false;
      } else {
        sessionCode = generateSessionCode();
        attempts++;
      }
    }

    const now = new Date().toISOString();

    // Prepare session settings
    const sessionSettings = {
      max_players: settings?.max_players || 4,
      allow_spectators: settings?.allow_spectators ?? true,
      auto_start: settings?.auto_start ?? false,
      time_limit: settings?.time_limit || null,
      require_approval: settings?.require_approval ?? false,
      password: settings?.password || null,
    };

    // Create new session with proper initialization
    const { data: session, error: sessionError } = await supabase
      .from('bingo_sessions')
      .insert({
        board_id: boardId,
        host_id: user.id,
        session_code: sessionCode,
        current_state: board.board_state || [],
        status: 'waiting',
        version: 1,
        winner_id: null,
        started_at: null,
        ended_at: null,
        settings: sessionSettings,
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Add creator as first player and host
    const { data: player, error: playerError } = await supabase
      .from('bingo_session_players')
      .insert({
        session_id: session.id,
        user_id: user.id,
        display_name: playerDisplayName,
        color: playerColor,
        team: team ?? null,
        joined_at: now,
        is_host: true,
        is_ready: true,
      })
      .select()
      .single();

    if (playerError) throw playerError;

    return NextResponse.json({ session, player });
  } catch (error) {
    log.error('Error creating bingo session', error as Error, {
      metadata: {
        apiRoute: 'bingo/sessions',
        method: 'POST',
        userId: userIdForLog,
        boardId: boardIdForLog,
      },
    });
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create bingo session' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  let userIdForLog: string | undefined;
  let sessionIdForLog: string | undefined;
  let updatesForLog: UpdatesForLog = {};
  try {
    const supabase = await createServerComponentClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    userIdForLog = user?.id;

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as PatchSessionRequest;
    const { sessionId, currentState, winnerId, status } = body;
    sessionIdForLog = sessionId;
    updatesForLog = { currentState, winnerId, status };

    // Update session with independent transaction
    const { data, error } = await supabase
      .from('bingo_sessions')
      .update({
        current_state: currentState,
        winner_id: winnerId,
        status,
        ended_at: status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    log.error('Error updating bingo session', error as Error, {
      metadata: {
        apiRoute: 'bingo/sessions',
        method: 'PATCH',
        userId: userIdForLog,
        sessionId: sessionIdForLog,
        updates: updatesForLog,
      },
    });
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to update bingo session' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  let boardIdForLog: string | null = null;
  let statusForLog: string | undefined;
  try {
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');
    boardIdForLog = boardId;
    const statusParam = searchParams.get('status');

    if (!boardId) {
      return NextResponse.json(
        { error: 'Board ID is required' },
        { status: 400 }
      );
    }

    // Validate status parameter
    const validStatuses = [
      'waiting',
      'active',
      'completed',
      'cancelled',
    ] as const;
    type ValidSessionStatus = (typeof validStatuses)[number];

    let status: ValidSessionStatus | undefined;

    if (
      statusParam &&
      (validStatuses as ReadonlyArray<string>).includes(statusParam)
    ) {
      status = statusParam as ValidSessionStatus;
    } else if (statusParam) {
      log.warn(`Invalid status parameter received: ${statusParam}`, {
        metadata: {
          apiRoute: 'bingo/sessions',
          method: 'GET',
          boardId: boardIdForLog,
        },
      });
      status = 'active';
    } else {
      status = 'active';
    }

    statusForLog = status;

    const supabase = await createServerComponentClient();

    const query = supabase
      .from('bingo_sessions')
      .select(
        `
        *,
        players:bingo_session_players(
          user_id,
          display_name,
          color,
          team
        )
      `
      )
      .eq('board_id', boardId);

    if (status) {
      query.eq('status', status);
    }

    query.order('created_at', { ascending: false });

    const { data: sessions, error } = await query;

    if (error) {
      log.error('Error fetching bingo sessions from DB', error, {
        metadata: {
          apiRoute: 'bingo/sessions',
          method: 'GET',
          boardId: boardIdForLog,
          status: statusForLog,
        },
      });
      return NextResponse.json(
        { error: error.message || 'Failed to fetch sessions from DB' },
        { status: 500 }
      );
    }

    return NextResponse.json(sessions);
  } catch (error) {
    log.error('Unhandled error in GET /api/bingo/sessions', error as Error, {
      metadata: {
        apiRoute: 'bingo/sessions',
        method: 'GET',
        boardId: boardIdForLog,
        status: statusForLog,
      },
    });
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch bingo sessions' },
      { status: 500 }
    );
  }
}
