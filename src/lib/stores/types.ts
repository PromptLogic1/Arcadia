// Import database types
import type {
  Tables,
} from '../../../types/database.types';

// User Types
export type UserRole = 'user' | 'premium' | 'moderator' | 'admin';
export type VisibilityType = 'public' | 'friends' | 'private';

export interface UserData {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  experience_points: number | null;
  land: string | null;
  region: string | null;
  city: string | null;
  bio: string | null;
  role: UserRole | null;
  last_login_at: string | null;
  created_at: string | null;
  achievements_visibility: VisibilityType | null;
  auth_id: string | null;
  profile_visibility: VisibilityType | null;
  submissions_visibility: VisibilityType | null;
  updated_at: string | null;
}

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  auth_username: string | null;
  provider: string | null;
  userRole: UserRole;
}

// Re-export types from database
export type {
  GameCategory,
  DifficultyLevel,
} from '../../../types/database.types';

export interface BoardCell {
  id: string;
  content: string;
  marked: boolean;
  position: { row: number; col: number };
}

// Use the correct database type structure
export type BingoBoard = Tables<'bingo_boards'>;

export type BingoCard = Tables<'bingo_cards'>;

// Community Types
export interface Discussion {
  id: number;
  title: string;
  content: string;
  author: string;
  game: string;
  challengeType: string | null;
  upvotes: number;
  comments: number;
  commentList: Comment[];
  tags: string[];
  created_at: string | null;
  updated_at: string | null;
}

export interface Comment {
  id: number;
  content: string;
  author: string;
  upvotes: number;
  created_at: string | null;
  updated_at: string | null;
  discussion_id: number | null;
}

export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  participants: number;
  maxParticipants: number;
  tags: string[];
  created_at: string | null;
  updated_at: string | null;
}
