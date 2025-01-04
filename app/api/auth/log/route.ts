import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const data = await request.json()
  
  // Server-side logging
  console.log('\x1b[35m%s\x1b[0m', '[Auth]', data.message)
  if (data.details) {
    console.log('\x1b[36m%s\x1b[0m', '[Details]', JSON.stringify(data.details, null, 2))
  }

  return NextResponse.json({ success: true })
} 