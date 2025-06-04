import { createServerComponentClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';

interface DiscussionPostBody {
  title: string;
  content: string;
  game: string;
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const gameType = searchParams.get('gameType');
    
    // Validate pagination params
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit)); // Max 50 items per page
    const offset = (safePage - 1) * safeLimit;

    const supabase = await createServerComponentClient();

    // Build query with pagination
    let query = supabase
      .from('discussions')
      .select(
        `
        *,
        author:users!discussions_author_id_fkey(username, avatar_url),
        comments:comments(count)
      `,
        { count: 'exact' }
      );
    
    // Add game type filter if provided
    if (gameType && gameType !== 'all') {
      query = query.eq('game', gameType);
    }
    
    // Add pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + safeLimit - 1);

    const { data, error, count } = await query;

    if (error) {
      log.error('Error fetching discussions', error, {
        metadata: { apiRoute: 'discussions', method: 'GET', page: safePage, limit: safeLimit },
      });
      return NextResponse.json(
        { error: 'Failed to fetch discussions' },
        { status: 500 }
      );
    }

    // Return paginated response with metadata
    return NextResponse.json({
      data: data || [],
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / safeLimit)
      }
    });
  } catch (error) {
    log.error('Error fetching discussions', error, {
      metadata: { apiRoute: 'discussions', method: 'GET' },
    });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createServerComponentClient();
    const json = (await request.json()) as DiscussionPostBody;

    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError) {
      log.error('Auth error fetching session', authError, {
        metadata: { apiRoute: 'discussions', method: 'POST' },
      });
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 500 }
      );
    }

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - No active session or user ID found' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('discussions')
      .insert([
        {
          title: json.title,
          content: json.content,
          game: json.game,
          author_id: session.user.id,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      log.error('Error creating discussion', error, {
        metadata: {
          apiRoute: 'discussions',
          method: 'POST',
          title: json.title,
        },
      });
      return NextResponse.json(
        { error: 'Failed to create discussion' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    log.error('Error creating discussion', error, {
      metadata: { apiRoute: 'discussions', method: 'POST' },
    });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
