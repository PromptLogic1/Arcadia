import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { toError } from '@/lib/error-guards';
// import { createClient } from '@/lib/supabase';
// import { QueueMatcherService } from '@/features/bingo-boards/services/queue-matcher.service';

export async function POST() {
  // const supabase = createClient();
  // const matcher = new QueueMatcherService();

  try {
    // TODO: Implement proper queue system with bingo_queue_entries table
    // For now, return a simple response as the queue table doesn't exist yet
    return NextResponse.json({
      matched: 0,
      message:
        'Queue system not yet implemented - missing bingo_queue_entries table',
    });
  } catch (_error) {
    logger.error('Queue processing error', toError(_error), {
      metadata: { apiRoute: 'queue/process' },
    });
    return NextResponse.json(
      { error: 'Failed to process queue' },
      { status: 500 }
    );
  }
}

// TODO: Re-enable when queue system is implemented
// Helper function to assign player colors
// function getPlayerColor(index: number): string {
//   const colors = [
//     '#FF6B6B', // Red
//     '#4ECDC4', // Teal
//     '#45B7D1', // Blue
//     '#96CEB4', // Green
//     '#FFEAA7', // Yellow
//     '#DDA0DD', // Plum
//     '#FFB347', // Orange
//     '#98D8C8'  // Mint
//   ];
//
//   return colors[index % colors.length];
// }

// GET endpoint for queue stats
export async function GET() {
  // const supabase = createClient();

  try {
    // TODO: Implement proper queue stats with bingo_queue_entries table
    // For now, return empty stats as the queue table doesn't exist yet
    const stats = {
      waiting: 0,
      matched: 0,
      expired: 0,
      averageWaitTime: 0,
      popularBoards: {},
      message:
        'Queue system not yet implemented - missing bingo_queue_entries table',
    };

    return NextResponse.json(stats);
  } catch {
    return NextResponse.json(
      { error: 'Failed to get queue stats' },
      { status: 500 }
    );
  }
}
