import type { Tables, Enums } from '@/types/database-types';

// Base database types (we might need to add speedrun tables to database later)
export type User = Tables<'users'>;
export type Challenge = Tables<'challenges'>;
export type Submission = Tables<'submissions'>;
export type DifficultyLevel = Enums<'difficulty_level'>;

// Speedrun-specific types
export interface SpeedrunChallenge extends Challenge {
  time_limit: number;
  best_time?: number;
  average_time?: number;
  completion_rate: number;
  attempt_count: number;
  leaderboard_position?: number;
}

export interface SpeedrunAttempt {
  id: string;
  challenge_id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  completion_time?: number;
  status: SpeedrunStatus;
  code: string;
  language: string;
  test_results?: SpeedrunTestResult[];
  score: number;
  rank?: number;
  is_personal_best: boolean;
  keystrokes?: number;
  errors_count?: number;
  created_at: string;
}

export type SpeedrunStatus =
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'timeout'
  | 'disqualified';

export interface SpeedrunTestResult {
  test_case_id: string;
  passed: boolean;
  execution_time: number;
  memory_usage: number;
  input: unknown;
  expected_output: unknown;
  actual_output: unknown;
  error_message?: string;
}

// Leaderboard types
export interface SpeedrunLeaderboard {
  challenge_id: string;
  period: LeaderboardPeriod;
  entries: SpeedrunLeaderboardEntry[];
  user_rank?: number;
  total_participants: number;
  last_updated: string;
}

export interface SpeedrunLeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url?: string;
  best_time: number;
  attempts_count: number;
  success_rate: number;
  average_time: number;
  points: number;
  achieved_at: string;
  is_current_user?: boolean;
  rank_change?: number;
}

export type LeaderboardPeriod = 'all_time' | 'monthly' | 'weekly' | 'daily';

// Competition types
export interface SpeedrunCompetition {
  id: string;
  title: string;
  description: string;
  challenge_ids: string[];
  start_time: string;
  end_time: string;
  status: CompetitionStatus;
  max_participants?: number;
  entry_fee?: number;
  prize_pool?: number;
  rules: CompetitionRules;
  participants: CompetitionParticipant[];
  leaderboard: CompetitionLeaderboard;
  created_by: string;
  created_at: string;
}

export type CompetitionStatus =
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'cancelled';

export interface CompetitionRules {
  max_attempts_per_challenge: number;
  time_penalty_enabled: boolean;
  hint_penalty_enabled: boolean;
  collaboration_allowed: boolean;
  languages_allowed: string[];
  disqualification_rules: string[];
}

export interface CompetitionParticipant {
  user_id: string;
  username: string;
  avatar_url?: string;
  joined_at: string;
  total_score: number;
  completed_challenges: number;
  best_times: Record<string, number>;
  current_rank: number;
}

export interface CompetitionLeaderboard {
  entries: CompetitionParticipant[];
  scoring_method: 'time_based' | 'points_based' | 'hybrid';
  tiebreaker_rules: string[];
}

// Practice and training types
export interface SpeedrunSession {
  id: string;
  user_id: string;
  challenge_id: string;
  mode: SessionMode;
  settings: SessionSettings;
  attempts: SpeedrunAttempt[];
  started_at: string;
  ended_at?: string;
  personal_best_improved: boolean;
  statistics: SessionStatistics;
}

export type SessionMode =
  | 'practice'
  | 'time_trial'
  | 'competition'
  | 'tutorial';

export interface SessionSettings {
  show_timer: boolean;
  show_test_results: boolean;
  allow_hints: boolean;
  auto_submit: boolean;
  keystroke_tracking: boolean;
  performance_analytics: boolean;
}

export interface SessionStatistics {
  total_attempts: number;
  successful_attempts: number;
  success_rate: number;
  average_time: number;
  best_time: number;
  worst_time: number;
  total_keystrokes: number;
  typing_speed: number;
  error_rate: number;
  improvement_trend: 'improving' | 'stable' | 'declining';
}

