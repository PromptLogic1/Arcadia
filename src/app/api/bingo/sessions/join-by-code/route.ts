import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import { RateLimiter } from '@/lib/rate-limiter';
import { joinByCodeRequestSchema } from '@/lib/validation/schemas/sessions';
import {
  validateRequestBody,
  isValidationError,
} from '@/lib/validation/middleware';
import { sessionsService } from '@/src/services/sessions.service';
import { userService } from '@/src/services/user.service';

const rateLimiter = new RateLimiter();

export async function POST(request: NextRequest) {
  let userIdForLog: string | undefined;
  let sessionCodeForLog: string | undefined;

  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (await rateLimiter.isLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createServerComponentClient();

    // Get authenticated user
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
      joinByCodeRequestSchema,
      {
        apiRoute: 'bingo/sessions/join-by-code',
        method: 'POST',
        userId: user.id,
      }
    );

    if (isValidationError(validation)) {
      return validation.error;
    }

    // Note: The schema expects userId in the body, but we use the authenticated user's ID
    const { sessionCode, password, displayName, color, team } = validation.data;
    sessionCodeForLog = sessionCode;

    // Get user profile for display name fallback
    const profileResult = await userService.getUserProfile(user.id);
    const playerDisplayName = displayName || profileResult.data?.username || 'Anonymous';
    const playerColor = color || '#3B82F6'; // Default blue

    // Join session using service
    const result = await sessionsService.joinSessionByCode(
      sessionCode,
      user.id,
      {
        display_name: playerDisplayName,
        color: playerColor,
        team: team ?? null,
        password,
      }
    );

    if (result.error) {
      const statusCode = 
        result.error === 'Session not found' ? 404 :
        result.error === 'Incorrect password' ? 401 :
        result.error === 'Session is full' || 
        result.error === 'Session is no longer accepting players' ? 400 : 500;
      
      return NextResponse.json({ error: result.error }, { status: statusCode });
    }

    return NextResponse.json({
      sessionId: result.session?.id,
      session: result.session,
      player: result.player,
    });
  } catch (error) {
    log.error('Error joining session by code', error as Error, {
      metadata: {
        apiRoute: 'bingo/sessions/join-by-code',
        method: 'POST',
        userId: userIdForLog,
        sessionCode: sessionCodeForLog,
      },
    });
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to join session' },
      { status: 500 }
    );
  }
}
