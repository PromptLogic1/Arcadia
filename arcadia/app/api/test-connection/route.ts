import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Explizit OPTIONS für CORS hinzufügen
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data, error } = await supabase.from('users').select('*').limit(1)
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      data
    })
  } catch (error) {
    console.error('Supabase connection failed:', error)
    return NextResponse.json({
      success: false,
      message: 'Supabase connection failed',
      error
    }, { status: 500 })
  }
} 