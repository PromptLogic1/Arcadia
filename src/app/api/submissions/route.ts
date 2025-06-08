import { createServerComponentClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { log } from '@/lib/logger';
import {
  withRateLimit,
  RATE_LIMIT_CONFIGS,
} from '@/lib/rate-limiter-middleware';
import { submissionsService } from '@/src/services/submissions.service';
import {
  createSubmissionRequestSchema,
  getSubmissionsQuerySchema,
} from '@/lib/validation/schemas/submissions';
import {
  validateRequestBody,
  validateQueryParams,
  isValidationError,
} from '@/lib/validation/middleware';

export const runtime = 'nodejs'; // Changed from 'edge' for Redis compatibility
export const dynamic = 'force-dynamic';

// POST handler with Redis rate limiting
export const POST = withRateLimit(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const supabase = await createServerComponentClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Validate request body with Zod
      const validation = await validateRequestBody(
        request,
        createSubmissionRequestSchema,
        {
          apiRoute: 'submissions',
          method: 'POST',
          userId: user.id,
        }
      );

      if (isValidationError(validation)) {
        return validation.error;
      }

      const { challenge_id, code, language } = validation.data;

      // Use submissions service to create submission
      const result = await submissionsService.createSubmission({
        challenge_id,
        user_id: user.id,
        code,
        language,
      });

      if (!result.success || !result.data) {
        log.error(
          'Error creating submission',
          new Error(result.error || 'Unknown error'),
          {
            metadata: {
              apiRoute: 'submissions',
              method: 'POST',
              submissionData: { challenge_id, code, language },
              userId: user.id,
            },
          }
        );
        return NextResponse.json(
          { error: result.error || 'Failed to create submission' },
          { status: 500 }
        );
      }

      const response = NextResponse.json(result.data);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    } catch (error) {
      log.error('Unhandled error in POST /api/submissions', error, {
        metadata: { apiRoute: 'submissions', method: 'POST' },
      });
      return NextResponse.json(
        { error: 'Error creating submission' },
        { status: 500 }
      );
    }
  },
  RATE_LIMIT_CONFIGS.create
);

// GET handler with Redis rate limiting
export const GET = withRateLimit(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);

      const supabase = await createServerComponentClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Validate query parameters with Zod
      const validation = validateQueryParams(
        searchParams,
        getSubmissionsQuerySchema,
        {
          apiRoute: 'submissions',
          method: 'GET',
          userId: user.id,
        }
      );

      if (isValidationError(validation)) {
        return validation.error;
      }

      const { challenge_id } = validation.data;

      // Use submissions service to fetch submissions
      const result = await submissionsService.getSubmissions({
        user_id: user.id,
        challenge_id: challenge_id || undefined,
      });

      if (!result.success || !result.data) {
        log.error(
          'Error fetching submissions',
          new Error(result.error || 'Unknown error'),
          {
            metadata: {
              apiRoute: 'submissions',
              method: 'GET',
              challengeId: challenge_id,
              userId: user.id,
            },
          }
        );
        return NextResponse.json(
          { error: result.error || 'Failed to fetch submissions' },
          { status: 500 }
        );
      }

      const response = NextResponse.json(result.data);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    } catch (error) {
      log.error('Unhandled error in GET /api/submissions', error, {
        metadata: { apiRoute: 'submissions', method: 'GET' },
      });
      return NextResponse.json(
        { error: 'Error fetching submissions' },
        { status: 500 }
      );
    }
  },
  RATE_LIMIT_CONFIGS.read
);
