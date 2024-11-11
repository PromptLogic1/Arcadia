import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database.types'
import { RateLimiter } from '@/lib/rate-limiter'

const rateLimiter = new RateLimiter()

interface CreateSessionRequest {
  boardId: string
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

    const body = await request.json() as CreateSessionRequest
    const { boardId, playerName, color, team } = body

    // First, create the session
    const { data: session, error: sessionError } = await supabase
      .from('bingo_sessions')
      .insert({
        board_id: boardId,
        current_state: [],
        status: 'active',
        winner_id: null,
        started_at: new Date().toISOString(),
        ended_at: null
      })
      .select()
      .single()

    if (sessionError) throw sessionError

    // Then, add the creator as the first player
    const { data: player, error: playerError } = await supabase
      .from('bingo_session_players')
      .insert({
        session_id: session.id,
        user_id: user.id,
        player_name: playerName,
        color,
        team: team ?? null,
        joined_at: new Date().toISOString()
      })
      .select()
      .single()

    if (playerError) throw playerError

    return NextResponse.json({ session, player })
  } catch (error) {
    console.error('Error creating bingo session:', error)
    return NextResponse.json(
      { error: 'Failed to create bingo session' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const boardId = searchParams.get('boardId')
    const status = searchParams.get('status') || 'active'

    if (!boardId) {
      return NextResponse.json(
        { error: 'Board ID is required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient<Database>({ cookies })

    const { data: sessions, error } = await supabase
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
      .eq('board_id', boardId)
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Error fetching bingo sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bingo sessions' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { sessionId, currentState, winnerId, status } = body

    const { data, error } = await supabase
      .from('bingo_sessions')
      .update({
        current_state: currentState,
        winner_id: winnerId,
        status,
        ended_at: status === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating bingo session:', error)
    return NextResponse.json(
      { error: 'Failed to update bingo session' },
      { status: 500 }
    )
  }
} 