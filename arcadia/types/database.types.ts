export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'user' | 'moderator' | 'admin'
export type ChallengeDifficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert'
export type ChallengeStatus = 'draft' | 'published' | 'archived'
export type SubmissionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout'
export type ProgrammingLanguage = 'javascript' | 'typescript' | 'python' | 'java' | 'cpp' | 'rust'

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
          role: UserRole
          experience_points: number
          preferred_language: ProgrammingLanguage | null
          github_username: string | null
          bio: string | null
          is_active: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_id: string
          email: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          experience_points?: number
          preferred_language?: ProgrammingLanguage | null
          github_username?: string | null
          bio?: string | null
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_id?: string
          email?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          experience_points?: number
          preferred_language?: ProgrammingLanguage | null
          github_username?: string | null
          bio?: string | null
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          icon_name: string | null
          parent_id: string | null
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          icon_name?: string | null
          parent_id?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          icon_name?: string | null
          parent_id?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      challenges: {
        Row: {
          id: string
          title: string
          slug: string
          description: string
          difficulty: ChallengeDifficulty
          status: ChallengeStatus
          category_id: string | null
          created_by: string
          test_cases: Json
          initial_code: Json
          solution_code: Json | null
          time_limit_ms: number
          memory_limit_mb: number
          points: number
          success_rate: number
          is_premium: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description: string
          difficulty: ChallengeDifficulty
          status?: ChallengeStatus
          category_id?: string | null
          created_by: string
          test_cases?: Json
          initial_code?: Json
          solution_code?: Json | null
          time_limit_ms?: number
          memory_limit_mb?: number
          points?: number
          success_rate?: number
          is_premium?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string
          difficulty?: ChallengeDifficulty
          status?: ChallengeStatus
          category_id?: string | null
          created_by?: string
          test_cases?: Json
          initial_code?: Json
          solution_code?: Json | null
          time_limit_ms?: number
          memory_limit_mb?: number
          points?: number
          success_rate?: number
          is_premium?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      submissions: {
        Row: {
          id: string
          challenge_id: string
          user_id: string
          language: ProgrammingLanguage
          code: string
          status: SubmissionStatus
          execution_time_ms: number | null
          memory_used_mb: number | null
          test_results: Json | null
          error_message: string | null
          points_earned: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          challenge_id: string
          user_id: string
          language: ProgrammingLanguage
          code: string
          status?: SubmissionStatus
          execution_time_ms?: number | null
          memory_used_mb?: number | null
          test_results?: Json | null
          error_message?: string | null
          points_earned?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          challenge_id?: string
          user_id?: string
          language?: ProgrammingLanguage
          code?: string
          status?: SubmissionStatus
          execution_time_ms?: number | null
          memory_used_mb?: number | null
          test_results?: Json | null
          error_message?: string | null
          points_earned?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Enums: {
      user_role: UserRole
      challenge_difficulty: ChallengeDifficulty
      challenge_status: ChallengeStatus
      submission_status: SubmissionStatus
      programming_language: ProgrammingLanguage
    }
  }
} 