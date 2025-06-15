import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { enhancedCache } from '@/lib/cache-enhanced';
import { log } from '@/lib/logger';

/**
 * Cleanup Cron Job
 *
 * Scheduled endpoint for maintenance tasks
 * Configured in vercel.json to run daily at 2 AM
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request from Vercel
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    log.info('Starting cleanup job');

    const tasks = [];
    const taskResults = {
      expiredSessions: 0,
      tempData: 0,
      staleCache: 0,
      errors: 0,
    };

    // Task 1: Clean up expired session data
    try {
      const sessionCleanup = await enhancedCache.invalidateByPattern(
        'expired:*',
        'session'
      );

      if (sessionCleanup.success) {
        taskResults.expiredSessions = sessionCleanup.data || 0;
        tasks.push('✅ Session cleanup completed');
      } else {
        taskResults.errors++;
        tasks.push('❌ Session cleanup failed');
      }
    } catch (error) {
      taskResults.errors++;
      tasks.push('❌ Session cleanup error');
      log.error(
        'Session cleanup failed',
        error instanceof Error ? error : new Error(String(error))
      );
    }

    // Task 2: Clean up temporary data
    try {
      const tempCleanup = await enhancedCache.invalidateByPattern(
        'temp:*',
        'general'
      );

      if (tempCleanup.success) {
        taskResults.tempData = tempCleanup.data || 0;
        tasks.push('✅ Temporary data cleanup completed');
      } else {
        taskResults.errors++;
        tasks.push('❌ Temporary data cleanup failed');
      }
    } catch (error) {
      taskResults.errors++;
      tasks.push('❌ Temporary data cleanup error');
      log.error(
        'Temp data cleanup failed',
        error instanceof Error ? error : new Error(String(error))
      );
    }

    // Task 3: Clean up stale cache entries
    try {
      const staleCleanup = await enhancedCache.invalidateByPattern(
        'stale:*',
        'cache'
      );

      if (staleCleanup.success) {
        taskResults.staleCache = staleCleanup.data || 0;
        tasks.push('✅ Stale cache cleanup completed');
      } else {
        taskResults.errors++;
        tasks.push('❌ Stale cache cleanup failed');
      }
    } catch (error) {
      taskResults.errors++;
      tasks.push('❌ Stale cache cleanup error');
      log.error(
        'Stale cache cleanup failed',
        error instanceof Error ? error : new Error(String(error))
      );
    }

    // Task 4: Reset cache metrics (daily reset)
    try {
      enhancedCache.resetMetrics();
      tasks.push('✅ Cache metrics reset');
    } catch (error) {
      taskResults.errors++;
      tasks.push('❌ Cache metrics reset failed');
      log.error(
        'Cache metrics reset failed',
        error instanceof Error ? error : new Error(String(error))
      );
    }

    // Task 5: Log cleanup summary
    const totalCleaned =
      taskResults.expiredSessions +
      taskResults.tempData +
      taskResults.staleCache;

    log.info('Cleanup job completed', {
      metadata: {
        totalItemsCleaned: totalCleaned,
        tasksCompleted: tasks.length - taskResults.errors,
        errors: taskResults.errors,
        details: taskResults,
      },
    });

    const success = taskResults.errors === 0;
    const status = success ? 200 : 207; // 207 = Multi-Status (partial success)

    return NextResponse.json(
      {
        success,
        message: success
          ? 'Cleanup completed successfully'
          : 'Cleanup completed with errors',
        tasks,
        results: taskResults,
        totalCleaned,
        timestamp: new Date().toISOString(),
      },
      { status }
    );
  } catch (error) {
    log.error(
      'Cleanup cron job failed',
      error instanceof Error ? error : new Error(String(error))
    );

    return NextResponse.json(
      {
        success: false,
        message: 'Cleanup job failed',
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
