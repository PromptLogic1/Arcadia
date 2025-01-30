import { NextResponse } from 'next/server'
import { queueTask, checkTaskStatus } from '@/lib/task-queue'

export const maxDuration = 10 // Enforce Vercel's limit

export async function POST(req: Request) {
  // Initial fast response
  const { taskId } = await queueTask(await req.json())
  
  return NextResponse.json({ 
    taskId,
    statusUrl: `/api/task-status/${taskId}`
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59'
    }
  })
}

// New background processing endpoint
export async function GET() {
  // Implement chunked processing logic
  const results = await processTaskQueue()
  
  return NextResponse.json({ processed: results.length })
} 