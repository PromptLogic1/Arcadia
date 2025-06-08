import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRuntimeConfig } from '@/lib/config';
import { revalidatePath } from 'next/cache';
import { log } from '@/lib/logger';
import {
  withRateLimit,
  RATE_LIMIT_CONFIGS,
} from '@/lib/rate-limiter-middleware';
import { revalidateRequestSchema } from '@/lib/validation/schemas/common';
import {
  validateRequestBody,
  isValidationError,
} from '@/lib/validation/middleware';

export const POST = withRateLimit(
  async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Validate request body with Zod
      const validation = await validateRequestBody(
        req,
        revalidateRequestSchema,
        {
          apiRoute: 'revalidate',
          method: 'POST',
        }
      );

      if (isValidationError(validation)) {
        return validation.error;
      }

      const { token, path } = validation.data;

      // Get configuration values
      const revalidateToken = await getRuntimeConfig('REVALIDATE_TOKEN');
      const allowedPathsStr = await getRuntimeConfig(
        'ALLOWED_REVALIDATE_PATHS'
      );
      const allowedPaths =
        typeof allowedPathsStr === 'string'
          ? allowedPathsStr.split(',')
          : ['/'];

      // Validate token
      if (token !== revalidateToken) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }

      // Validate path
      if (!allowedPaths.includes(path)) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
      }

      // Revalidate the path
      revalidatePath(path);

      return NextResponse.json({
        revalidated: true,
        path,
      });
    } catch (error) {
      log.error('Error in POST /api/revalidate', error, {
        metadata: { apiRoute: 'revalidate', method: 'POST' },
      });
      return NextResponse.json(
        { error: 'Failed to revalidate' },
        { status: 500 }
      );
    }
  },
  RATE_LIMIT_CONFIGS.gameAction
);
