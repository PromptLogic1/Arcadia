import type { 
  Json, 
  DifficultyLevel, 
  ChallengeStatus, 
  SubmissionStatus,
  VoteType 
} from './database.core'

// Categories Table
export interface CategoriesTable {
  Row: {
    created_at: string | null
    description: string | null
    id: string
    name: string
    updated_at: string | null
  }
  Insert: {
    created_at?: string | null
    description?: string | null
    id?: string
    name: string
    updated_at?: string | null
  }
  Update: {
    created_at?: string | null
    description?: string | null
    id?: string
    name?: string
    updated_at?: string | null
  }
  Relationships: []
}

// Challenges Table
export interface ChallengesTable {
  Row: {
    category_id: string | null
    created_at: string | null
    created_by: string | null
    description: string
    difficulty: DifficultyLevel
    id: string
    initial_code: string | null
    slug: string
    solution_code: string | null
    status: ChallengeStatus | null
    test_cases: Json | null
    title: string
    updated_at: string | null
  }
  Insert: {
    category_id?: string | null
    created_at?: string | null
    created_by?: string | null
    description: string
    difficulty: DifficultyLevel
    id?: string
    initial_code?: string | null
    slug: string
    solution_code?: string | null
    status?: ChallengeStatus | null
    test_cases?: Json | null
    title: string
    updated_at?: string | null
  }
  Update: {
    category_id?: string | null
    created_at?: string | null
    created_by?: string | null
    description?: string
    difficulty?: DifficultyLevel
    id?: string
    initial_code?: string | null
    slug?: string
    solution_code?: string | null
    status?: ChallengeStatus | null
    test_cases?: Json | null
    title?: string
    updated_at?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "challenges_category_id_fkey"
      columns: ["category_id"]
      isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "challenges_created_by_fkey"
      columns: ["created_by"]
      isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },
  ]
}

// Challenge Tags Table
export interface ChallengeTagsTable {
  Row: {
    challenge_id: string
    tag_id: string
  }
  Insert: {
    challenge_id: string
    tag_id: string
  }
  Update: {
    challenge_id?: string
    tag_id?: string
  }
  Relationships: [
    {
      foreignKeyName: "challenge_tags_challenge_id_fkey"
      columns: ["challenge_id"]
      isOneToOne: false
      referencedRelation: "challenges"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "challenge_tags_tag_id_fkey"
      columns: ["tag_id"]
      isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["id"]
    },
  ]
}

// Submissions Table
export interface SubmissionsTable {
  Row: {
    challenge_id: string | null
    code: string
    created_at: string | null
    id: string
    language: string
    results: Json | null
    status: SubmissionStatus | null
    updated_at: string | null
    user_id: string | null
  }
  Insert: {
    challenge_id?: string | null
    code: string
    created_at?: string | null
    id?: string
    language: string
    results?: Json | null
    status?: SubmissionStatus | null
    updated_at?: string | null
    user_id?: string | null
  }
  Update: {
    challenge_id?: string | null
    code?: string
    created_at?: string | null
    id?: string
    language?: string
    results?: Json | null
    status?: SubmissionStatus | null
    updated_at?: string | null
    user_id?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "submissions_challenge_id_fkey"
      columns: ["challenge_id"]
      isOneToOne: false
      referencedRelation: "challenges"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "submissions_user_id_fkey"
      columns: ["user_id"]
      isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },
  ]
}

// Board Bookmarks Table
export interface BoardBookmarksTable {
  Row: {
    board_id: string
    created_at: string | null
    user_id: string
  }
  Insert: {
    board_id: string
    created_at?: string | null
    user_id: string
  }
  Update: {
    board_id?: string
    created_at?: string | null
    user_id?: string
  }
  Relationships: [
    {
      foreignKeyName: "board_bookmarks_board_id_fkey"
      columns: ["board_id"]
      isOneToOne: false
      referencedRelation: "bingo_boards"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "board_bookmarks_user_id_fkey"
      columns: ["user_id"]
      isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },
  ]
}

// Board Votes Table
export interface BoardVotesTable {
  Row: {
    board_id: string
    created_at: string | null
    updated_at: string | null
    user_id: string
    vote: VoteType
  }
  Insert: {
    board_id: string
    created_at?: string | null
    updated_at?: string | null
    user_id: string
    vote: VoteType
  }
  Update: {
    board_id?: string
    created_at?: string | null
    updated_at?: string | null
    user_id?: string
    vote?: VoteType
  }
  Relationships: [
    {
      foreignKeyName: "board_votes_board_id_fkey"
      columns: ["board_id"]
      isOneToOne: false
      referencedRelation: "bingo_boards"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "board_votes_user_id_fkey"
      columns: ["user_id"]
      isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },
  ]
}

// Card Votes Table
export interface CardVotesTable {
  Row: {
    card_id: string
    created_at: string | null
    updated_at: string | null
    user_id: string
    vote: VoteType
  }
  Insert: {
    card_id: string
    created_at?: string | null
    updated_at?: string | null
    user_id: string
    vote: VoteType
  }
  Update: {
    card_id?: string
    created_at?: string | null
    updated_at?: string | null
    user_id?: string
    vote?: VoteType
  }
  Relationships: [
    {
      foreignKeyName: "card_votes_card_id_fkey"
      columns: ["card_id"]
      isOneToOne: false
      referencedRelation: "bingo_cards"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "card_votes_user_id_fkey"
      columns: ["user_id"]
      isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },
  ]
} 