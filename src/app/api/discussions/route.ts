import { createServerComponentClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { RateLimiter } from '@/lib/rate-limiter';
import {
  createDiscussionRequestSchema,
  getDiscussionsQuerySchema,
} from '@/lib/validation/schemas/discussions';
import {
  validateRequestBody,
  validateQueryParams,
  isValidationError,
} from '@/lib/validation/middleware';
import { communityService } from '@/src/services/community.service';

const rateLimiter = new RateLimiter();

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (await rateLimiter.isLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);

    // Validate query parameters with Zod
    const validation = validateQueryParams(
      searchParams,
      getDiscussionsQuerySchema,
      {
        apiRoute: 'discussions',
        method: 'GET',
      }
    );

    if (isValidationError(validation)) {
      return validation.error;
    }

    const {
      page = 1,
      limit = 20,
      game,
      search,
      challenge_type,
      sort,
    } = validation.data;

    // Use community service to fetch discussions
    const result = await communityService.getDiscussionsForAPI(
      {
        game,
        challenge_type,
        search,
        sort,
      },
      page,
      limit
    );

    if (result.error) {
      log.error('Error fetching discussions', new Error(result.error), {
        metadata: {
          apiRoute: 'discussions',
          method: 'GET',
          page,
          limit,
          filters: { game, challenge_type, search, sort },
        },
      });
      return NextResponse.json(
        { error: 'Failed to fetch discussions' },
        { status: 500 }
      );
    }

    // Return paginated response with metadata
    return NextResponse.json({
      data: result.discussions,
      pagination: {
        page,
        limit,
        total: result.totalCount,
        totalPages: Math.ceil(result.totalCount / limit),
      },
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
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (await rateLimiter.isLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createServerComponentClient();

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

    // Validate request body with Zod
    const validation = await validateRequestBody(
      request,
      createDiscussionRequestSchema,
      {
        apiRoute: 'discussions',
        method: 'POST',
        userId: session.user.id,
      }
    );

    if (isValidationError(validation)) {
      return validation.error;
    }

    const { title, content, game, challenge_type, tags } = validation.data;

    // Use community service to create discussion
    const result = await communityService.createDiscussion({
      title,
      content,
      author_id: session.user.id,
      game,
      challenge_type: challenge_type || null,
      tags: tags || [],
    });

    if (result.error) {
      log.error('Error creating discussion', new Error(result.error), {
        metadata: {
          apiRoute: 'discussions',
          method: 'POST',
          title,
          userId: session.user.id,
        },
      });
      return NextResponse.json(
        { error: 'Failed to create discussion' },
        { status: 500 }
      );
    }

    return NextResponse.json(result.discussion);
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
