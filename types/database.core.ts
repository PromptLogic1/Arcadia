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
  | Json[]

// =============================================================================
// ENUMS - Database enums (source of truth)
// =============================================================================

export type BoardStatus = "draft" | "active" | "paused" | "completed" | "archived"
export type ChallengeStatus = "draft" | "published" | "archived"
export type DifficultyLevel = "beginner" | "easy" | "medium" | "hard" | "expert"
export type GameCategory =
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
export type QueueStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "processing"
  | "completed"
  | "failed"
export type SessionStatus = "waiting" | "active" | "completed" | "cancelled"
export type SubmissionStatus = "pending" | "running" | "completed" | "failed"
export type TagAction = "create" | "update" | "delete" | "vote" | "verify" | "archive"
export type TagStatus = "active" | "proposed" | "verified" | "archived" | "suspended"
export type TagType = "core" | "game" | "community"
export type UserRole = "user" | "premium" | "moderator" | "admin"
export type VisibilityType = "public" | "friends" | "private"
export type VoteType = "up" | "down"

// =============================================================================
// COMPOSITE TYPES - Database composite types
// =============================================================================

export interface BoardCell {
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

export interface WinConditions {
  line: boolean | null
  majority: boolean | null
  diagonal: boolean | null
  corners: boolean | null
}

export interface BoardSettings {
  team_mode: boolean | null
  lockout: boolean | null
  sound_enabled: boolean | null
  win_conditions: WinConditions | null
}

export interface SessionSettings {
  max_players: number | null
  allow_spectators: boolean | null
  auto_start: boolean | null
  time_limit: number | null
  require_approval: boolean | null
}

export interface TagCategory {
  id: string | null
  name: string | null
  is_required: boolean | null
  allow_multiple: boolean | null
  valid_for_games: string[] | null
}

// =============================================================================
// CONSTANTS - Runtime constants for enums
// =============================================================================

export const Constants = {
  public: {
    Enums: {
      board_status: ["draft", "active", "paused", "completed", "archived"] as const,
      challenge_status: ["draft", "published", "archived"] as const,
      difficulty_level: ["beginner", "easy", "medium", "hard", "expert"] as const,
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
      ] as const,
      queue_status: [
        "pending",
        "approved",
        "rejected",
        "processing",
        "completed",
        "failed",
      ] as const,
      session_status: ["waiting", "active", "completed", "cancelled"] as const,
      submission_status: ["pending", "running", "completed", "failed"] as const,
      tag_action: ["create", "update", "delete", "vote", "verify", "archive"] as const,
      tag_status: ["active", "proposed", "verified", "archived", "suspended"] as const,
      tag_type: ["core", "game", "community"] as const,
      user_role: ["user", "premium", "moderator", "admin"] as const,
      visibility_type: ["public", "friends", "private"] as const,
      vote_type: ["up", "down"] as const,
    },
  },
} as const 