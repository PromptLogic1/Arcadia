import type {
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from '@/types/database-types';

// Database types
export type Challenge = Tables<'challenges'>;
export type Category = Tables<'categories'>;
export type Submission = Tables<'submissions'>;
export type ChallengeTag = Tables<'challenge_tags'>;
export type Tag = Tables<'tags'>;

export type DifficultyLevel = Enums<'difficulty_level'>;
export type ChallengeStatus = Enums<'challenge_status'>;
export type SubmissionStatus = Enums<'submission_status'>;
export type TagType = Enums<'tag_type'>;

// Extended types for UI
export interface ChallengeWithDetails extends Challenge {
  category?: Category;
  tags?: Tag[];
  submission_count?: number;
  success_rate?: number;
  avg_completion_time?: number;
  user_submission?: Submission;
}

export interface SubmissionWithChallenge extends Submission {
  challenge?: Challenge;
  user?: {
    username: string;
    avatar_url?: string;
  };
}

export interface CategoryWithChallenges extends Category {
  challenge_count?: number;
  challenges?: Challenge[];
}

// Form types
export interface CreateChallengeFormData {
  title: string;
  description: string;
  difficulty: DifficultyLevel;
  category_id?: string;
  initial_code?: string;
  solution_code?: string;
  test_cases?: TestCase[];
  tags?: string[];
  status?: ChallengeStatus;
}

export interface UpdateChallengeFormData
  extends Partial<CreateChallengeFormData> {
  id: string;
}

export interface SubmitSolutionFormData {
  challenge_id: string;
  code: string;
  language: string;
}

export interface CreateCategoryFormData {
  name: string;
  description?: string;
}

// Test case types
export interface TestCase {
  id?: string;
  input: unknown;
  expected_output: unknown;
  description?: string;
  is_hidden?: boolean;
  points?: number;
}

export interface TestResult {
  test_case_id?: string;
  passed: boolean;
  input: unknown;
  expected_output: unknown;
  actual_output: unknown;
  execution_time?: number;
  memory_usage?: number;
  error_message?: string;
}

export interface SubmissionResult {
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  execution_time: number;
  memory_usage: number;
  test_results: TestResult[];
  score?: number;
  status: SubmissionStatus;
}

// Filter and search types
export interface ChallengeFilters {
  difficulty?: DifficultyLevel | 'all';
  category_id?: string;
  tags?: string[];
  status?: ChallengeStatus;
  completed?: boolean;
  attempted?: boolean;
}

export type ChallengeSortBy =
  | 'newest'
  | 'oldest'
  | 'difficulty_asc'
  | 'difficulty_desc'
  | 'popular'
  | 'success_rate'
  | 'title_asc'
  | 'title_desc';

export interface SearchFilters {
  query?: string;
  filters: ChallengeFilters;
  sort: ChallengeSortBy;
  page: number;
  limit: number;
}

// Code editor types
export interface CodeEditorSettings {
  theme: 'light' | 'dark';
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  showLineNumbers: boolean;
  showMinimap: boolean;
}

export interface CodeExecutionRequest {
  code: string;
  language: string;
  test_cases: TestCase[];
  time_limit?: number;
  memory_limit?: number;
}

// Leaderboard types
export interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url?: string;
  total_solved: number;
  total_points: number;
  success_rate: number;
  avg_execution_time: number;
  rank: number;
}

export interface ChallengeLeaderboard {
  challenge_id: string;
  entries: LeaderboardEntry[];
  user_rank?: number;
}

// Progress tracking types
export interface UserProgress {
  user_id: string;
  total_challenges: number;
  completed_challenges: number;
  attempted_challenges: number;
  success_rate: number;
  total_points: number;
  difficulties_completed: Record<DifficultyLevel, number>;
  categories_completed: Record<string, number>;
  recent_submissions: Submission[];
}

export interface ChallengeProgress {
  challenge_id: string;
  attempted: boolean;
  completed: boolean;
  best_submission?: Submission;
  attempt_count: number;
  first_attempt_at?: string;
  completed_at?: string;
}

// Component prop types
export interface ChallengeCardProps {
  challenge: ChallengeWithDetails;
  onClick?: () => void;
  showProgress?: boolean;
  className?: string;
}

export interface ChallengeDetailProps {
  challenge: ChallengeWithDetails;
  onSubmit?: (data: SubmitSolutionFormData) => void;
  onBack?: () => void;
}

export interface SubmissionListProps {
  submissions: SubmissionWithChallenge[];
  onSubmissionClick?: (submission: Submission) => void;
  loading?: boolean;
}

// Insert/update types
export type ChallengeInsert = TablesInsert<'challenges'>;
export type ChallengeUpdate = TablesUpdate<'challenges'>;
export type SubmissionInsert = TablesInsert<'submissions'>;
export type CategoryInsert = TablesInsert<'categories'>;

// Constants
export const DIFFICULTY_LEVELS: Record<
  DifficultyLevel,
  { label: string; color: string; points: number }
> = {
  beginner: { label: 'Beginner', color: 'green', points: 10 },
  easy: { label: 'Easy', color: 'blue', points: 25 },
  medium: { label: 'Medium', color: 'yellow', points: 50 },
  hard: { label: 'Hard', color: 'orange', points: 100 },
  expert: { label: 'Expert', color: 'red', points: 200 },
} as const;

export const PROGRAMMING_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', extension: '.js' },
  { id: 'typescript', name: 'TypeScript', extension: '.ts' },
  { id: 'python', name: 'Python', extension: '.py' },
  { id: 'java', name: 'Java', extension: '.java' },
  { id: 'cpp', name: 'C++', extension: '.cpp' },
  { id: 'csharp', name: 'C#', extension: '.cs' },
  { id: 'go', name: 'Go', extension: '.go' },
  { id: 'rust', name: 'Rust', extension: '.rs' },
] as const;

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
} as const;
