import { NextResponse } from 'next/server'
import { getRuntimeConfig } from '@/lib/config'
import { revalidatePath } from 'next/cache'

export async function POST(req: Request) {
  try {
    const { token, path } = await req.json()
    
    // Get configuration values
    const revalidateToken = await getRuntimeConfig('REVALIDATE_TOKEN')
    const allowedPathsStr = await getRuntimeConfig('ALLOWED_REVALIDATE_PATHS')
    const allowedPaths = typeof allowedPathsStr === 'string' ? allowedPathsStr.split(',') : ['/']

    // Validate token
    if (token !== revalidateToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Validate path
    if (!allowedPaths.includes(path)) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 400 }
      )
    }

    // Revalidate the path
    revalidatePath(path)

    return NextResponse.json({
      revalidated: true,
      path
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to revalidate' },
      { status: 500 }
    )
  }
} 