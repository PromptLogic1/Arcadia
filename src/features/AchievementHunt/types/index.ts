import type { Tables } from '@/types/database.types'

// Base database types
export type User = Tables<'users'>
export type UserAchievement = Tables<'user_achievements'>

// Achievement system types
export interface Achievement {
  id: string
  name: string
  description: string
  type: AchievementType
  category: AchievementCategory
  difficulty: AchievementDifficulty
  icon: string
  badge_design: BadgeDesign
  points: number
  unlock_criteria: UnlockCriteria
  prerequisites: string[]
  secret: boolean
  limited_time?: LimitedTimeInfo
  progression?: ProgressionInfo
  rewards: AchievementReward[]
  statistics: AchievementStatistics
  created_at: string
  updated_at: string
}

export type AchievementType = 
  | 'milestone'
  | 'streak'
  | 'mastery'
  | 'exploration'
  | 'social'
  | 'competitive'
  | 'creative'
  | 'special'
  | 'seasonal'
  | 'legacy'

export type AchievementCategory = 
  | 'bingo_master'
  | 'challenge_solver'
  | 'social_butterfly'
  | 'speed_demon'
  | 'explorer'
  | 'creator'
  | 'helper'
  | 'competitor'
  | 'collector'
  | 'perfectionist'

export type AchievementDifficulty = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'

export interface BadgeDesign {
  shape: 'circle' | 'shield' | 'star' | 'hexagon' | 'diamond'
  primary_color: string
  secondary_color: string
  accent_color: string
  border_style: 'solid' | 'gradient' | 'glow' | 'animated'
  icon_style: 'flat' | '3d' | 'outlined' | 'filled'
  special_effects?: BadgeEffect[]
}

export interface BadgeEffect {
  type: 'glow' | 'sparkle' | 'pulse' | 'rotate' | 'bounce'
  intensity: 'low' | 'medium' | 'high'
  color?: string
  duration?: number
}

// Unlock criteria and progression
export interface UnlockCriteria {
  type: CriteriaType
  conditions: CriteriaCondition[]
  evaluation: 'all' | 'any' | 'sequential'
  time_window?: TimeWindow
}

export type CriteriaType = 
  | 'count_based'
  | 'score_based'
  | 'time_based'
  | 'streak_based'
  | 'completion_based'
  | 'social_based'
  | 'event_based'
  | 'combination'

export interface CriteriaCondition {
  metric: string
  operator: 'equals' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'between'
  value: number | string | number[]
  context?: string
  sub_conditions?: CriteriaCondition[]
}

export interface TimeWindow {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  duration?: number
  reset_on?: string
}

export interface ProgressionInfo {
  is_progressive: boolean
  stages: ProgressionStage[]
  reset_on_failure: boolean
  backtrack_allowed: boolean
}

export interface ProgressionStage {
  stage: number
  name: string
  description: string
  criteria: CriteriaCondition[]
  points: number
  badge_variant?: string
}

export interface LimitedTimeInfo {
  start_date: string
  end_date: string
  event_name?: string
  auto_remove: boolean
  reminder_enabled: boolean
}

// User achievement progress
export interface UserAchievementProgress extends Omit<UserAchievement, 'unlocked_at'> {
  achievement: Achievement
  progress: ProgressTracker
  unlocked_at?: string | null
  claimed_at?: string
  notification_sent: boolean
  showcase_priority?: number
}

export interface ProgressTracker {
  current_progress: Record<string, number>
  required_progress: Record<string, number>
  percentage: number
  stage?: number
  milestones_reached: string[]
  last_updated: string
  tracking_data?: TrackingData
}

export interface TrackingData {
  start_date: string
  recent_activity: ActivityEntry[]
  streaks: StreakInfo[]
  personal_bests: Record<string, number>
  context_data: Record<string, unknown>
}

export interface ActivityEntry {
  timestamp: string
  action: string
  value: number
  context?: string
  metadata?: Record<string, unknown>
}

export interface StreakInfo {
  type: string
  current: number
  best: number
  started_at?: string
  last_activity?: string
}

