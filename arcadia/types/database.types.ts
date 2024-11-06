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
          auth_id: string
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
        Insert: Omit<Tables['users']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Tables['users']['Insert']>
      }
      challenges: {
        Row: {
          id: string
          title: string
          slug: string
          description: string
          difficulty: 'easy' | 'medium' | 'hard'
          category_id: string
          created_by: string
          status: 'draft' | 'published' | 'archived'
          test_cases: Json
          initial_code: string
          solution_code: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Tables['challenges']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Tables['challenges']['Insert']>
      }
      submissions: {
        Row: {
          id: string
          challenge_id: string
          user_id: string
          code: string
          language: string
          status: 'pending' | 'running' | 'completed' | 'failed'
          results: Json | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Tables['submissions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Tables['submissions']['Insert']>
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Tables['categories']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Tables['categories']['Insert']>
      }
      challenge_tags: {
        Row: {
          challenge_id: string
          tag_id: string
        }
        Insert: Tables['challenge_tags']['Row']
        Update: Tables['challenge_tags']['Row']
      }
      tags: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: Omit<Tables['tags']['Row'], 'id' | 'created_at'>
        Update: Partial<Tables['tags']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Hilfstypaliase
export type Tables = Database['public']['Tables']