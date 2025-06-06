import { createServerComponentClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter-middleware';
import { log } from '@/lib/logger';
import {
  createSessionRequestSchema,
  patchSessionRequestSchema,
  getSessionsQuerySchema,
  type PatchSessionRequest,
} from '@/lib/validation/schemas/sessions';
import {
  validateRequestBody,
  validateQueryParams,
  isValidationError,
} from '@/lib/validation/middleware';
import { sessionsService } from '@/src/services';

// POST handler with rate limiting
export const POST = withRateLimit(
  async (request: NextRequest): Promise<NextResponse> => {
    let userIdForLog: string | undefined;
    let boardIdForLog: string | undefined;
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

    // Validate request body with Zod
    const validation = await validateRequestBody(
      request,
      createSessionRequestSchema,
      {
        apiRoute: 'bingo/sessions',
        method: 'POST',
        userId: user.id,
      }
    );

    if (isValidationError(validation)) {
      return validation.error;
    }

    const { boardId, displayName, color, team, settings } = validation.data;
    boardIdForLog = boardId;

    // Get user profile for display name
    const { data: profile } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single();

    const playerDisplayName = displayName || profile?.username || 'Anonymous';
    const playerColor = color || '#3B82F6'; // Default blue

    // Check board status
    const { data: board, error: boardError } = await supabase
      .from('bingo_boards')
      .select('id, status, creator_id')
      .eq('id', boardId)
      .single();

    if (boardError || !board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Allow sessions for 'active' boards, or boards owned by the current user
    if (board.status !== 'active' && board.creator_id !== user.id) {
      return NextResponse.json(
        {
          error:
            'Board is not active. Sessions can only be created for active boards.',
        },
        { status: 400 }
      );
    }

    // Create session using the service
    const { session, error: sessionError } = await sessionsService.createSession({
      board_id: boardId,
      host_id: user.id,
      settings: {
        max_players: settings?.max_players,
        allow_spectators: settings?.allow_spectators,
        auto_start: settings?.auto_start,
        time_limit: settings?.time_limit || undefined,
        require_approval: settings?.require_approval,
        password: settings?.password,
      },
    });

    if (sessionError || !session) {
      throw new Error(sessionError || 'Failed to create session');
    }

    // Join the session as the host
    const { player, error: playerError } = await sessionsService.joinSession({
      session_id: session.id,
      user_id: user.id,
      display_name: playerDisplayName,
      color: playerColor,
      team: team ?? null,
    });

    if (playerError || !player) {
      // Clean up session if joining fails
      await supabase.from('bingo_sessions').delete().eq('id', session.id);
      throw new Error(playerError || 'Failed to join session');
    }

    // Mark host as ready
    await sessionsService.updatePlayerReady(session.id, user.id, true);

    return NextResponse.json({ session, player });
  } catch (error) {
    log.error(
      'Error creating bingo session',
      error instanceof Error
        ? error
        : new Error('Unknown session creation error'),
      {
        metadata: {
          apiRoute: 'bingo/sessions',
          method: 'POST',
          userId: userIdForLog,
          boardId: boardIdForLog,
        },
      }
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create bingo session',
      },
      { status: 500 }
    );
  }
  },
  RATE_LIMIT_CONFIGS.create
);

// PATCH handler with rate limiting
export const PATCH = withRateLimit(
  async (request: NextRequest): Promise<NextResponse> => {
  let userIdForLog: string | undefined;
  let sessionIdForLog: string | undefined;
  let updatesForLog: Partial<PatchSessionRequest> = {};
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

    // Validate request body with Zod
    const validation = await validateRequestBody(
      request,
      patchSessionRequestSchema,
      {
        apiRoute: 'bingo/sessions',
        method: 'PATCH',
        userId: user.id,
      }
    );

    if (isValidationError(validation)) {
      return validation.error;
    }

    const { sessionId, currentState, winnerId, status } = validation.data;
    sessionIdForLog = sessionId;
    updatesForLog = { currentState, winnerId, status };

    // Use the sessions service to update the session
    const { session, error } = await sessionsService.updateSession(sessionId, {
      current_state: currentState,
      winner_id: winnerId,
      status: status || undefined,
    });

    if (error || !session) {
      throw new Error(error || 'Failed to update session');
    }

    return NextResponse.json(session);
  } catch (error) {
    log.error(
      'Error updating bingo session',
      error instanceof Error
        ? error
        : new Error('Unknown session update error'),
      {
        metadata: {
          apiRoute: 'bingo/sessions',
          method: 'PATCH',
          userId: userIdForLog,
          sessionId: sessionIdForLog,
          updates: updatesForLog,
        },
      }
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update bingo session',
      },
      { status: 500 }
    );
  }
  },
  RATE_LIMIT_CONFIGS.gameAction
);

// GET handler with rate limiting
export const GET = withRateLimit(
  async (request: NextRequest): Promise<NextResponse> => {
  let boardIdForLog: string | null = null;
  let statusForLog: string | undefined;
  try {
    const { searchParams } = new URL(request.url);

    // Validate query parameters with Zod
    const validation = validateQueryParams(
      searchParams,
      getSessionsQuerySchema,
      {
        apiRoute: 'bingo/sessions',
        method: 'GET',
      }
    );

    if (isValidationError(validation)) {
      return validation.error;
    }

    const { boardId, status } = validation.data;
    boardIdForLog = boardId;
    statusForLog = status || 'active';

    // Use the sessions service to get sessions by board ID
    const { sessions, error } = await sessionsService.getSessionsByBoardId(
      boardId,
      status
    );

    if (error) {
      log.error('Error fetching bingo sessions', new Error(error), {
        metadata: {
          apiRoute: 'bingo/sessions',
          method: 'GET',
          boardId: boardIdForLog,
          status: statusForLog,
        },
      });
      return NextResponse.json(
        { error: error || 'Failed to fetch sessions' },
        { status: 500 }
      );
    }

    // Get players for each session
    const sessionsWithPlayers = await Promise.all(
      sessions.map(async (session) => {
        const { players } = await sessionsService.getSessionPlayers(session.id);
        return {
          ...session,
          players: players.map((p) => ({
            user_id: p.user_id,
            display_name: p.display_name,
            color: p.color,
            team: p.team,
          })),
        };
      })
    );

    return NextResponse.json(sessionsWithPlayers);
  } catch (error) {
    log.error(
      'Unhandled error in GET /api/bingo/sessions',
      error instanceof Error ? error : new Error('Unknown GET error'),
      {
        metadata: {
          apiRoute: 'bingo/sessions',
          method: 'GET',
          boardId: boardIdForLog,
          status: statusForLog,
        },
      }
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch bingo sessions',
      },
      { status: 500 }
    );
  }
  },
  RATE_LIMIT_CONFIGS.read
);