// Achievement hunting and discovery
export interface AchievementHunt {
  id: string
  title: string
  description: string
  theme: HuntTheme
  duration: HuntDuration
  achievement_ids: string[]
  special_rewards: HuntReward[]
  leaderboard: HuntLeaderboard
  participation_requirements?: ParticipationRequirements
  status: HuntStatus
  start_date: string
  end_date: string
  created_by: string
}

export type HuntTheme = 
  | 'seasonal'
  | 'community_challenge'
  | 'skill_focus'
  | 'speed_challenge'
  | 'creativity'
  | 'collaboration'
  | 'exploration'
  | 'mastery'

export type HuntDuration = 'daily' | 'weekly' | 'monthly' | 'event_based' | 'permanent'
export type HuntStatus = 'upcoming' | 'active' | 'completed' | 'cancelled'

export interface HuntReward {
  rank_range: [number, number]
  reward_type: 'exclusive_badge' | 'title' | 'points' | 'cosmetic' | 'feature_unlock'
  reward_data: Record<string, unknown>
  description: string
}

export interface HuntLeaderboard {
  entries: HuntLeaderboardEntry[]
  scoring_method: 'points' | 'completion_count' | 'speed' | 'custom'
  tiebreaker_rules: string[]
  real_time_updates: boolean
}

export interface HuntLeaderboardEntry {
  rank: number
  user_id: string
  username: string
  avatar_url?: string
  score: number
  achievements_unlocked: number
  completion_time?: string
  is_current_user: boolean
}

export interface ParticipationRequirements {
  min_level?: number
  required_achievements?: string[]
  account_age_days?: number
  registration_required: boolean
}

// Achievement rewards and recognition
export interface AchievementReward {
  type: RewardType
  value: number | string
  description: string
  immediate: boolean
  stackable: boolean
  expiry?: string
}

export type RewardType = 
  | 'experience_points'
  | 'currency'
  | 'cosmetic_item'
  | 'title'
  | 'badge'
  | 'feature_unlock'
  | 'discount'
  | 'special_access'
  | 'custom'

export interface AchievementStatistics {
  total_unlocked: number
  unlock_rate: number
  average_time_to_unlock: number
  first_unlock_date?: string
  rarity_score: number
  popularity_rank: number
  difficulty_rating: number
}

// Showcase and display
export interface AchievementShowcase {
  user_id: string
  featured_achievements: string[]
  display_preferences: ShowcasePreferences
  privacy_settings: ShowcasePrivacy
  last_updated: string
}

export interface ShowcasePreferences {
  layout: 'grid' | 'list' | 'carousel'
  sort_by: 'rarity' | 'recent' | 'points' | 'personal_favorite' | 'chronological'
  max_display: number
  show_progress: boolean
  show_statistics: boolean
  theme: 'default' | 'minimal' | 'premium' | 'animated'
}

export interface ShowcasePrivacy {
  visibility: 'public' | 'friends' | 'private'
  hide_in_progress: boolean
  hide_secret_achievements: boolean
  allow_sharing: boolean
}

// UI and component types
export interface AchievementCardProps {
  achievement: Achievement
  progress?: UserAchievementProgress
  onClick?: () => void
  showProgress?: boolean
  size?: 'small' | 'medium' | 'large'
  variant?: 'card' | 'badge' | 'list_item'
  className?: string
}

export interface AchievementGridProps {
  achievements: UserAchievementProgress[]
  filters?: AchievementFilters
  onFilterChange?: (filters: AchievementFilters) => void
  onAchievementClick?: (achievement: Achievement) => void
  loading?: boolean
}

export interface ProgressBarProps {
  progress: ProgressTracker
  achievement: Achievement
  showDetails?: boolean
  animated?: boolean
}

export interface NotificationProps {
  achievement: Achievement
  onClaim?: () => void
  onDismiss?: () => void
  autoHide?: boolean
}

// Search and filtering
export interface AchievementFilters {
  category?: AchievementCategory | 'all'
  difficulty?: AchievementDifficulty | 'all'
  type?: AchievementType | 'all'
  status?: 'unlocked' | 'in_progress' | 'locked' | 'all'
  search?: string
  rarity?: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'all'
  points_range?: {
    min: number
    max: number
  }
}

