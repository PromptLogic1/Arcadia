import { NextResponse } from 'next/server'
import { queueTask, checkTaskStatus } from '@/lib/task-queue'

export const maxDuration = 10 // Enforce Vercel's limit

export async function POST(request: Request) {
  try {
    const { taskId } = await request.json()
    await queueTask(taskId)
    return NextResponse.json({ success: true, taskId })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to queue task' },
      { status: 500 }
    )
  }
}

// New background processing endpoint
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }
    const status = await checkTaskStatus(taskId)
    return NextResponse.json(status)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check task status' },
      { status: 500 }
    )
  }
} 