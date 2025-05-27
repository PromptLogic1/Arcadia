// Main database types file that combines all modular type definitions

// Re-export all core types
export * from './database.core'

// Import all table interfaces
import type {
  BingoBoardsTable,
  BingoCardsTable,
  BingoSessionsTable,
  BingoSessionPlayersTable,
  BingoSessionQueueTable,
  BingoSessionEventsTable,
  BingoSessionCellsTable
} from './database.bingo'

import type {
  UsersTable,
  UserSessionsTable,
  UserFriendsTable,
  UserAchievementsTable,
  DiscussionsTable,
  CommentsTable,
  TagsTable,
  TagVotesTable,
  TagReportsTable,
  TagHistoryTable
} from './database.users'

import type {
  CategoriesTable,
  ChallengesTable,
  ChallengeTagsTable,
  SubmissionsTable,
  BoardBookmarksTable,
  BoardVotesTable,
  CardVotesTable
} from './database.challenges'

// =====================================================================
// MAIN DATABASE INTERFACE
// =====================================================================

export interface Database {
  public: {
    Tables: {
      // Bingo-related tables
      bingo_boards: BingoBoardsTable
      bingo_cards: BingoCardsTable
      bingo_sessions: BingoSessionsTable
      bingo_session_players: BingoSessionPlayersTable
      bingo_session_queue: BingoSessionQueueTable
      bingo_session_events: BingoSessionEventsTable
      bingo_session_cells: BingoSessionCellsTable
      
      // User and community tables
      users: UsersTable
      user_sessions: UserSessionsTable
      user_friends: UserFriendsTable
      user_achievements: UserAchievementsTable
      discussions: DiscussionsTable
      comments: CommentsTable
      tags: TagsTable
      tag_votes: TagVotesTable
      tag_reports: TagReportsTable
      tag_history: TagHistoryTable
      
      // Challenge and other tables
      categories: CategoriesTable
      challenges: ChallengesTable
      challenge_tags: ChallengeTagsTable
      submissions: SubmissionsTable
      board_bookmarks: BoardBookmarksTable
      board_votes: BoardVotesTable
      card_votes: CardVotesTable
    }
    Views: {
      [_ in never]: never
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
      increment_discussion_upvotes: {
        Args: { discussion_id: number }
        Returns: undefined
      }
    }
    Enums: {
      board_status: "draft" | "active" | "paused" | "completed" | "archived"
      challenge_status: "draft" | "published" | "archived"
      difficulty_level: "beginner" | "easy" | "medium" | "hard" | "expert"
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
      queue_status:
        | "pending"
        | "approved"
        | "rejected"
        | "processing"
        | "completed"
        | "failed"
      session_status: "waiting" | "active" | "completed" | "cancelled"
      submission_status: "pending" | "running" | "completed" | "failed"
      tag_action: "create" | "update" | "delete" | "vote" | "verify" | "archive"
      tag_status: "active" | "proposed" | "verified" | "archived" | "suspended"
      tag_type: "core" | "game" | "community"
      user_role: "user" | "premium" | "moderator" | "admin"
      visibility_type: "public" | "friends" | "private"
      vote_type: "up" | "down"
    }
    CompositeTypes: {
      board_cell: {
        text: string | null
        colors: string[] | null
        completed_by: string[] | null
        blocked: boolean | null
        is_marked: boolean | null
        cell_id: string | null
        version: number | null
        last_updated: number | null
        last_modified_by: string | null
      }
      board_settings: {
        team_mode: boolean | null
        lockout: boolean | null
        sound_enabled: boolean | null
        win_conditions: {
          line: boolean | null
          majority: boolean | null
          diagonal: boolean | null
          corners: boolean | null
        } | null
      }
      session_settings: {
        max_players: number | null
        allow_spectators: boolean | null
        auto_start: boolean | null
        time_limit: number | null
        require_approval: boolean | null
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

// =====================================================================
// HELPER TYPES
// =====================================================================

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

// Re-export Constants for easy access
export { Constants } from './database.core' 