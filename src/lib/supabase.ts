import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database.types'

// Environment validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

// Client-side Supabase client (browser)
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    },
    global: {
      headers: {
        'X-Client-Info': 'arcadia-web'
      }
    }
  }
)

// Server-side Supabase client (API routes, server actions)
export const supabaseAdmin: SupabaseClient<Database> = supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'X-Client-Info': 'arcadia-server'
        }
      }
    })
  : supabase

// Type-safe table helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
export type Functions<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T]

// Helper functions
export const getUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

// Database table shortcuts
export const db = {
  users: () => supabase.from('users'),
  bingoBoards: () => supabase.from('bingo_boards'),
  bingoCards: () => supabase.from('bingo_cards'),
  sessions: () => supabase.from('bingo_sessions'),
  submissions: () => supabase.from('submissions'),
  discussions: () => supabase.from('discussions'),
} as const

// Admin database shortcuts (server-side only)
export const adminDb = {
  users: () => supabaseAdmin.from('users'),
  bingoBoards: () => supabaseAdmin.from('bingo_boards'),
  bingoCards: () => supabaseAdmin.from('bingo_cards'),
  sessions: () => supabaseAdmin.from('bingo_sessions'),
  submissions: () => supabaseAdmin.from('submissions'),
  discussions: () => supabaseAdmin.from('discussions'),
} as const

// Utility functions for error handling
export class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: string
  ) {
    super(message)
    this.name = 'SupabaseError'
  }
}

export const handleSupabaseError = (error: unknown): never => {
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    const supabaseError = error as { code: string; message: string; details?: string }
    throw new SupabaseError(supabaseError.message, supabaseError.code, supabaseError.details)
  }
  const errorMessage = error && typeof error === 'object' && 'message' in error 
    ? (error as { message: string }).message 
    : 'An unknown database error occurred'
  throw new Error(errorMessage)
}

// Type guards
export const isSupabaseError = (error: unknown): error is SupabaseError => {
  return error instanceof SupabaseError
}

export const isAuthError = (error: unknown): boolean => {
  return isSupabaseError(error) && error.code?.startsWith('auth') === true
}

// Feature flags
export const features = {
  enableRealtime: process.env.NEXT_PUBLIC_ENABLE_REALTIME === 'true',
  enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
} as const 