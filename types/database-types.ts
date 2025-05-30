// Main database types file that combines all modular type definitions

// Re-export all core types
export * from './database-core';

// Import all table interfaces
import type {
  BingoBoardsTable,
  BingoCardsTable,
  BingoSessionsTable,
  BingoSessionPlayersTable,
  BingoSessionQueueTable,
  BingoSessionEventsTable,
  BingoSessionCellsTable,
} from './database-bingo';

import type {
  UsersTable,
  UserSessionsTable,
  UserFriendsTable,
  UserAchievementsTable,
  UserActivityTable,
  DiscussionsTable,
  CommentsTable,
  TagsTable,
  TagVotesTable,
  TagReportsTable,
  TagHistoryTable,
} from './database-users';

import type {
  CategoriesTable,
  ChallengesTable,
  ChallengeTagsTable,
  SubmissionsTable,
  BoardBookmarksTable,
  BoardVotesTable,
  CardVotesTable,
} from './database-challenges';

import type {
  BoardStatus as CoreBoardStatus,
  ChallengeStatus as CoreChallengeStatus,
  DifficultyLevel as CoreDifficultyLevel,
  GameCategory as CoreGameCategory,
  QueueStatus as CoreQueueStatus,
  SessionStatus as CoreSessionStatus,
  SubmissionStatus as CoreSubmissionStatus,
  TagAction as CoreTagAction,
  TagStatus as CoreTagStatus,
  TagType as CoreTagType,
  UserRole as CoreUserRole,
  VisibilityType as CoreVisibilityType,
  VoteType as CoreVoteType,
  ActivityType as CoreActivityType,
  BoardCell as CoreBoardCell,
  BoardSettings as CoreBoardSettings,
  SessionSettings as CoreSessionSettings,
  TagCategory as CoreTagCategory,
  WinConditions as CoreWinConditions,
  Json,
} from './database-core';

// =====================================================================
// MAIN DATABASE INTERFACE
// =====================================================================

export interface Database {
  public: {
    Tables: {
      // Bingo-related tables
      bingo_boards: BingoBoardsTable;
      bingo_cards: BingoCardsTable;
      bingo_sessions: BingoSessionsTable;
      bingo_session_players: BingoSessionPlayersTable;
      bingo_session_queue: BingoSessionQueueTable;
      bingo_session_events: BingoSessionEventsTable;
      bingo_session_cells: BingoSessionCellsTable;

      // User and community tables
      users: UsersTable;
      user_sessions: UserSessionsTable;
      user_friends: UserFriendsTable;
      user_achievements: UserAchievementsTable;
      user_activity: UserActivityTable;
      discussions: DiscussionsTable;
      comments: CommentsTable;
      tags: TagsTable;
      tag_votes: TagVotesTable;
      tag_reports: TagReportsTable;
      tag_history: TagHistoryTable;

      // Challenge and other tables
      categories: CategoriesTable;
      challenges: ChallengesTable;
      challenge_tags: ChallengeTagsTable;
      submissions: SubmissionsTable;
      board_bookmarks: BoardBookmarksTable;
      board_votes: BoardVotesTable;
      card_votes: CardVotesTable;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_comment: {
        Args: {
          p_discussion_id: number;
          p_content: string;
          p_author_id: string;
        };
        Returns: number;
      };
      increment_discussion_upvotes: {
        Args: { discussion_id: number };
        Returns: undefined;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      log_user_activity: {
        Args: {
          p_user_id: string;
          p_activity_type: CoreActivityType;
          p_data?: Json;
        };
        Returns: string;
      };
    };
    Enums: {
      activity_type: CoreActivityType;
      board_status: CoreBoardStatus;
      challenge_status: CoreChallengeStatus;
      difficulty_level: CoreDifficultyLevel;
      game_category: CoreGameCategory;
      queue_status: CoreQueueStatus;
      session_status: CoreSessionStatus;
      submission_status: CoreSubmissionStatus;
      tag_action: CoreTagAction;
      tag_status: CoreTagStatus;
      tag_type: CoreTagType;
      user_role: CoreUserRole;
      visibility_type: CoreVisibilityType;
      vote_type: CoreVoteType;
    };
    CompositeTypes: {
      board_cell: CoreBoardCell;
      board_settings: CoreBoardSettings;
      session_settings: CoreSessionSettings;
      tag_category: CoreTagCategory;
      win_conditions: CoreWinConditions;
    };
  };
}

// =====================================================================
// HELPER TYPES
// =====================================================================

type DefaultSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

// Re-export Constants for easy access
export { Constants } from './database-core';
