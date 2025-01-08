import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Get the current user's ID from the session
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user data to get the database user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', session.user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get all bingo boards for the user
    const { data: boards, error: boardsError } = await supabase
      .from('bingoboards')
      .select('*')
      .eq('creator_id', userData.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (boardsError) {
      return NextResponse.json(
        { error: boardsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(boards)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 