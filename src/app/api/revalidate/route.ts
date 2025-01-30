import { NextResponse } from 'next/server'
import { getRuntimeConfig } from '@/lib/config'
import { revalidatePath } from 'next/cache'

export async function POST(req: Request) {
  const secret = await getRuntimeConfig('REVALIDATE_SECRET')
  
  if (req.headers.get('x-vercel-signature') !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { paths } = await req.json()
  paths.forEach((path: string) => revalidatePath(path))
  
  return NextResponse.json({ revalidated: true })
} 