export type AchievementSortBy = 
  | 'rarity_desc'
  | 'rarity_asc'
  | 'points_desc'
  | 'points_asc'
  | 'unlock_date_desc'
  | 'unlock_date_asc'
  | 'alphabetical'
  | 'progress_desc'
  | 'difficulty_desc'
  | 'difficulty_asc'

// Analytics and insights
export interface AchievementAnalytics {
  user_id: string
  total_achievements: number
  unlocked_achievements: number
  completion_rate: number
  total_points: number
  rarity_distribution: Record<AchievementDifficulty, number>
  category_progress: Record<AchievementCategory, CategoryProgress>
  recent_unlocks: RecentUnlock[]
  upcoming_milestones: UpcomingMilestone[]
  recommendations: AchievementRecommendation[]
}

export interface CategoryProgress {
  total: number
  unlocked: number
  in_progress: number
  points_earned: number
  average_rarity: number
}

export interface RecentUnlock {
  achievement_id: string
  unlocked_at: string
  points_earned: number
  rarity: AchievementDifficulty
}

export interface UpcomingMilestone {
  achievement_id: string
  progress_percentage: number
  estimated_completion: string
  priority: 'high' | 'medium' | 'low'
}

export interface AchievementRecommendation {
  achievement_id: string
  reason: string
  difficulty_score: number
  time_estimate: string
  prerequisites_met: boolean
}

// Constants
export const ACHIEVEMENT_CATEGORIES: Record<AchievementCategory, { name: string; icon: string; color: string }> = {
  bingo_master: { name: 'Bingo Master', icon: '🎯', color: '#3B82F6' },
  challenge_solver: { name: 'Challenge Solver', icon: '🧩', color: '#10B981' },
  social_butterfly: { name: 'Social Butterfly', icon: '👥', color: '#F59E0B' },
  speed_demon: { name: 'Speed Demon', icon: '⚡', color: '#EF4444' },
  explorer: { name: 'Explorer', icon: '🗺️', color: '#8B5CF6' },
  creator: { name: 'Creator', icon: '🎨', color: '#EC4899' },
  helper: { name: 'Helper', icon: '🤝', color: '#06B6D4' },
  competitor: { name: 'Competitor', icon: '🏆', color: '#F97316' },
  collector: { name: 'Collector', icon: '💎', color: '#84CC16' },
  perfectionist: { name: 'Perfectionist', icon: '⭐', color: '#6366F1' },
} as const

export const DIFFICULTY_CONFIG: Record<AchievementDifficulty, { name: string; color: string; points_multiplier: number }> = {
  common: { name: 'Common', color: '#9CA3AF', points_multiplier: 1.0 },
  rare: { name: 'Rare', color: '#3B82F6', points_multiplier: 1.5 },
  epic: { name: 'Epic', color: '#8B5CF6', points_multiplier: 2.0 },
  legendary: { name: 'Legendary', color: '#F59E0B', points_multiplier: 3.0 },
  mythic: { name: 'Mythic', color: '#EF4444', points_multiplier: 5.0 },
} as const

export const BADGE_SHAPES = ['circle', 'shield', 'star', 'hexagon', 'diamond'] as const
export const BADGE_EFFECTS = ['glow', 'sparkle', 'pulse', 'rotate', 'bounce'] as const

export const NOTIFICATION_DURATION = 5000 // 5 seconds
export const MAX_SHOWCASE_ACHIEVEMENTS = 12
export const PROGRESS_UPDATE_INTERVAL = 1000 // 1 second
export const LEADERBOARD_UPDATE_INTERVAL = 30000 // 30 seconds

export const ACHIEVEMENT_METRICS = {
  BOARDS_CREATED: 'boards_created',
  GAMES_WON: 'games_won',
  CHALLENGES_COMPLETED: 'challenges_completed',
  FRIENDS_ADDED: 'friends_added',
  POINTS_EARNED: 'points_earned',
  LOGIN_STREAK: 'login_streak',
  PERFECT_SCORES: 'perfect_scores',
  SPEED_RECORDS: 'speed_records',
} as const 