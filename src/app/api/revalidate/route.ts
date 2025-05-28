import { NextResponse } from 'next/server';
import { getRuntimeConfig } from '@/lib/config';
import { revalidatePath } from 'next/cache';
import { log } from '@/lib/logger';

interface RevalidatePostBody {
  token: string;
  path: string;
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { token, path } = (await req.json()) as RevalidatePostBody;

    // Get configuration values
    const revalidateToken = await getRuntimeConfig('REVALIDATE_TOKEN');
    const allowedPathsStr = await getRuntimeConfig('ALLOWED_REVALIDATE_PATHS');
    const allowedPaths =
      typeof allowedPathsStr === 'string' ? allowedPathsStr.split(',') : ['/'];

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
    log.error('Error in POST /api/revalidate', error as Error, {
      metadata: { apiRoute: 'revalidate', method: 'POST' },
    });
    return NextResponse.json(
      { error: 'Failed to revalidate' },
      { status: 500 }
    );
  }
}
