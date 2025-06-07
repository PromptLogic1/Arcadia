export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bingo_boards: {
        Row: {
          board_state: Json | null
          bookmarked_count: number | null
          cloned_from: string | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          game_type: Database["public"]["Enums"]["game_category"]
          id: string
          is_public: boolean | null
          settings: Json | null
          size: number | null
          status: Database["public"]["Enums"]["board_status"] | null
          title: string
          updated_at: string | null
          version: number | null
          votes: number | null
        }
        Insert: {
          board_state?: Json | null
          bookmarked_count?: number | null
          cloned_from?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          game_type: Database["public"]["Enums"]["game_category"]
          id?: string
          is_public?: boolean | null
          settings?: Json | null
          size?: number | null
          status?: Database["public"]["Enums"]["board_status"] | null
          title: string
          updated_at?: string | null
          version?: number | null
          votes?: number | null
        }
        Update: {
          board_state?: Json | null
          bookmarked_count?: number | null
          cloned_from?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          game_type?: Database["public"]["Enums"]["game_category"]
          id?: string
          is_public?: boolean | null
          settings?: Json | null
          size?: number | null
          status?: Database["public"]["Enums"]["board_status"] | null
          title?: string
          updated_at?: string | null
          version?: number | null
          votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bingo_boards_cloned_from_fkey"
            columns: ["cloned_from"]
            isOneToOne: false
            referencedRelation: "bingo_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_boards_cloned_from_fkey"
            columns: ["cloned_from"]
            isOneToOne: false
            referencedRelation: "public_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_boards_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_boards_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bingo_cards: {
        Row: {
          created_at: string | null
          creator_id: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          game_type: Database["public"]["Enums"]["game_category"]
          id: string
          is_public: boolean | null
          tags: string[] | null
          title: string
          updated_at: string | null
          votes: number | null
        }
        Insert: {
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          game_type: Database["public"]["Enums"]["game_category"]
          id?: string
          is_public?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          votes?: number | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          game_type?: Database["public"]["Enums"]["game_category"]
          id?: string
          is_public?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bingo_cards_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_cards_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bingo_queue_entries: {
        Row: {
          board_id: string | null
          created_at: string | null
          id: string
          matched_at: string | null
          matched_session_id: string | null
          preferences: Json | null
          status: Database["public"]["Enums"]["queue_status"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          board_id?: string | null
          created_at?: string | null
          id?: string
          matched_at?: string | null
          matched_session_id?: string | null
          preferences?: Json | null
          status?: Database["public"]["Enums"]["queue_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          board_id?: string | null
          created_at?: string | null
          id?: string
          matched_at?: string | null
          matched_session_id?: string | null
          preferences?: Json | null
          status?: Database["public"]["Enums"]["queue_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bingo_queue_entries_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "bingo_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_queue_entries_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "public_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_queue_entries_matched_session_id_fkey"
            columns: ["matched_session_id"]
            isOneToOne: false
            referencedRelation: "bingo_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_queue_entries_matched_session_id_fkey"
            columns: ["matched_session_id"]
            isOneToOne: false
            referencedRelation: "session_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_queue_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_queue_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bingo_session_cells: {
        Row: {
          board_id: string | null
          cell_data: Json | null
          created_at: string | null
          id: string
          session_id: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          board_id?: string | null
          cell_data?: Json | null
          created_at?: string | null
          id?: string
          session_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          board_id?: string | null
          cell_data?: Json | null
          created_at?: string | null
          id?: string
          session_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bingo_session_cells_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "bingo_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_session_cells_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "public_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_session_cells_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bingo_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_session_cells_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      bingo_session_events: {
        Row: {
          board_id: string | null
          cell_position: number | null
          created_at: string | null
          data: Json | null
          event_data: Json | null
          event_type: Database["public"]["Enums"]["session_event_type"]
          id: string
          player_id: string | null
          session_id: string | null
          timestamp: number
          updated_at: string | null
          user_id: string | null
          version: number | null
        }
        Insert: {
          board_id?: string | null
          cell_position?: number | null
          created_at?: string | null
          data?: Json | null
          event_data?: Json | null
          event_type: Database["public"]["Enums"]["session_event_type"]
          id?: string
          player_id?: string | null
          session_id?: string | null
          timestamp: number
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Update: {
          board_id?: string | null
          cell_position?: number | null
          created_at?: string | null
          data?: Json | null
          event_data?: Json | null
          event_type?: Database["public"]["Enums"]["session_event_type"]
          id?: string
          player_id?: string | null
          session_id?: string | null
          timestamp?: number
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bingo_session_events_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "bingo_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_session_events_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "public_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_session_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_session_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_session_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bingo_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_session_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_session_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_session_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bingo_session_players: {
        Row: {
          avatar_url: string | null
          color: string
          created_at: string | null
          display_name: string
          id: string | null
          is_host: boolean | null
          is_ready: boolean | null
          joined_at: string | null
          left_at: string | null
          position: number | null
          score: number | null
          session_id: string
          team: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          color: string
          created_at?: string | null
          display_name: string
          id?: string | null
          is_host?: boolean | null
          is_ready?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          position?: number | null
          score?: number | null
          session_id: string
          team?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          color?: string
          created_at?: string | null
          display_name?: string
          id?: string | null
          is_host?: boolean | null
          is_ready?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          position?: number | null
          score?: number | null
          session_id?: string
          team?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bingo_session_players_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bingo_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_session_players_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_session_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_session_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bingo_session_queue: {
        Row: {
          color: string
          created_at: string | null
          id: string
          player_name: string
          processed_at: string | null
          requested_at: string | null
          session_id: string | null
          status: Database["public"]["Enums"]["queue_status"] | null
          team: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          color: string
          created_at?: string | null
          id?: string
          player_name: string
          processed_at?: string | null
          requested_at?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["queue_status"] | null
          team?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          player_name?: string
          processed_at?: string | null
          requested_at?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["queue_status"] | null
          team?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bingo_session_queue_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bingo_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_session_queue_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_session_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_session_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bingo_sessions: {
        Row: {
          board_id: string | null
          created_at: string | null
          current_state: Json | null
          ended_at: string | null
          host_id: string | null
          id: string
          session_code: string | null
          settings:
            | Database["public"]["CompositeTypes"]["session_settings"]
            | null
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"] | null
          updated_at: string | null
          version: number | null
          winner_id: string | null
        }
        Insert: {
          board_id?: string | null
          created_at?: string | null
          current_state?: Json | null
          ended_at?: string | null
          host_id?: string | null
          id?: string
          session_code?: string | null
          settings?:
            | Database["public"]["CompositeTypes"]["session_settings"]
            | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"] | null
          updated_at?: string | null
          version?: number | null
          winner_id?: string | null
        }
        Update: {
          board_id?: string | null
          created_at?: string | null
          current_state?: Json | null
          ended_at?: string | null
          host_id?: string | null
          id?: string
          session_code?: string | null
          settings?:
            | Database["public"]["CompositeTypes"]["session_settings"]
            | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"] | null
          updated_at?: string | null
          version?: number | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bingo_sessions_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "bingo_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_sessions_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "public_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_sessions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_sessions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_sessions_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_sessions_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      board_bookmarks: {
        Row: {
          board_id: string
          created_at: string | null
          user_id: string
        }
        Insert: {
          board_id: string
          created_at?: string | null
          user_id: string
        }
        Update: {
          board_id?: string
          created_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_bookmarks_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "bingo_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_bookmarks_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "public_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      board_votes: {
        Row: {
          board_id: string
          created_at: string | null
          updated_at: string | null
          user_id: string
          vote: Database["public"]["Enums"]["vote_type"]
        }
        Insert: {
          board_id: string
          created_at?: string | null
          updated_at?: string | null
          user_id: string
          vote: Database["public"]["Enums"]["vote_type"]
        }
        Update: {
          board_id?: string
          created_at?: string | null
          updated_at?: string | null
          user_id?: string
          vote?: Database["public"]["Enums"]["vote_type"]
        }
        Relationships: [
          {
            foreignKeyName: "board_votes_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "bingo_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_votes_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "public_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      card_votes: {
        Row: {
          card_id: string
          created_at: string | null
          updated_at: string | null
          user_id: string
          vote: Database["public"]["Enums"]["vote_type"]
        }
        Insert: {
          card_id: string
          created_at?: string | null
          updated_at?: string | null
          user_id: string
          vote: Database["public"]["Enums"]["vote_type"]
        }
        Update: {
          card_id?: string
          created_at?: string | null
          updated_at?: string | null
          user_id?: string
          vote?: Database["public"]["Enums"]["vote_type"]
        }
        Relationships: [
          {
            foreignKeyName: "card_votes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "bingo_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      challenge_tags: {
        Row: {
          challenge_id: string
          tag_id: string
        }
        Insert: {
          challenge_id: string
          tag_id: string
        }
        Update: {
          challenge_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_tags_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          id: string
          initial_code: string | null
          slug: string
          solution_code: string | null
          status: Database["public"]["Enums"]["challenge_status"] | null
          test_cases: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          initial_code?: string | null
          slug: string
          solution_code?: string | null
          status?: Database["public"]["Enums"]["challenge_status"] | null
          test_cases?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          initial_code?: string | null
          slug?: string
          solution_code?: string | null
          status?: Database["public"]["Enums"]["challenge_status"] | null
          test_cases?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          discussion_id: number | null
          id: number
          updated_at: string | null
          upvotes: number | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          discussion_id?: number | null
          id?: number
          updated_at?: string | null
          upvotes?: number | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          discussion_id?: number | null
          id?: number
          updated_at?: string | null
          upvotes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      community_event_participants: {
        Row: {
          created_at: string | null
          event_id: string
          status: Database["public"]["Enums"]["event_participant_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          status?: Database["public"]["Enums"]["event_participant_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          status?: Database["public"]["Enums"]["event_participant_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "community_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      community_event_tags: {
        Row: {
          created_at: string | null
          event_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_event_tags_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "community_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_event_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      community_events: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          game_type: Database["public"]["Enums"]["game_category"]
          id: string
          max_participants: number | null
          organizer_id: string | null
          prize_pool: string | null
          start_date: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          game_type: Database["public"]["Enums"]["game_category"]
          id?: string
          max_participants?: number | null
          organizer_id?: string | null
          prize_pool?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          game_type?: Database["public"]["Enums"]["game_category"]
          id?: string
          max_participants?: number | null
          organizer_id?: string | null
          prize_pool?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          author_id: string | null
          challenge_type: string | null
          content: string
          created_at: string | null
          game: string
          id: number
          tags: string[] | null
          title: string
          updated_at: string | null
          upvotes: number | null
        }
        Insert: {
          author_id?: string | null
          challenge_type?: string | null
          content: string
          created_at?: string | null
          game: string
          id?: number
          tags?: string[] | null
          title: string
          updated_at?: string | null
          upvotes?: number | null
        }
        Update: {
          author_id?: string | null
          challenge_type?: string | null
          content?: string
          created_at?: string | null
          game?: string
          id?: number
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          upvotes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "discussions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      game_results: {
        Row: {
          bonus_points: number | null
          created_at: string | null
          final_score: number
          id: string
          mistake_count: number | null
          patterns_achieved: Json | null
          placement: number | null
          session_id: string | null
          time_to_win: number | null
          user_id: string | null
        }
        Insert: {
          bonus_points?: number | null
          created_at?: string | null
          final_score?: number
          id?: string
          mistake_count?: number | null
          patterns_achieved?: Json | null
          placement?: number | null
          session_id?: string | null
          time_to_win?: number | null
          user_id?: string | null
        }
        Update: {
          bonus_points?: number | null
          created_at?: string | null
          final_score?: number
          id?: string
          mistake_count?: number | null
          patterns_achieved?: Json | null
          placement?: number | null
          session_id?: string | null
          time_to_win?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bingo_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          challenge_id: string | null
          code: string
          created_at: string | null
          id: string
          language: string
          results: Json | null
          status: Database["public"]["Enums"]["submission_status"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          challenge_id?: string | null
          code: string
          created_at?: string | null
          id?: string
          language: string
          results?: Json | null
          status?: Database["public"]["Enums"]["submission_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          challenge_id?: string | null
          code?: string
          created_at?: string | null
          id?: string
          language?: string
          results?: Json | null
          status?: Database["public"]["Enums"]["submission_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_history: {
        Row: {
          action: Database["public"]["Enums"]["tag_action"]
          changes: Json | null
          created_at: string | null
          id: string
          performed_by: string | null
          tag_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["tag_action"]
          changes?: Json | null
          created_at?: string | null
          id?: string
          performed_by?: string | null
          tag_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["tag_action"]
          changes?: Json | null
          created_at?: string | null
          id?: string
          performed_by?: string | null
          tag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tag_history_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_history_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_history_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_reports: {
        Row: {
          id: string
          reason: string
          tag_id: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          reason: string
          tag_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          reason?: string
          tag_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tag_reports_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_votes: {
        Row: {
          id: string
          tag_id: string | null
          timestamp: string | null
          user_id: string | null
          vote: Database["public"]["Enums"]["vote_type"]
        }
        Insert: {
          id?: string
          tag_id?: string | null
          timestamp?: string | null
          user_id?: string | null
          vote: Database["public"]["Enums"]["vote_type"]
        }
        Update: {
          id?: string
          tag_id?: string | null
          timestamp?: string | null
          user_id?: string | null
          vote?: Database["public"]["Enums"]["vote_type"]
        }
        Relationships: [
          {
            foreignKeyName: "tag_votes_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          category: Database["public"]["CompositeTypes"]["tag_category"] | null
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string
          game: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["tag_status"] | null
          type: Database["public"]["Enums"]["tag_type"]
          updated_at: string | null
          usage_count: number | null
          votes: number | null
        }
        Insert: {
          category?: Database["public"]["CompositeTypes"]["tag_category"] | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          game?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["tag_status"] | null
          type?: Database["public"]["Enums"]["tag_type"]
          updated_at?: string | null
          usage_count?: number | null
          votes?: number | null
        }
        Update: {
          category?: Database["public"]["CompositeTypes"]["tag_category"] | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          game?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["tag_status"] | null
          type?: Database["public"]["Enums"]["tag_type"]
          updated_at?: string | null
          usage_count?: number | null
          votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          points: number | null
          unlocked_at: string | null
          user_id: string | null
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          points?: number | null
          unlocked_at?: string | null
          user_id?: string | null
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          points?: number | null
          unlocked_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at: string | null
          data: Json | null
          id: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at?: string | null
          data?: Json | null
          id?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          created_at?: string | null
          data?: Json | null
          id?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bookmarks: {
        Row: {
          board_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          board_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          board_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bookmarks_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "bingo_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bookmarks_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "public_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_friends: {
        Row: {
          created_at: string | null
          friend_id: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_friends_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_friends_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_friends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_friends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: unknown | null
          last_activity: string | null
          session_token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          expires_at: string
          id?: string
          ip_address?: unknown | null
          last_activity?: string | null
          session_token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          last_activity?: string | null
          session_token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_statistics: {
        Row: {
          average_score: number | null
          current_win_streak: number | null
          fastest_win: number | null
          favorite_pattern: string | null
          games_completed: number | null
          games_won: number | null
          highest_score: number | null
          last_game_at: string | null
          longest_win_streak: number | null
          patterns_completed: Json | null
          total_games: number | null
          total_playtime: number | null
          total_score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_score?: number | null
          current_win_streak?: number | null
          fastest_win?: number | null
          favorite_pattern?: string | null
          games_completed?: number | null
          games_won?: number | null
          highest_score?: number | null
          last_game_at?: string | null
          longest_win_streak?: number | null
          patterns_completed?: Json | null
          total_games?: number | null
          total_playtime?: number | null
          total_score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_score?: number | null
          current_win_streak?: number | null
          fastest_win?: number | null
          favorite_pattern?: string | null
          games_completed?: number | null
          games_won?: number | null
          highest_score?: number | null
          last_game_at?: string | null
          longest_win_streak?: number | null
          patterns_completed?: Json | null
          total_games?: number | null
          total_playtime?: number | null
          total_score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_statistics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_statistics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          achievements_visibility:
            | Database["public"]["Enums"]["visibility_type"]
            | null
          auth_id: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          experience_points: number | null
          full_name: string | null
          id: string
          land: string | null
          last_login_at: string | null
          profile_visibility:
            | Database["public"]["Enums"]["visibility_type"]
            | null
          region: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          submissions_visibility:
            | Database["public"]["Enums"]["visibility_type"]
            | null
          updated_at: string | null
          username: string
        }
        Insert: {
          achievements_visibility?:
            | Database["public"]["Enums"]["visibility_type"]
            | null
          auth_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          experience_points?: number | null
          full_name?: string | null
          id?: string
          land?: string | null
          last_login_at?: string | null
          profile_visibility?:
            | Database["public"]["Enums"]["visibility_type"]
            | null
          region?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          submissions_visibility?:
            | Database["public"]["Enums"]["visibility_type"]
            | null
          updated_at?: string | null
          username: string
        }
        Update: {
          achievements_visibility?:
            | Database["public"]["Enums"]["visibility_type"]
            | null
          auth_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          experience_points?: number | null
          full_name?: string | null
          id?: string
          land?: string | null
          last_login_at?: string | null
          profile_visibility?:
            | Database["public"]["Enums"]["visibility_type"]
            | null
          region?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          submissions_visibility?:
            | Database["public"]["Enums"]["visibility_type"]
            | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboards: {
        Row: {
          avatar_url: string | null
          avg_score: number | null
          best_streak: number | null
          fastest_win: number | null
          games_played: number | null
          id: string | null
          last_game_at: string | null
          points_per_game: number | null
          total_score: number | null
          updated_at: string | null
          username: string | null
          win_rate: number | null
          wins: number | null
        }
        Relationships: []
      }
      public_boards: {
        Row: {
          board_state: Json | null
          bookmark_count: number | null
          bookmarked_count: number | null
          cloned_from: string | null
          created_at: string | null
          creator_avatar: string | null
          creator_id: string | null
          creator_username: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          game_type: Database["public"]["Enums"]["game_category"] | null
          id: string | null
          is_public: boolean | null
          settings: Json | null
          size: number | null
          status: Database["public"]["Enums"]["board_status"] | null
          title: string | null
          updated_at: string | null
          version: number | null
          votes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bingo_boards_cloned_from_fkey"
            columns: ["cloned_from"]
            isOneToOne: false
            referencedRelation: "bingo_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_boards_cloned_from_fkey"
            columns: ["cloned_from"]
            isOneToOne: false
            referencedRelation: "public_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_boards_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_boards_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      session_stats: {
        Row: {
          board_id: string | null
          board_title: string | null
          created_at: string | null
          current_player_count: number | null
          current_state: Json | null
          ended_at: string | null
          host_id: string | null
          host_username: string | null
          id: string | null
          session_code: string | null
          settings:
            | Database["public"]["CompositeTypes"]["session_settings"]
            | null
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"] | null
          updated_at: string | null
          version: number | null
          winner_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bingo_sessions_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "bingo_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_sessions_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "public_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_sessions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_sessions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_sessions_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_sessions_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_comment: {
        Args: {
          p_discussion_id: number
          p_content: string
          p_author_id: string
        }
        Returns: number
      }
      cleanup_expired_queue_entries: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      increment_discussion_upvotes: {
        Args: { discussion_id: number }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_user_activity: {
        Args: {
          p_user_id: string
          p_activity_type: Database["public"]["Enums"]["activity_type"]
          p_data?: Json
        }
        Returns: string
      }
    }
    Enums: {
      activity_type:
        | "login"
        | "logout"
        | "board_create"
        | "board_join"
        | "board_complete"
        | "submission_create"
        | "discussion_create"
        | "comment_create"
        | "achievement_unlock"
      board_status: "draft" | "active" | "paused" | "completed" | "archived"
      challenge_status: "draft" | "published" | "archived"
      difficulty_level: "beginner" | "easy" | "medium" | "hard" | "expert"
      event_participant_status:
        | "interested"
        | "registered"
        | "waitlisted"
        | "checked_in"
      event_status: "upcoming" | "active" | "completed" | "cancelled"
      game_category:
        | "All Games"
        | "World of Warcraft"
        | "Fortnite"
        | "Minecraft"
        | "Among Us"
        | "Apex Legends"
        | "League of Legends"
        | "Overwatch"
        | "Call of Duty: Warzone"
        | "Valorant"
        | "CS:GO"
        | "Dota 2"
        | "Rocket League"
        | "Fall Guys"
        | "Dead by Daylight"
        | "Cyberpunk 2077"
        | "The Witcher 3"
        | "Elden Ring"
        | "Dark Souls"
        | "Bloodborne"
        | "Sekiro"
        | "Hollow Knight"
        | "Celeste"
        | "Hades"
        | "The Binding of Isaac"
        | "Risk of Rain 2"
        | "Deep Rock Galactic"
        | "Valheim"
        | "Subnautica"
        | "No Man's Sky"
        | "Terraria"
        | "Stardew Valley"
        | "Animal Crossing"
        | "Splatoon 3"
        | "Super Mario Odyssey"
        | "The Legend of Zelda: Breath of the Wild"
        | "Super Smash Bros. Ultimate"
      queue_status: "waiting" | "matched" | "cancelled"
      session_event_type:
        | "cell_marked"
        | "cell_unmarked"
        | "player_joined"
        | "player_left"
        | "game_started"
        | "game_ended"
      session_status: "waiting" | "active" | "completed" | "cancelled"
      submission_status: "pending" | "running" | "completed" | "failed"
      tag_action:
        | "created"
        | "updated"
        | "deleted"
        | "voted"
        | "reported"
        | "create"
        | "update"
        | "delete"
        | "vote"
        | "verify"
        | "archive"
      tag_status:
        | "active"
        | "pending"
        | "rejected"
        | "archived"
        | "proposed"
        | "verified"
        | "suspended"
      tag_type:
        | "category"
        | "difficulty"
        | "theme"
        | "mechanic"
        | "custom"
        | "core"
        | "game"
        | "community"
      user_role: "user" | "premium" | "moderator" | "admin"
      visibility_type: "public" | "friends" | "private"
      vote_type: "up" | "down"
    }
    CompositeTypes: {
      board_cell: {
        cell_id: string | null
        text: string | null
        colors: string[] | null
        completed_by: string[] | null
        blocked: boolean | null
        is_marked: boolean | null
        version: number | null
        last_updated: number | null
        last_modified_by: string | null
      }
      board_settings: {
        team_mode: boolean | null
        lockout: boolean | null
        sound_enabled: boolean | null
        win_conditions:
          | Database["public"]["CompositeTypes"]["win_conditions"]
          | null
      }
      session_settings: {
        max_players: number | null
        allow_spectators: boolean | null
        auto_start: boolean | null
        time_limit: number | null
        require_approval: boolean | null
        password: string | null
      }
      tag_category: {
        id: string | null
        name: string | null
        is_required: boolean | null
        allow_multiple: boolean | null
        valid_for_games: string[] | null
      }
      win_conditions: {
        line: boolean | null
        majority: boolean | null
        diagonal: boolean | null
        corners: boolean | null
      }
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_type: [
        "login",
        "logout",
        "board_create",
        "board_join",
        "board_complete",
        "submission_create",
        "discussion_create",
        "comment_create",
        "achievement_unlock",
      ],
      board_status: ["draft", "active", "paused", "completed", "archived"],
      challenge_status: ["draft", "published", "archived"],
      difficulty_level: ["beginner", "easy", "medium", "hard", "expert"],
      event_participant_status: [
        "interested",
        "registered",
        "waitlisted",
        "checked_in",
      ],
      event_status: ["upcoming", "active", "completed", "cancelled"],
      game_category: [
        "All Games",
        "World of Warcraft",
        "Fortnite",
        "Minecraft",
        "Among Us",
        "Apex Legends",
        "League of Legends",
        "Overwatch",
        "Call of Duty: Warzone",
        "Valorant",
        "CS:GO",
        "Dota 2",
        "Rocket League",
        "Fall Guys",
        "Dead by Daylight",
        "Cyberpunk 2077",
        "The Witcher 3",
        "Elden Ring",
        "Dark Souls",
        "Bloodborne",
        "Sekiro",
        "Hollow Knight",
        "Celeste",
        "Hades",
        "The Binding of Isaac",
        "Risk of Rain 2",
        "Deep Rock Galactic",
        "Valheim",
        "Subnautica",
        "No Man's Sky",
        "Terraria",
        "Stardew Valley",
        "Animal Crossing",
        "Splatoon 3",
        "Super Mario Odyssey",
        "The Legend of Zelda: Breath of the Wild",
        "Super Smash Bros. Ultimate",
      ],
      queue_status: ["waiting", "matched", "cancelled"],
      session_event_type: [
        "cell_marked",
        "cell_unmarked",
        "player_joined",
        "player_left",
        "game_started",
        "game_ended",
      ],
      session_status: ["waiting", "active", "completed", "cancelled"],
      submission_status: ["pending", "running", "completed", "failed"],
      tag_action: [
        "created",
        "updated",
        "deleted",
        "voted",
        "reported",
        "create",
        "update",
        "delete",
        "vote",
        "verify",
        "archive",
      ],
      tag_status: [
        "active",
        "pending",
        "rejected",
        "archived",
        "proposed",
        "verified",
        "suspended",
      ],
      tag_type: [
        "category",
        "difficulty",
        "theme",
        "mechanic",
        "custom",
        "core",
        "game",
        "community",
      ],
      user_role: ["user", "premium", "moderator", "admin"],
      visibility_type: ["public", "friends", "private"],
      vote_type: ["up", "down"],
    },
  },
} as const