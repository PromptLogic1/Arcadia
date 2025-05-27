export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Database Enums
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

export type QueueStatus = "pending" | "approved" | "rejected"
export type SessionStatus = "waiting" | "active" | "completed" | "cancelled"
export type SubmissionStatus = "pending" | "running" | "completed" | "failed"
export type TagAction = "create" | "update" | "delete" | "vote" | "verify" | "archive"
export type TagStatus = "active" | "proposed" | "verified" | "archived" | "suspended"
export type TagType = "core" | "game" | "community"
export type UserRole = "user" | "premium" | "moderator" | "admin"
export type VisibilityType = "public" | "friends" | "private"
export type VoteType = "up" | "down"

// Composite Types
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