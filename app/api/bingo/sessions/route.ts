import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database.types'
import { RateLimiter } from '@/lib/rate-limiter'
import type { BoardCell } from '@/components/challenges/bingo-board/types/types'

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

    if (board.status !== 'published') {
      return NextResponse.json(
        { error: 'Board is not published' },
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
    console.error('Error creating bingo session:', error)
    return NextResponse.json(
      { error: 'Failed to create bingo session' },
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
    console.error('Error updating bingo session:', error)
    return NextResponse.json(
      { error: 'Failed to update bingo session' },
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