import type { BoardCell } from '@/components/challenges/bingo-board/components/shared/types'

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
          username: string
          full_name: string | null
          avatar_url: string | null
          role: 'user' | 'moderator' | 'admin'
          experience_points: number
          land: string | null
          region: string | null
          city: string | null
          bio: string | null
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
      discussions: {
        Row: {
          id: number
          title: string
          content: string
          game: string
          challenge_type: string | null
          tags: string[]
          upvotes: number
          author_id: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Tables['discussions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Tables['discussions']['Row'], 'id' | 'created_at' | 'updated_at'>>
      }
      comments: {
        Row: {
          id: number
          content: string
          upvotes: number
          author_id: string
          discussion_id: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Tables['comments']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Tables['comments']['Row'], 'id' | 'created_at' | 'updated_at'>>
      }
      bingo_boards: {
        Row: {
          id: string
          title: string
          creator_id: string
          size: number
          board_state: BoardCell[]
          settings: {
            teamMode: boolean
            lockout: boolean
            soundEnabled: boolean
            winConditions: {
              line: boolean
              majority: boolean
            }
          }
          status: 'draft' | 'published' | 'archived'
          game_type: string
          difficulty: 'beginner' | 'easy' | 'medium' | 'hard' | 'expert'
          is_public: boolean
          cloned_from: string | null
          votes: number
          bookmarked_count: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Tables['bingo_boards']['Row'], 'id' | 'votes' | 'bookmarked_count' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Tables['bingo_boards']['Row'], 'id' | 'created_at' | 'updated_at'>>
      }
      bingo_sessions: {
        Row: {
          id: string
          board_id: string
          status: 'active' | 'completed' | 'cancelled'
          current_state: BoardCell[]
          winner_id: string | null
          started_at: string
          ended_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Tables['bingo_sessions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Tables['bingo_sessions']['Row'], 'id' | 'created_at' | 'updated_at'>>
      }
      bingo_session_players: {
        Row: {
          session_id: string
          user_id: string
          player_name: string
          color: string
          team: number | null
          joined_at: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Tables['bingo_session_players']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Omit<Tables['bingo_session_players']['Row'], 'created_at' | 'updated_at'>>
      }
      bingo_session_queue: {
        Row: {
          id: string
          session_id: string
          user_id: string
          player_name: string
          color: string
          team: number | null
          requested_at: string
          status: 'pending' | 'approved' | 'rejected'
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Tables['bingo_session_queue']['Row'], 'id' | 'created_at' | 'updated_at' | 'processed_at'>
        Update: Partial<Tables['bingo_session_queue']['Row']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_discussion_upvotes: {
        Args: {
          discussion_id: number
        }
        Returns: void
      }
      add_comment: {
        Args: {
          p_discussion_id: number
          p_content: string
          p_author_id: string
        }
        Returns: Database['public']['Tables']['comments']['Row']
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Hilfstypaliase
export type Tables = Database['public']['Tables']