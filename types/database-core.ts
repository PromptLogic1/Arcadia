// =============================================================================
// CORE DATABASE TYPES - Base types used throughout the application
// =============================================================================

// JSON type for database fields
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// =============================================================================
// ENUMS - Database enums (source of truth from migration)
// =============================================================================

export type ActivityType =
  | 'login'
  | 'logout'
  | 'board_create'
  | 'board_join'
  | 'board_complete'
  | 'submission_create'
  | 'discussion_create'
  | 'comment_create'
  | 'achievement_unlock';

export type BoardStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived';

export type ChallengeStatus = 'draft' | 'published' | 'archived';

export type DifficultyLevel =
  | 'beginner'
  | 'easy'
  | 'medium'
  | 'hard'
  | 'expert';

export type GameCategory =
  | 'All Games'
  | 'World of Warcraft'
  | 'Fortnite'
  | 'Minecraft'
  | 'Among Us'
  | 'Apex Legends'
  | 'League of Legends'
  | 'Overwatch'
  | 'Call of Duty: Warzone'
  | 'Valorant'
  | 'CS:GO'
  | 'Dota 2'
  | 'Rocket League'
  | 'Fall Guys'
  | 'Dead by Daylight'
  | 'Cyberpunk 2077'
  | 'The Witcher 3'
  | 'Elden Ring'
  | 'Dark Souls'
  | 'Bloodborne'
  | 'Sekiro'
  | 'Hollow Knight'
  | 'Celeste'
  | 'Hades'
  | 'The Binding of Isaac'
  | 'Risk of Rain 2'
  | 'Deep Rock Galactic'
  | 'Valheim'
  | 'Subnautica'
  | "No Man's Sky"
  | 'Terraria'
  | 'Stardew Valley'
  | 'Animal Crossing'
  | 'Splatoon 3'
  | 'Super Mario Odyssey'
  | 'The Legend of Zelda: Breath of the Wild'
  | 'Super Smash Bros. Ultimate';

export type QueueStatus = 'waiting' | 'matched' | 'cancelled';

export type SessionStatus =
  | 'waiting'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export type TagAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'voted'
  | 'reported';

export type TagStatus =
  | 'active'
  | 'pending'
  | 'rejected'
  | 'archived';

export type TagType =
  | 'category'
  | 'difficulty'
  | 'theme'
  | 'mechanic'
  | 'custom';

export type UserRole = 'user' | 'premium' | 'moderator' | 'admin';

export type VisibilityType = 'public' | 'friends' | 'private';

export type VoteType = 'up' | 'down';

// =============================================================================
// COMPOSITE TYPES - Database composite types (exact match to migration)
// =============================================================================

export interface BoardCell {
  text: string | null;
  position_row: number | null;
  position_col: number | null;
  tags: string[] | null;
}

export interface WinConditions {
  single_line: boolean | null;
  full_board: boolean | null;
  pattern: boolean | null;
  custom_pattern: Json | null;
}

export interface BoardSettings {
  timer_enabled: boolean | null;
  timer_duration: number | null;
  win_conditions: WinConditions | null;
  visibility: VisibilityType | null;
  allow_guests: boolean | null;
  max_players: number | null;
}

export interface SessionSettings {
  auto_start: boolean | null;
  allow_spectators: boolean | null;
  min_players: number | null;
  max_players: number | null;
  time_limit: number | null;
}

export interface TagCategory {
  name: string | null;
  description: string | null;
  color: string | null;
}

// =============================================================================
// CONSTANTS - Runtime constants for enums (exact match to migration)
// =============================================================================

export const Constants = {
  public: {
    Enums: {
      activity_type: [
        'login',
        'logout',
        'board_create',
        'board_join',
        'board_complete',
        'submission_create',
        'discussion_create',
        'comment_create',
        'achievement_unlock',
      ] as const,
      board_status: [
        'draft',
        'active',
        'paused',
        'completed',
        'archived',
      ] as const,
      challenge_status: ['draft', 'published', 'archived'] as const,
      difficulty_level: [
        'beginner',
        'easy',
        'medium',
        'hard',
        'expert',
      ] as const,
      game_category: [
        'All Games',
        'World of Warcraft',
        'Fortnite',
        'Minecraft',
        'Among Us',
        'Apex Legends',
        'League of Legends',
        'Overwatch',
        'Call of Duty: Warzone',
        'Valorant',
        'CS:GO',
        'Dota 2',
        'Rocket League',
        'Fall Guys',
        'Dead by Daylight',
        'Cyberpunk 2077',
        'The Witcher 3',
        'Elden Ring',
        'Dark Souls',
        'Bloodborne',
        'Sekiro',
        'Hollow Knight',
        'Celeste',
        'Hades',
        'The Binding of Isaac',
        'Risk of Rain 2',
        'Deep Rock Galactic',
        'Valheim',
        'Subnautica',
        "No Man's Sky",
        'Terraria',
        'Stardew Valley',
        'Animal Crossing',
        'Splatoon 3',
        'Super Mario Odyssey',
        'The Legend of Zelda: Breath of the Wild',
        'Super Smash Bros. Ultimate',
      ] as const,
      queue_status: ['waiting', 'matched', 'cancelled'] as const,
      session_status: [
        'waiting',
        'active',
        'paused',
        'completed',
        'cancelled',
      ] as const,
      submission_status: ['pending', 'approved', 'rejected'] as const,
      tag_action: [
        'created',
        'updated',
        'deleted',
        'voted',
        'reported',
      ] as const,
      tag_status: [
        'active',
        'pending',
        'rejected',
        'archived',
      ] as const,
      tag_type: [
        'category',
        'difficulty',
        'theme',
        'mechanic',
        'custom',
      ] as const,
      user_role: ['user', 'premium', 'moderator', 'admin'] as const,
      visibility_type: ['public', 'friends', 'private'] as const,
      vote_type: ['up', 'down'] as const,
    },
  },
} as const;
