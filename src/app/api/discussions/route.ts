import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { log } from "@/lib/logger";

interface DiscussionPostBody {
  title: string;
  content: string;
  category: string; 
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data, error } = await supabase
      .from('discussions')
      .select(`
        *,
        author:users(username, avatar_url),
        comments:comments(count),
        commentList:comments(
          id,
          content,
          created_at,
          author:users(username, avatar_url)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      log.error('Error fetching discussions', error, { metadata: { apiRoute: 'discussions', method: 'GET' } });
      return NextResponse.json({ error: "Failed to fetch discussions" }, { status: 500 });
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error('Error fetching discussions', error, { metadata: { apiRoute: 'discussions', method: 'GET' } });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const json = await request.json() as DiscussionPostBody

    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError) {
      log.error('Auth error fetching session', authError, { metadata: { apiRoute: 'discussions', method: 'POST' } });
      return NextResponse.json({ error: 'Authentication error' }, { status: 500 });
    }

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - No active session or user ID found' },
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from('discussions')
      .insert([{
        ...json,
        author_id: session.user.id,
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      log.error('Error creating discussion', error, { metadata: { apiRoute: 'discussions', method: 'POST', title: json.title } });
      return NextResponse.json({ error: "Failed to create discussion" }, { status: 500 });
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error('Error creating discussion', error, { metadata: { apiRoute: 'discussions', method: 'POST' } });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 