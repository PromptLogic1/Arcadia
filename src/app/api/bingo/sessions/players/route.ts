import { NextResponse } from 'next/server';
import { sessionsService } from '@/src/services/sessions.service';
import { authService } from '@/src/services/auth.service';
import { RateLimiter } from '@/lib/rate-limiter';
import { log } from '@/lib/logger';

const rateLimiter = new RateLimiter();

interface JoinSessionRequest {
  sessionId: string;
  displayName: string;
  color: string;
  team?: number | null;
}

interface PlayerUpdatesForLog {
  display_name?: string;
  color?: string;
  team?: number | null;
}

interface PatchPlayerRequest {
  sessionId: string;
  displayName?: string;
  color?: string;
  team?: number | null;
}

export async function POST(request: Request): Promise<NextResponse> {
  let userIdForLog: string | undefined;
  let sessionIdForLog: string | undefined;
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (await rateLimiter.isLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Use service layer for authentication
    const { user, error: authError } = await authService.getCurrentUser();
    userIdForLog = user?.id;

    if (authError || !user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as JoinSessionRequest;
    const { sessionId, displayName, color, team } = body;
    sessionIdForLog = sessionId;

    // Validate display name
    if (!displayName || displayName.length < 3 || displayName.length > 20) {
      return NextResponse.json(
        { error: 'Display name must be between 3 and 20 characters' },
        { status: 400 }
      );
    }

    // Check if session exists and is active
    const { status, error: statusError } = await sessionsService.getSessionStatus(sessionId);

    if (statusError || !status) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (status !== 'waiting') {
      return NextResponse.json(
        { error: 'Session is not accepting new players' },
        { status: 400 }
      );
    }

    // Check if player already exists in session
    const { exists } = await sessionsService.checkPlayerExists(sessionId, user.id);

    if (exists) {
      return NextResponse.json(
        { error: 'Player already in session' },
        { status: 409 }
      );
    }

    // Check if color is already taken
    const { available } = await sessionsService.checkColorAvailable(sessionId, color);

    if (!available) {
      return NextResponse.json(
        { error: 'Color already taken' },
        { status: 409 }
      );
    }

    // Add player to session using service
    const { player, error: joinError } = await sessionsService.joinSession({
      session_id: sessionId,
      user_id: user.id,
      display_name: displayName,
      color,
      team: team ?? null,
    });

    if (joinError) {
      log.error('Error adding player to session', new Error(joinError), {
        metadata: {
          apiRoute: 'bingo/sessions/players',
          method: 'POST',
          userId: userIdForLog,
          sessionId: sessionIdForLog,
          displayName,
          color,
          team,
        },
      });
      return NextResponse.json({ error: joinError }, { status: 500 });
    }

    return NextResponse.json(player);
  } catch (error) {
    log.error(
      'Unhandled error in POST /api/bingo/sessions/players (join session)',
      error as Error,
      {
        metadata: {
          apiRoute: 'bingo/sessions/players',
          method: 'POST',
          userId: userIdForLog,
          sessionId: sessionIdForLog,
        },
      }
    );
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to join session' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  let userIdForLog: string | undefined;
  let playerIdForLog: string | undefined;
  let updatesForLog: PlayerUpdatesForLog = {};
  try {
    // Use service layer for authentication
    const { user, error: authError } = await authService.getCurrentUser();
    userIdForLog = user?.id;

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as PatchPlayerRequest;
    const { sessionId, displayName, color, team } = body;
    playerIdForLog = user?.id;

    // Prepare the update object
    const updates: Parameters<typeof sessionsService.updatePlayer>[2] = {};
    if (displayName !== undefined) updates.display_name = displayName;
    if (color !== undefined) updates.color = color;
    if (team !== undefined) updates.team = team ?? null;

    // For logging
    updatesForLog = updates;

    // Use service layer to update player
    const { player, error: updateError } = await sessionsService.updatePlayer(
      sessionId,
      user.id,
      updates
    );

    if (updateError) {
      log.error('Error updating player', new Error(updateError), {
        metadata: {
          apiRoute: 'bingo/sessions/players',
          method: 'PATCH',
          userId: userIdForLog,
          playerId: playerIdForLog,
          updates: updatesForLog,
        },
      });
      
      // Return appropriate status code based on error
      if (updateError.includes('between 3 and 20 characters')) {
        return NextResponse.json({ error: updateError }, { status: 400 });
      }
      if (updateError.includes('Color already taken')) {
        return NextResponse.json({ error: updateError }, { status: 409 });
      }
      
      return NextResponse.json({ error: updateError }, { status: 500 });
    }

    return NextResponse.json(player);
  } catch (error) {
    log.error(
      'Unhandled error in PATCH /api/bingo/sessions/players (update player)',
      error as Error,
      {
        metadata: {
          apiRoute: 'bingo/sessions/players',
          method: 'PATCH',
          userId: userIdForLog,
          playerId: playerIdForLog,
          updates: updatesForLog,
        },
      }
    );
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to update player' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  let userIdForLog: string | undefined;
  let sessionIdForLog: string | undefined;
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Use service layer for authentication
    const { user, error: authError } = await authService.getCurrentUser();
    userIdForLog = user?.id;

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if session is active
    const { status } = await sessionsService.getSessionStatus(sessionId);

    if (status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot leave completed session' },
        { status: 400 }
      );
    }

    // Use service layer to leave session
    const { error: leaveError } = await sessionsService.leaveSession(sessionId, user.id);

    if (leaveError) {
      log.error('Error leaving session', new Error(leaveError), {
        metadata: {
          apiRoute: 'bingo/sessions/players',
          method: 'DELETE',
          userId: userIdForLog,
          sessionId: sessionId,
        },
      });
      return NextResponse.json({ error: leaveError }, { status: 500 });
    }

    sessionIdForLog = sessionId;

    return NextResponse.json({ message: 'Successfully left session' });
  } catch (error) {
    log.error(
      'Unhandled error in DELETE /api/bingo/sessions/players (leave session)',
      error as Error,
      {
        metadata: {
          apiRoute: 'bingo/sessions/players',
          method: 'DELETE',
          userId: userIdForLog,
          sessionId: sessionIdForLog,
        },
      }
    );
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to leave session' },
      { status: 500 }
    );
  }
}
