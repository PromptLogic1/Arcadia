import { NextResponse } from 'next/server';
import {
  queueTask,
  checkTaskStatus,
  type TaskPayload,
} from '@/lib/task-queue';
import { log } from '@/lib/logger';

export const maxDuration = 10; // Enforce Vercel's limit

interface ProcessTaskPostBody {
  type: string; // Should ideally be a literal type like 'bingo-generation' | 'code-execution'
  payload: TaskPayload;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { type, payload } = (await request.json()) as ProcessTaskPostBody;
    const taskId = queueTask(type, payload);
    return NextResponse.json({ success: true, taskId });
  } catch (error) {
    log.error('Error in POST /api/process-task', error as Error, {
      metadata: { apiRoute: 'process-task', method: 'POST' },
    });
    return NextResponse.json(
      { error: 'Failed to queue task' },
      { status: 500 }
    );
  }
}

// New background processing endpoint
export async function GET(request: Request): Promise<NextResponse> {
  let taskId: string | null = null; // Declare taskId here
  try {
    const { searchParams } = new URL(request.url);
    taskId = searchParams.get('taskId'); // Assign value here
    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }
    const status = await checkTaskStatus(taskId);
    return NextResponse.json(status);
  } catch (error) {
    log.error('Error in GET /api/process-task', error as Error, {
      metadata: { apiRoute: 'process-task', method: 'GET', taskId },
    });
    return NextResponse.json(
      { error: 'Failed to check task status' },
      { status: 500 }
    );
  }
}
