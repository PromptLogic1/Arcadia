import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database.types'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const difficulty = searchParams.get('difficulty') as Database['public']['Tables']['challenges']['Row']['difficulty'] | null
    const category = searchParams.get('category')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    let query = supabase.from('challenges')
      .select(`
        *,
        category:categories(name),
        created_by:users!inner(username)
      `)
      .eq('status', 'published')

    if (difficulty) {
      query = query.eq('difficulty', difficulty)
    }
    if (category) {
      query = query.eq('category_id', category)
    }
    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching challenges:', error)
    return NextResponse.json({ error: 'Error fetching challenges' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      difficulty,
      category_id,
      test_cases,
      initial_code,
      solution_code
    } = body

    // Generate slug from title
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    const { data, error } = await supabase
      .from('challenges')
      .insert({
        title,
        slug,
        description,
        difficulty,
        category_id,
        created_by: user.id,
        test_cases,
        initial_code,
        solution_code,
        status: 'draft'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating challenge:', error)
    return NextResponse.json(
      { error: 'Error creating challenge' },
      { status: 500 }
    )
  }
} 