import { createServerComponentClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

interface SubmissionPostBody {
  challenge_id: string;
  code: string;
  language: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createServerComponentClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as SubmissionPostBody;
    const { challenge_id, code, language } = body;

    const { data, error } = await supabase
      .from('submissions')
      .insert({
        challenge_id,
        user_id: user.id,
        code,
        language,
        status: 'pending',
        results: null,
      })
      .select()
      .single();

    if (error) {
      log.error('Error creating submission', error, {
        metadata: {
          apiRoute: 'submissions',
          method: 'POST',
          submissionData: { challenge_id, code, language },
        },
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const response = NextResponse.json(data);
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

    let query = supabase
      .from('submissions')
      .select(
        `
        *,
        challenge:challenges(title, difficulty)
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (challenge_id) {
      query = query.eq('challenge_id', challenge_id);
    }

    const { data, error } = await query;

    if (error) {
      log.error('Error fetching submissions', error, {
        metadata: {
          apiRoute: 'submissions',
          method: 'GET',
          challengeId: challenge_id,
        },
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const response = NextResponse.json(data);
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
