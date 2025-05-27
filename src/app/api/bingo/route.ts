import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database.types'
import type { 
  BoardCell, 
  DifficultyLevel, 
  GameCategory, 
  BoardSettings
} from '@/types/database.types'
import { Constants } from '@/types/database.types'
import { RateLimiter } from '@/lib/rate-limiter'

const rateLimiter = new RateLimiter()

interface CreateBoardRequest {
  title: string
  size: number
  settings: BoardSettings
  game_type: GameCategory
  difficulty: DifficultyLevel
  is_public: boolean
  board_state: BoardCell[]
}

// Helper function to validate enum values
function isValidGameCategory(value: string | null): value is GameCategory {
  return value !== null && Constants.public.Enums.game_category.includes(value as GameCategory)
}

function isValidDifficultyLevel(value: string | null): value is DifficultyLevel {
  return value !== null && Constants.public.Enums.difficulty_level.includes(value as DifficultyLevel)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const game = searchParams.get('game')
    const difficulty = searchParams.get('difficulty')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })

    let query = supabase
      .from('bingo_boards')
      .select(`
        *,
        creator:creator_id(
          username,
          avatar_url
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    if (game && game !== 'All Games' && isValidGameCategory(game)) {
      query = query.eq('game_type', game)
    }

    if (difficulty && isValidDifficultyLevel(difficulty)) {
      query = query.eq('difficulty', difficulty)
    }

    const { data: boards, error } = await query

    if (error) throw error

    return NextResponse.json(boards)
  } catch (error) {
    console.error('Error fetching bingo boards:', error)
    return NextResponse.json({ error: 'Failed to fetch bingo boards' }, { status: 500 })
  }
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

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json() as CreateBoardRequest
    const { title, size, settings, game_type, difficulty, is_public, board_state } = body

    // Validate enum values
    if (!isValidGameCategory(game_type)) {
      return NextResponse.json(
        { error: 'Invalid game type' },
        { status: 400 }
      )
    }

    if (!isValidDifficultyLevel(difficulty)) {
      return NextResponse.json(
        { error: 'Invalid difficulty level' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('bingo_boards')
      .insert({
        title,
        creator_id: user.id,
        size,
        settings,
        game_type,
        difficulty,
        is_public,
        board_state,
        status: 'draft' as const,
        cloned_from: null
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating bingo board:', error)
    return NextResponse.json(
      { error: 'Failed to create bingo board' },
      { status: 500 }
    )
  }
} 