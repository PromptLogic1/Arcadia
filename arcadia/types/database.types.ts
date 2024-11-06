export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          full_name: string | null
          avatar_url: string | null
          role: 'user' | 'moderator' | 'admin'
          experience_points: number
          preferred_language: 'javascript' | 'typescript' | 'python' | 'java' | 'cpp' | 'rust' | null
          github_username: string | null
          bio: string | null
          is_active: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'moderator' | 'admin'
          experience_points?: number
          preferred_language?: 'javascript' | 'typescript' | 'python' | 'java' | 'cpp' | 'rust' | null
          github_username?: string | null
          bio?: string | null
          is_active?: boolean
          last_login_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'moderator' | 'admin'
          experience_points?: number
          preferred_language?: 'javascript' | 'typescript' | 'python' | 'java' | 'cpp' | 'rust' | null
          github_username?: string | null
          bio?: string | null
          is_active?: boolean
          last_login_at?: string | null
        }
      }
    }
  }
} 