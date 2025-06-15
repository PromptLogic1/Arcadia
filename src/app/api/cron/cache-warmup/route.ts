import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { enhancedCache } from '@/lib/cache-enhanced';
import { log } from '@/lib/logger';

/**
 * Cache Warmup Cron Job
 *
 * Scheduled endpoint to warm critical cache entries
 * Configured in vercel.json to run every 15 minutes
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request from Vercel
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    log.info('Starting cache warmup job');

    // Define critical cache entries to warm
    const warmupItems: Array<{
      key: string;
      fetcher: () => Promise<Record<string, unknown>>;
      options: {
        ttl: number;
        namespace: string;
      };
    }> = [
      {
        key: 'public_boards_featured',
        fetcher: async () => {
          // Mock data - replace with actual service calls
          return {
            boards: [],
            lastUpdated: new Date().toISOString(),
          };
        },
        options: {
          ttl: 4 * 60 * 60, // 4 hours
          namespace: 'public',
        },
      },
      {
        key: 'leaderboard_global',
        fetcher: async () => {
          // Mock data - replace with actual service calls
          return {
            leaders: [],
            lastUpdated: new Date().toISOString(),
          };
        },
        options: {
          ttl: 2 * 60 * 60, // 2 hours
          namespace: 'leaderboard',
        },
      },
      {
        key: 'stats_global',
        fetcher: async () => {
          return {
            totalUsers: 0,
            totalGames: 0,
            totalBoards: 0,
            lastUpdated: new Date().toISOString(),
          };
        },
        options: {
          ttl: 24 * 60 * 60, // 24 hours
          namespace: 'stats',
        },
      },
    ];

    const result = await enhancedCache.warmCache(warmupItems);

    if (result.success) {
      log.info('Cache warmup completed successfully', {
        metadata: { successCount: result.data },
      });

      return NextResponse.json({
        success: true,
        message: 'Cache warmup completed',
        warmedItems: result.data,
        timestamp: new Date().toISOString(),
      });
    } else {
      log.error(
        'Cache warmup failed',
        new Error(result.error || 'Unknown error')
      );

      return NextResponse.json(
        {
          success: false,
          message: 'Cache warmup failed',
          error: result.error,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    log.error(
      'Cache warmup cron job failed',
      error instanceof Error ? error : new Error(String(error))
    );

    return NextResponse.json(
      {
        success: false,
        message: 'Cache warmup job failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Ensure this runs on Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
