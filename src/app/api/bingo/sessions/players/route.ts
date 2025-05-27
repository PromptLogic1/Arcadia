import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database.types'
import { RateLimiter } from '@/lib/rate-limiter'
import { log } from "@/lib/logger"

const rateLimiter = new RateLimiter()

interface JoinSessionRequest {
  sessionId: string
  playerName: string
  color: string
  team?: number | null
}

interface JoinRequestDataForLog {
  playerName?: string;
  color?: string;
  team?: number | null;
}

interface PlayerUpdatesForLog {
  player_name?: string;
  color?: string;
  team?: number | null;
}

interface PatchPlayerRequest {
  sessionId: string;
  playerName?: string;
  color?: string;
  team?: number | null;
}

type QueueEntry = Database['public']['Tables']['bingo_session_queue']['Row']

export async function POST(request: Request): Promise<NextResponse> {
  let userIdForLog: string | undefined
  let sessionIdForLog: string | undefined
  let joinRequestDataForLog: JoinRequestDataForLog = {};
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
    userIdForLog = user?.id

    if (authError || !user || !user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json() as JoinSessionRequest
    const { sessionId, playerName, color, team } = body
    sessionIdForLog = sessionId
    joinRequestDataForLog = { playerName, color, team }

    // Validate player name
    if (!playerName || playerName.length < 3 || playerName.length > 20) {
      return NextResponse.json(
        { error: 'Player name must be between 3 and 20 characters' },
        { status: 400 }
      )
    }

    // Check if session exists and is active
    const { data: session, error: sessionError } = await supabase
      .from('bingo_sessions')
      .select('status')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    if (session.status !== 'active') {
      return NextResponse.json(
        { error: 'Session is not active' },
        { status: 400 }
      )
    }

    // Instead of directly adding player, add to queue
    const { data: queueEntry, error: queueError } = await supabase
      .from('bingo_session_queue')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        player_name: playerName,
        color,
        team: team ?? null,
        status: 'pending',
        requested_at: new Date().toISOString()
      } satisfies Omit<QueueEntry, 'id' | 'created_at' | 'updated_at' | 'processed_at'>)
      .select('id, status')
      .single()

    if (queueError) {
      log.error('Error adding to join queue', queueError, { metadata: { apiRoute: 'bingo/sessions/players', method: 'POST', userId: userIdForLog, sessionId: sessionIdForLog, ...joinRequestDataForLog } })
      return NextResponse.json({ error: queueError.message }, { status: 500 })
    }

    // Wait for queue processing (with timeout)
    let attempts = 0
    const maxAttempts = 10
    while (attempts < maxAttempts) {
      const { data: processedEntry, error: checkError } = await supabase
        .from('bingo_session_queue')
        .select('status, processed_at')
        .eq('id', queueEntry?.id)
        .single()

      if (checkError) {
        log.error('Error checking queue status', checkError, { metadata: { apiRoute: 'bingo/sessions/players', method: 'POST', userId: userIdForLog, queueEntryId: queueEntry?.id } })
        return NextResponse.json({ error: checkError.message }, { status: 500 })
      }

      if (processedEntry?.status === 'approved') {
        // Successfully joined
        const { data: player, error: playerFetchError } = await supabase
          .from('bingo_session_players')
          .select()
          .eq('session_id', sessionId)
          .eq('user_id', user.id)
          .single()

        if (playerFetchError) {
          log.error('Error fetching player after approved join', playerFetchError, { metadata: { apiRoute: 'bingo/sessions/players', method: 'POST', userId: userIdForLog, sessionId: sessionIdForLog, playerName, color, team } })
          return NextResponse.json({ error: playerFetchError.message }, { status: 500 })
        }
        return NextResponse.json(player)
      } else if (processedEntry?.status === 'rejected') {
        return NextResponse.json(
          { error: 'Failed to join session - color may be taken or session full' },
          { status: 409 }
        )
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 500))
      attempts++
    }

    return NextResponse.json(
      { error: 'Join request timed out' },
      { status: 408 }
    )

  } catch (error) {
    log.error('Unhandled error in POST /api/bingo/sessions/players (join session)', error as Error, { metadata: { apiRoute: 'bingo/sessions/players', method: 'POST', userId: userIdForLog, sessionId: sessionIdForLog } })
    return NextResponse.json({ error: (error as Error).message || 'Failed to join session' }, { status: 500 })
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  let userIdForLog: string | undefined
  let playerIdForLog: string | undefined
  let updatesForLog: PlayerUpdatesForLog = {};
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    userIdForLog = user?.id

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json() as PatchPlayerRequest
    const { sessionId, playerName, color, team } = body
    playerIdForLog = user?.id
    
    // Prepare the update object for Supabase. This must match Supabase's expected type.
    const supabaseUpdatePayload: Database['public']['Tables']['bingo_session_players']['Update'] = {};
    if (playerName !== undefined) supabaseUpdatePayload.player_name = playerName;
    if (color !== undefined) supabaseUpdatePayload.color = color;
    if (team !== undefined) supabaseUpdatePayload.team = team ?? null;

    // For logging, we can use a slightly different structure if needed, but here it's the same.
    updatesForLog = supabaseUpdatePayload;

    // Validate player name
    if (playerName && (playerName.length < 3 || playerName.length > 20)) {
      return NextResponse.json(
        { error: 'Player name must be between 3 and 20 characters' },
        { status: 400 }
      )
    }

    // Check if color is already taken by another player
    if (color) {
      const { data: colorCheck } = await supabase
        .from('bingo_session_players')
        .select('user_id')
        .eq('session_id', sessionId)
        .eq('color', color)
        .neq('user_id', user.id)
        .single()

      if (colorCheck) {
        return NextResponse.json(
          { error: 'Color already taken' },
          { status: 409 }
        )
      }
    }

    // Update player
    const { data, error } = await supabase
      .from('bingo_session_players')
      .update(supabaseUpdatePayload)
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      log.error('Error updating player', error, { metadata: { apiRoute: 'bingo/sessions/players', method: 'PATCH', userId: userIdForLog, playerId: playerIdForLog, updates: updatesForLog } })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error('Unhandled error in PATCH /api/bingo/sessions/players (update player)', error as Error, { metadata: { apiRoute: 'bingo/sessions/players', method: 'PATCH', userId: userIdForLog, playerId: playerIdForLog, updates: updatesForLog } })
    return NextResponse.json({ error: (error as Error).message || 'Failed to update player' }, { status: 500 })
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  let userIdForLog: string | undefined
  let sessionIdForLog: string | undefined
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    userIdForLog = user?.id

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if session is active
    const { data: session } = await supabase
      .from('bingo_sessions')
      .select('status')
      .eq('id', sessionId)
      .single()

    if (session?.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot leave completed session' },
        { status: 400 }
      )
    }

    const { error: leaveError } = await supabase
      .from('bingo_session_players')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', user.id)

    if (leaveError) throw leaveError

    sessionIdForLog = sessionId

    return NextResponse.json({ message: 'Successfully left session' })
  } catch (error) {
    log.error('Unhandled error in DELETE /api/bingo/sessions/players (leave session)', error as Error, { metadata: { apiRoute: 'bingo/sessions/players', method: 'DELETE', userId: userIdForLog, sessionId: sessionIdForLog } })
    return NextResponse.json({ error: (error as Error).message || 'Failed to leave session' }, { status: 500 })
  }
} 