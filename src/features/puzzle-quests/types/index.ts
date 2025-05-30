import type { Tables, Enums } from '@/types/database-types';

// Base database types
export type User = Tables<'users'>;
export type Challenge = Tables<'challenges'>;
export type Category = Tables<'categories'>;
export type DifficultyLevel = Enums<'difficulty_level'>;

// Quest system types
export interface PuzzleQuest {
  id: string;
  title: string;
  description: string;
  story: QuestStory;
  difficulty: DifficultyLevel;
  category_id: string;
  created_by: string;
  status: QuestStatus;
  steps: QuestStep[];
  prerequisites: string[];
  rewards: QuestReward[];
  estimated_duration: number;
  completion_rate: number;
  rating: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type QuestStatus =
  | 'draft'
  | 'published'
  | 'featured'
  | 'archived'
  | 'maintenance';

export interface QuestStory {
  theme: QuestTheme;
  setting: string;
  characters: QuestCharacter[];
  plot_summary: string;
  introduction: string;
  conclusion: string;
  narrative_style:
    | 'adventure'
    | 'mystery'
    | 'sci-fi'
    | 'fantasy'
    | 'educational';
}

export type QuestTheme =
  | 'space_exploration'
  | 'medieval_fantasy'
  | 'cyberpunk'
  | 'detective_mystery'
  | 'educational'
  | 'historical'
  | 'post_apocalyptic'
  | 'underwater'
  | 'time_travel';

export interface QuestCharacter {
  id: string;
  name: string;
  role: 'guide' | 'mentor' | 'ally' | 'antagonist' | 'narrator';
  avatar_url?: string;
  personality: string;
  dialogue_samples: string[];
}

// Quest steps and progression
export interface QuestStep {
  id: string;
  quest_id: string;
  step_number: number;
  title: string;
  description: string;
  story_context: string;
  challenge_type: StepChallengeType;
  challenge_data: StepChallengeData;
  hints: QuestHint[];
  prerequisites: string[];
  completion_criteria: CompletionCriteria;
  rewards: StepReward[];
  estimated_time: number;
}

export type StepChallengeType =
  | 'coding_challenge'
  | 'puzzle_solve'
  | 'pattern_recognition'
  | 'logic_puzzle'
  | 'algorithm_design'
  | 'debug_code'
  | 'interactive_tutorial'
  | 'multiple_choice'
  | 'drag_and_drop';

export interface StepChallengeData {
  type: StepChallengeType;
  content: Record<string, unknown>; // Flexible content based on challenge type
  test_cases?: Record<string, unknown>[];
  interactive_elements?: InteractiveElement[];
  validation_rules?: ValidationRule[];
}

export interface InteractiveElement {
  id: string;
  type: 'code_editor' | 'visual_puzzle' | 'drag_drop' | 'slider' | 'toggle';
  properties: Record<string, unknown>;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface ValidationRule {
  type: 'code_syntax' | 'output_match' | 'performance' | 'pattern_match';
  criteria: Record<string, unknown>;
  error_message: string;
  points_deduction?: number;
}

export interface QuestHint {
  id: string;
  step_id: string;
  hint_text: string;
  reveal_condition: HintRevealCondition;
  cost: number;
  type: 'text' | 'code_snippet' | 'visual' | 'interactive';
  data?: Record<string, unknown>;
}

export interface HintRevealCondition {
  type: 'time_elapsed' | 'attempts_failed' | 'manual_request' | 'auto_reveal';
  threshold?: number;
}

export interface CompletionCriteria {
  required_score: number;
  max_attempts?: number;
  time_limit?: number;
  allow_hints: boolean;
  perfect_score_bonus?: number;
}

// Progress tracking
export interface QuestProgress {
  quest_id: string;
  user_id: string;
  status: QuestProgressStatus;
  current_step: number;
  completed_steps: number;
  total_steps: number;
  score: number;
  max_possible_score: number;
  time_spent: number;
  hints_used: number;
  attempts_made: number;
  started_at: string;
  last_activity: string;
  completed_at?: string;
  step_progress: StepProgress[];
}

export type QuestProgressStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'abandoned'
  | 'locked';

export interface StepProgress {
  step_id: string;
  status: IndividualStepProgressStatus;
  score: number;
  max_score: number;
  attempts: number;
  hints_used: string[];
  time_spent: number;
  completed_at?: string;
  user_solution?: Record<string, unknown>;
}

export type IndividualStepProgressStatus =
  | 'locked'
  | 'available'
  | 'in_progress'
  | 'completed'
  | 'skipped';

// Rewards and achievements
export interface QuestReward {
  type: RewardType;
  value: number;
  description: string;
  conditions?: RewardCondition[];
}

export interface StepReward {
  type: RewardType;
  value: number;
  description: string;
  immediate: boolean;
}

export type RewardType =
  | 'experience_points'
  | 'badges'
  | 'currency'
  | 'unlock_quest'
  | 'unlock_feature'
  | 'cosmetic_item'
  | 'title'
  | 'achievement';

export interface RewardCondition {
  type: 'perfect_score' | 'no_hints' | 'time_bonus' | 'first_completion';
  multiplier?: number;
}

// Quest collections and campaigns
export interface QuestCampaign {
  id: string;
  title: string;
  description: string;
  theme: QuestTheme;
  difficulty_progression: DifficultyLevel[];
  quest_ids: string[];
  unlock_criteria: CampaignUnlockCriteria;
  rewards: CampaignReward[];
  estimated_duration: number;
  created_at: string;
}

export interface CampaignUnlockCriteria {
  required_level?: number;
  required_quests?: string[];
  required_achievements?: string[];
  time_gate?: string;
}

export interface CampaignReward {
  type: RewardType;
  value: number;
  description: string;
  unlock_at: 'start' | 'milestone' | 'completion';
  milestone_percentage?: number;
}

// User quest analytics
export interface QuestAnalytics {
  user_id: string;
  total_quests_started: number;
  total_quests_completed: number;
  completion_rate: number;
  average_completion_time: number;
  total_experience_gained: number;
  favorite_themes: QuestTheme[];
  strongest_challenge_types: StepChallengeType[];
  weakest_challenge_types: StepChallengeType[];
  hint_usage_rate: number;
  perfect_score_count: number;
  current_streak: number;
  longest_streak: number;
}

// UI and component types
export interface QuestCardProps {
  quest: PuzzleQuest;
  progress?: QuestProgress;
  onStart: () => void;
  onContinue?: () => void;
  onView: () => void;
  showProgress?: boolean;
  className?: string;
}

export interface QuestStepProps {
  step: QuestStep;
  progress: StepProgress;
  onComplete: (solution: Record<string, unknown>) => void;
  onHintRequest: (hintId: string) => void;
  onSkip?: () => void;
  showHints?: boolean;
}

export interface QuestMapProps {
  campaign: QuestCampaign;
  userProgress: Record<string, QuestProgress>;
  onQuestSelect: (questId: string) => void;
  onQuestStart: (questId: string) => void;
}

export interface ProgressTrackerProps {
  progress: QuestProgress;
  quest: PuzzleQuest;
  showDetailed?: boolean;
}

// Form types
export interface CreateQuestFormData {
  title: string;
  description: string;
  difficulty: DifficultyLevel;
  category_id: string;
  theme: QuestTheme;
  estimated_duration: number;
  tags: string[];
  story: Partial<QuestStory>;
}

export interface QuestStepFormData {
  title: string;
  description: string;
  story_context: string;
  challenge_type: StepChallengeType;
  challenge_data: Record<string, unknown>;
  estimated_time: number;
  completion_criteria: CompletionCriteria;
}

// Filter and search types
export interface QuestFilters {
  difficulty?: DifficultyLevel | 'all';
  theme?: QuestTheme | 'all';
  category_id?: string;
  status?: QuestProgressStatus | 'all';
  duration?: {
    min: number;
    max: number;
  };
  completion_rate?: {
    min: number;
    max: number;
  };
  tags?: string[];
}

export type QuestSortBy =
  | 'newest'
  | 'oldest'
  | 'difficulty_asc'
  | 'difficulty_desc'
  | 'completion_rate_asc'
  | 'completion_rate_desc'
  | 'rating_asc'
  | 'rating_desc'
  | 'duration_asc'
  | 'duration_desc'
  | 'alphabetical';

// Constants
export const QUEST_THEMES: Record<
  QuestTheme,
  { name: string; icon: string; color: string }
> = {
  space_exploration: {
    name: 'Space Exploration',
    icon: '🚀',
    color: '#1E3A8A',
  },
  medieval_fantasy: { name: 'Medieval Fantasy', icon: '🏰', color: '#7C2D12' },
  cyberpunk: { name: 'Cyberpunk', icon: '🤖', color: '#EC4899' },
  detective_mystery: {
    name: 'Detective Mystery',
    icon: '🔍',
    color: '#374151',
  },
  educational: { name: 'Educational', icon: '📚', color: '#059669' },
  historical: { name: 'Historical', icon: '🏛️', color: '#92400E' },
  post_apocalyptic: { name: 'Post-Apocalyptic', icon: '☢️', color: '#DC2626' },
  underwater: { name: 'Underwater', icon: '🌊', color: '#0891B2' },
  time_travel: { name: 'Time Travel', icon: '⏰', color: '#7C3AED' },
} as const;

export const CHALLENGE_TYPE_LABELS: Record<StepChallengeType, string> = {
  coding_challenge: 'Coding Challenge',
  puzzle_solve: 'Puzzle Solving',
  pattern_recognition: 'Pattern Recognition',
  logic_puzzle: 'Logic Puzzle',
  algorithm_design: 'Algorithm Design',
  debug_code: 'Debug Code',
  interactive_tutorial: 'Interactive Tutorial',
  multiple_choice: 'Multiple Choice',
  drag_and_drop: 'Drag & Drop',
} as const;

export const DIFFICULTY_QUEST_POINTS: Record<DifficultyLevel, number> = {
  beginner: 100,
  easy: 250,
  medium: 500,
  hard: 1000,
  expert: 2000,
} as const;

export const QUEST_STATUS_LABELS: Record<QuestStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  featured: 'Featured',
  archived: 'Archived',
  maintenance: 'Under Maintenance',
} as const;

export const MAX_HINTS_PER_STEP = 3;
export const DEFAULT_STEP_TIME_LIMIT = 3600; // 1 hour in seconds
export const PERFECT_SCORE_BONUS_MULTIPLIER = 1.5;
export const HINT_SCORE_PENALTY = 0.1; // 10% score reduction per hint
