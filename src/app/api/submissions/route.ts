import { createServerComponentClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { RateLimiter } from '@/lib/rate-limiter';
import { submissionsService } from '@/src/services/submissions.service';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const rateLimiter = new RateLimiter();

interface SubmissionPostBody {
  challenge_id: string;
  code: string;
  language: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (await rateLimiter.isLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createServerComponentClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as SubmissionPostBody;
    const { challenge_id, code, language } = body;

    // Use submissions service to create submission
    const result = await submissionsService.createSubmission({
      challenge_id,
      user_id: user.id,
      code,
      language,
    });

    if (result.error) {
      log.error('Error creating submission', new Error(result.error), {
        metadata: {
          apiRoute: 'submissions',
          method: 'POST',
          submissionData: { challenge_id, code, language },
          userId: user.id,
        },
      });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const response = NextResponse.json(result.submission);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    log.error('Unhandled error in POST /api/submissions', error as Error, {
      metadata: { apiRoute: 'submissions', method: 'POST' },
    });
    return NextResponse.json(
      { error: 'Error creating submission' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const challenge_id = searchParams.get('challenge_id');

    const supabase = await createServerComponentClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use submissions service to fetch submissions
    const result = await submissionsService.getSubmissions({
      user_id: user.id,
      challenge_id: challenge_id || undefined,
    });

    if (result.error) {
      log.error('Error fetching submissions', new Error(result.error), {
        metadata: {
          apiRoute: 'submissions',
          method: 'GET',
          challengeId: challenge_id,
          userId: user.id,
        },
      });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const response = NextResponse.json(result.submissions);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    log.error('Unhandled error in GET /api/submissions', error as Error, {
      metadata: { apiRoute: 'submissions', method: 'GET' },
    });
    return NextResponse.json(
      { error: 'Error fetching submissions' },
      { status: 500 }
    );
  }
}
