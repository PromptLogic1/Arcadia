import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database.types'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { challenge_id, code, language } = body

    const { data, error } = await supabase
      .from('submissions')
      .insert({
        challenge_id,
        user_id: user.id,
        code,
        language,
        status: 'pending',
        results: null
      })
      .select()
      .single()

    if (error) throw error

    const response = NextResponse.json(data)
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    console.error('Error creating submission:', error)
    return NextResponse.json(
      { error: 'Error creating submission' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const challenge_id = searchParams.get('challenge_id')

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let query = supabase.from('submissions')
      .select(`
        *,
        challenge:challenges(title, difficulty)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (challenge_id) {
      query = query.eq('challenge_id', challenge_id)
    }

    const { data, error } = await query

    if (error) throw error

    const response = NextResponse.json(data)
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    console.error('Error fetching submissions:', error)
    return NextResponse.json(
      { error: 'Error fetching submissions' },
      { status: 500 }
    )
  }
} 