// Analytics and tracking
export interface SpeedrunAnalytics {
  user_id: string;
  period: AnalyticsPeriod;
  challenges_attempted: number;
  challenges_completed: number;
  completion_rate: number;
  total_practice_time: number;
  average_completion_time: number;
  personal_bests_achieved: number;
  rank_improvements: number;
  favorite_difficulty: DifficultyLevel;
  preferred_languages: LanguageUsage[];
  performance_trend: PerformanceTrend;
  weakest_areas: string[];
  strongest_areas: string[];
}

export type AnalyticsPeriod =
  | 'week'
  | 'month'
  | 'quarter'
  | 'year'
  | 'all_time';

export interface LanguageUsage {
  language: string;
  attempts: number;
  success_rate: number;
  average_time: number;
}

export interface PerformanceTrend {
  direction: 'improving' | 'stable' | 'declining';
  change_percentage: number;
  period_comparison: string;
}

// UI and component types
export interface SpeedrunChallengeCardProps {
  challenge: SpeedrunChallenge;
  onStart: () => void;
  onViewLeaderboard: () => void;
  userBestTime?: number;
  className?: string;
}

export interface SpeedrunTimerProps {
  startTime?: Date;
  isRunning: boolean;
  onTimeout?: () => void;
  timeLimit?: number;
  showMilliseconds?: boolean;
}

export interface LeaderboardProps {
  leaderboard: SpeedrunLeaderboard;
  period: LeaderboardPeriod;
  onPeriodChange: (period: LeaderboardPeriod) => void;
  loading?: boolean;
}

export interface AttemptHistoryProps {
  attempts: SpeedrunAttempt[];
  onViewAttempt: (attempt: SpeedrunAttempt) => void;
  showComparison?: boolean;
}

// Form types
export interface StartSpeedrunFormData {
  challenge_id: string;
  mode: SessionMode;
  settings: SessionSettings;
}

export interface CreateCompetitionFormData {
  title: string;
  description: string;
  challenge_ids: string[];
  start_time: string;
  end_time: string;
  max_participants?: number;
  entry_fee?: number;
  prize_pool?: number;
  rules: CompetitionRules;
}

// Filter and search types
export interface SpeedrunFilters {
  difficulty?: DifficultyLevel | 'all';
  category?: string;
  language?: string;
  completed?: boolean;
  has_personal_best?: boolean;
  time_range?: {
    min: number;
    max: number;
  };
}

export type SpeedrunSortBy =
  | 'difficulty_asc'
  | 'difficulty_desc'
  | 'best_time_asc'
  | 'best_time_desc'
  | 'attempts_asc'
  | 'attempts_desc'
  | 'completion_rate_asc'
  | 'completion_rate_desc'
  | 'newest'
  | 'oldest';

// Constants
export const SPEEDRUN_MODES = {
  PRACTICE: 'practice',
  TIME_TRIAL: 'time_trial',
  COMPETITION: 'competition',
  TUTORIAL: 'tutorial',
} as const;

export const SCORING_METHODS = {
  TIME_BASED: 'time_based',
  POINTS_BASED: 'points_based',
  HYBRID: 'hybrid',
} as const;

export const DIFFICULTY_TIME_MULTIPLIERS: Record<DifficultyLevel, number> = {
  beginner: 1.5,
  easy: 1.2,
  medium: 1.0,
  hard: 0.8,
  expert: 0.6,
} as const;

export const RANK_TITLES = [
  { min: 0, max: 10, title: 'Speed Demon', color: '#FFD700' },
  { min: 11, max: 25, title: 'Lightning Fast', color: '#C0C0C0' },
  { min: 26, max: 50, title: 'Quick Thinker', color: '#CD7F32' },
  { min: 51, max: 100, title: 'Code Runner', color: '#4A90E2' },
  { min: 101, max: Infinity, title: 'Apprentice', color: '#7F8C8D' },
] as const;

export const ACHIEVEMENT_THRESHOLDS = {
  FIRST_COMPLETION: 1,
  SPEED_MILESTONE: [60, 30, 15, 10, 5], // seconds
  ATTEMPT_MILESTONES: [10, 50, 100, 500, 1000],
  STREAK_MILESTONES: [5, 10, 25, 50, 100],
  RANK_MILESTONES: [100, 50, 25, 10, 5, 1],
} as const;
