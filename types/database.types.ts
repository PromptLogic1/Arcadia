// Re-export core types
export * from './database.core'

// Import all table interfaces
import type {
  BingoBoardsTable,
  BingoCardsTable,
  BingoSessionsTable,
  BingoSessionPlayersTable,
  BingoSessionEventsTable,
  BingoSessionCellsTable,
  BingoSessionQueueTable,
} from './database.bingo'

import type {
  UsersTable,
  UserSessionsTable,
  UserFriendsTable,
  UserAchievementsTable,
  DiscussionsTable,
  CommentsTable,
  TagsTable,
  TagHistoryTable,
  TagReportsTable,
  TagVotesTable,
} from './database.users'

import type {
  CategoriesTable,
  ChallengesTable,
  ChallengeTagsTable,
  SubmissionsTable,
  BoardBookmarksTable,
  BoardVotesTable,
  CardVotesTable,
} from './database.challenges'

import type {
  Json,
  BoardStatus,
  ChallengeStatus,
  DifficultyLevel,
  GameCategory,
  QueueStatus,
  SessionStatus,
  SubmissionStatus,
  TagAction,
  TagStatus,
  TagType,
  UserRole,
  VisibilityType,
  VoteType,
  BoardCell,
  BoardSettings,
  SessionSettings,
  TagCategory,
  WinConditions,
} from './database.core'

// Main Database interface
export interface Database {
  public: {
    Tables: {
      bingo_boards: BingoBoardsTable
      bingo_cards: BingoCardsTable
      bingo_session_cells: BingoSessionCellsTable
      bingo_session_events: BingoSessionEventsTable
      bingo_session_players: BingoSessionPlayersTable
      bingo_session_queue: BingoSessionQueueTable
      bingo_sessions: BingoSessionsTable
      board_bookmarks: BoardBookmarksTable
      board_votes: BoardVotesTable
      card_votes: CardVotesTable
      categories: CategoriesTable
      challenge_tags: ChallengeTagsTable
      challenges: ChallengesTable
      comments: CommentsTable
      discussions: DiscussionsTable
      submissions: SubmissionsTable
      tag_history: TagHistoryTable
      tag_reports: TagReportsTable
      tag_votes: TagVotesTable
      tags: TagsTable
      user_achievements: UserAchievementsTable
      user_friends: UserFriendsTable
      user_sessions: UserSessionsTable
      users: UsersTable
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
      board_status: BoardStatus
      challenge_status: ChallengeStatus
      difficulty_level: DifficultyLevel
      game_category: GameCategory
      queue_status: QueueStatus
      session_status: SessionStatus
      submission_status: SubmissionStatus
      tag_action: TagAction
      tag_status: TagStatus
      tag_type: TagType
      user_role: UserRole
      visibility_type: VisibilityType
      vote_type: VoteType
    }
    CompositeTypes: {
      board_cell: BoardCell
      board_settings: BoardSettings
      session_settings: SessionSettings
      tag_category: TagCategory
      win_conditions: WinConditions
    }
  }
}

// Helper types for better developer experience
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

// Constants for easy access to enum values
export const Constants = {
  public: {
    Enums: {
      board_status: ["draft", "active", "paused", "completed", "archived"],
      challenge_status: ["draft", "published", "archived"],
      difficulty_level: ["beginner", "easy", "medium", "hard", "expert"],
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
      ],
      queue_status: ["pending", "approved", "rejected"],
      session_status: ["waiting", "active", "completed", "cancelled"],
      submission_status: ["pending", "running", "completed", "failed"],
      tag_action: ["create", "update", "delete", "vote", "verify", "archive"],
      tag_status: ["active", "proposed", "verified", "archived", "suspended"],
      tag_type: ["core", "game", "community"],
      user_role: ["user", "premium", "moderator", "admin"],
      visibility_type: ["public", "friends", "private"],
      vote_type: ["up", "down"],
    },
  },
} as const 