import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database.types'
import { RateLimiter } from '@/lib/rate-limiter'
import { DEFAULT_MAX_PLAYERS } from '@/features/bingo-boards/types'

const rateLimiter = new RateLimiter()

interface JoinSessionRequest {
  sessionId: string
  playerName: string
  color: string
  team?: number | null
}

export async function POST(request: Request) {
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

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json() as JoinSessionRequest
    const { sessionId, playerName, color, team } = body

    // Check if session exists and is active
    const { data: session, error: sessionError } = await supabase
      .from('bingo_sessions')
      .select(`
        *,
        players:bingo_session_players(count)
      `)
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

    // Check player limit
    const currentPlayerCount = session.players?.[0]?.count ?? 0
    if (currentPlayerCount >= DEFAULT_MAX_PLAYERS) {
      return NextResponse.json(
        { error: 'Session is full' },
        { status: 400 }
      )
    }

    // Check if player is already in session
    const { data: existingPlayer } = await supabase
      .from('bingo_session_players')
      .select('user_id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (existingPlayer) {
      return NextResponse.json(
        { error: 'Already in session' },
        { status: 400 }
      )
    }

    // Add to queue instead of directly joining
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
      })
      .select()
      .single()

    if (queueError) throw queueError

    return NextResponse.json(queueEntry)
  } catch (error) {
    console.error('Error joining session:', error)
    return NextResponse.json(
      { error: 'Failed to join session' },
      { status: 500 }
    )
  }
} 