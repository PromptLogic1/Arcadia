import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database.types'
import { RateLimiter } from '@/lib/rate-limiter'
import type { BoardCell } from '@/features/bingo-boards/types'
import { log } from "@/lib/logger"
import type { SessionStatus } from '@/types/database.core'

const rateLimiter = new RateLimiter()

interface CreateSessionRequest {
  boardId: string
  playerName: string
  color: string
  team?: number | null
}

interface UpdatesForLog {
  currentState?: BoardCell[] | null;
  winnerId?: string | null;
  status?: SessionStatus | null;
}

interface PatchSessionRequest {
  sessionId: string;
  currentState?: BoardCell[] | null;
  winnerId?: string | null;
  status?: SessionStatus | null;
}

export async function POST(request: Request): Promise<NextResponse> {
  let userIdForLog: string | undefined;
  let boardIdForLog: string | undefined;
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (await rateLimiter.isLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    userIdForLog = user?.id;

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json() as CreateSessionRequest
    const { boardId, playerName, color, team } = body
    boardIdForLog = boardId;

    // Check if board exists and is published
    const { data: board, error: boardError } = await supabase
      .from('bingo_boards')
      .select('id, status')
      .eq('id', boardId)
      .single()

    if (boardError || !board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }

    // A board must be 'active' to allow new sessions.
    if (board.status !== 'active') {
      return NextResponse.json(
        { error: 'Board is not active. Sessions can only be created for active boards.' },
        { status: 400 }
      )
    }

    // Check for existing active session
    const { data: existingSession } = await supabase
      .from('bingo_sessions')
      .select('id')
      .eq('board_id', boardId)
      .eq('status', 'active')
      .single()

    if (existingSession) {
      return NextResponse.json(
        { error: 'An active session already exists for this board' },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()

    // Create new session
    const { data: session, error: sessionError } = await supabase
      .from('bingo_sessions')
      .insert({
        board_id: boardId,
        current_state: [] as BoardCell[],
        status: 'active',
        winner_id: null,
        started_at: now,
        ended_at: null
      })
      .select()
      .single()

    if (sessionError) throw sessionError

    // Add creator as first player
    const { data: player, error: playerError } = await supabase
      .from('bingo_session_players')
      .insert({
        session_id: session.id,
        user_id: user.id,
        player_name: playerName,
        color,
        team: team ?? null,
        joined_at: now
      })
      .select()
      .single()

    if (playerError) throw playerError

    return NextResponse.json({ session, player })
  } catch (error) {
    log.error('Error creating bingo session', error as Error, { metadata: { apiRoute: 'bingo/sessions', method: 'POST', userId: userIdForLog, boardId: boardIdForLog } });
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create bingo session' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  let userIdForLog: string | undefined;
  let sessionIdForLog: string | undefined;
  let updatesForLog: UpdatesForLog = {};
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    userIdForLog = user?.id;

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json() as PatchSessionRequest
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
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    log.error('Error updating bingo session', error as Error, { metadata: { apiRoute: 'bingo/sessions', method: 'PATCH', userId: userIdForLog, sessionId: sessionIdForLog, updates: updatesForLog } });
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to update bingo session' },
      { status: 500 }
    )
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
    const validStatuses = ['waiting', 'active', 'completed', 'cancelled'] as const;
    type ValidSessionStatus = (typeof validStatuses)[number];

    let status: ValidSessionStatus | undefined;

    if (statusParam && (validStatuses as ReadonlyArray<string>).includes(statusParam)) {
      status = statusParam as ValidSessionStatus;
    } else if (statusParam) {
      log.warn(`Invalid status parameter received: ${statusParam}`, { metadata: { apiRoute: 'bingo/sessions', method: 'GET', boardId: boardIdForLog } });
      status = 'active';
    } else {
      status = 'active';
    }

    statusForLog = status;

    const supabase = createRouteHandlerClient<Database>({ cookies });

    const query = supabase
      .from('bingo_sessions')
      .select(`
        *,
        players:bingo_session_players(
          user_id,
          player_name,
          color,
          team
        )
      `)
      .eq('board_id', boardId);

    if (status) {
      query.eq('status', status);
    }
    
    query.order('created_at', { ascending: false });

    const { data: sessions, error } = await query;

    if (error) {
      log.error('Error fetching bingo sessions from DB', error, { metadata: { apiRoute: 'bingo/sessions', method: 'GET', boardId: boardIdForLog, status: statusForLog } });
      return NextResponse.json(
        { error: error.message || 'Failed to fetch sessions from DB' }, 
        { status: 500 }
      );
    }

    return NextResponse.json(sessions);
  } catch (error) {
    log.error('Unhandled error in GET /api/bingo/sessions', error as Error, { metadata: { apiRoute: 'bingo/sessions', method: 'GET', boardId: boardIdForLog, status: statusForLog } });
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch bingo sessions' }, 
      { status: 500 }
    );
  }
} 