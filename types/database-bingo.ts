import type {
  Json,
  DifficultyLevel,
  GameCategory,
  BoardStatus,
  SessionStatus,
  QueueStatus,
  BoardCell,
  BoardSettings,
  SessionSettings,
} from './database-core';

// =============================================================================
// BINGO BOARDS TABLE - Exact match to migration schema
// =============================================================================

export interface BingoBoardsTable {
  Row: {
    id: string;
    title: string;
    description: string | null;
    creator_id: string | null;
    size: number | null;
    settings: BoardSettings | null;
    game_type: GameCategory;
    difficulty: DifficultyLevel;
    is_public: boolean | null;
    board_state: BoardCell[] | null;
    status: BoardStatus | null;
    votes: number | null;
    bookmarked_count: number | null;
    version: number | null;
    cloned_from: string | null;
    created_at: string | null;
    updated_at: string | null;
  };
  Insert: {
    id?: string;
    title: string;
    description?: string | null;
    creator_id?: string | null;
    size?: number | null;
    settings?: BoardSettings | null;
    game_type: GameCategory;
    difficulty: DifficultyLevel;
    is_public?: boolean | null;
    board_state?: BoardCell[] | null;
    status?: BoardStatus | null;
    votes?: number | null;
    bookmarked_count?: number | null;
    version?: number | null;
    cloned_from?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Update: {
    id?: string;
    title?: string;
    description?: string | null;
    creator_id?: string | null;
    size?: number | null;
    settings?: BoardSettings | null;
    game_type?: GameCategory;
    difficulty?: DifficultyLevel;
    is_public?: boolean | null;
    board_state?: BoardCell[] | null;
    status?: BoardStatus | null;
    votes?: number | null;
    bookmarked_count?: number | null;
    version?: number | null;
    cloned_from?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'bingo_boards_creator_id_fkey';
      columns: ['creator_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'bingo_boards_cloned_from_fkey';
      columns: ['cloned_from'];
      isOneToOne: false;
      referencedRelation: 'bingo_boards';
      referencedColumns: ['id'];
    },
  ];
}

// =============================================================================
// BINGO CARDS TABLE - Exact match to migration schema
// =============================================================================

export interface BingoCardsTable {
  Row: {
    id: string;
    title: string;
    description: string | null;
    creator_id: string | null;
    game_type: GameCategory;
    difficulty: DifficultyLevel;
    tags: string[] | null;
    is_public: boolean | null;
    votes: number | null;
    created_at: string | null;
    updated_at: string | null;
  };
  Insert: {
    id?: string;
    title: string;
    description?: string | null;
    creator_id?: string | null;
    game_type: GameCategory;
    difficulty: DifficultyLevel;
    tags?: string[] | null;
    is_public?: boolean | null;
    votes?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Update: {
    id?: string;
    title?: string;
    description?: string | null;
    creator_id?: string | null;
    game_type?: GameCategory;
    difficulty?: DifficultyLevel;
    tags?: string[] | null;
    is_public?: boolean | null;
    votes?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'bingo_cards_creator_id_fkey';
      columns: ['creator_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}

// =============================================================================
// BINGO SESSIONS TABLE - Exact match to migration schema
// =============================================================================

export interface BingoSessionsTable {
  Row: {
    id: string;
    board_id: string | null;
    host_id: string | null;
    session_code: string;
    settings: SessionSettings | null;
    status: SessionStatus | null;
    max_players: number | null;
    current_players: number | null;
    winner_id: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string | null;
    updated_at: string | null;
  };
  Insert: {
    id?: string;
    board_id?: string | null;
    host_id?: string | null;
    session_code: string;
    settings?: SessionSettings | null;
    status?: SessionStatus | null;
    max_players?: number | null;
    current_players?: number | null;
    winner_id?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Update: {
    id?: string;
    board_id?: string | null;
    host_id?: string | null;
    session_code?: string;
    settings?: SessionSettings | null;
    status?: SessionStatus | null;
    max_players?: number | null;
    current_players?: number | null;
    winner_id?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'bingo_sessions_board_id_fkey';
      columns: ['board_id'];
      isOneToOne: false;
      referencedRelation: 'bingo_boards';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'bingo_sessions_host_id_fkey';
      columns: ['host_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'bingo_sessions_winner_id_fkey';
      columns: ['winner_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}

// =============================================================================
// BINGO SESSION PLAYERS TABLE - Exact match to migration schema
// =============================================================================

export interface BingoSessionPlayersTable {
  Row: {
    id: string;
    session_id: string;
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    is_ready: boolean | null;
    is_host: boolean | null;
    score: number | null;
    position: number | null;
    joined_at: string | null;
    left_at: string | null;
  };
  Insert: {
    id?: string;
    session_id: string;
    user_id: string;
    display_name: string;
    avatar_url?: string | null;
    is_ready?: boolean | null;
    is_host?: boolean | null;
    score?: number | null;
    position?: number | null;
    joined_at?: string | null;
    left_at?: string | null;
  };
  Update: {
    id?: string;
    session_id?: string;
    user_id?: string;
    display_name?: string;
    avatar_url?: string | null;
    is_ready?: boolean | null;
    is_host?: boolean | null;
    score?: number | null;
    position?: number | null;
    joined_at?: string | null;
    left_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'bingo_session_players_session_id_fkey';
      columns: ['session_id'];
      isOneToOne: false;
      referencedRelation: 'bingo_sessions';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'bingo_session_players_user_id_fkey';
      columns: ['user_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}

// =============================================================================
// BINGO SESSION QUEUE TABLE - Exact match to migration schema
// =============================================================================

export interface BingoSessionQueueTable {
  Row: {
    id: string;
    user_id: string | null;
    game_type: GameCategory;
    difficulty: DifficultyLevel;
    max_players: number | null;
    status: QueueStatus | null;
    priority: number | null;
    estimated_wait_time: number | null;
    created_at: string | null;
    updated_at: string | null;
  };
  Insert: {
    id?: string;
    user_id?: string | null;
    game_type: GameCategory;
    difficulty: DifficultyLevel;
    max_players?: number | null;
    status?: QueueStatus | null;
    priority?: number | null;
    estimated_wait_time?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Update: {
    id?: string;
    user_id?: string | null;
    game_type?: GameCategory;
    difficulty?: DifficultyLevel;
    max_players?: number | null;
    status?: QueueStatus | null;
    priority?: number | null;
    estimated_wait_time?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'bingo_session_queue_user_id_fkey';
      columns: ['user_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}

// =============================================================================
// BINGO SESSION EVENTS TABLE - Exact match to migration schema
// =============================================================================

export interface BingoSessionEventsTable {
  Row: {
    id: string;
    session_id: string | null;
    user_id: string | null;
    event_type: string;
    event_data: Json | null;
    cell_position: number | null;
    timestamp: string | null;
  };
  Insert: {
    id?: string;
    session_id?: string | null;
    user_id?: string | null;
    event_type: string;
    event_data?: Json | null;
    cell_position?: number | null;
    timestamp?: string | null;
  };
  Update: {
    id?: string;
    session_id?: string | null;
    user_id?: string | null;
    event_type?: string;
    event_data?: Json | null;
    cell_position?: number | null;
    timestamp?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'bingo_session_events_session_id_fkey';
      columns: ['session_id'];
      isOneToOne: false;
      referencedRelation: 'bingo_sessions';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'bingo_session_events_user_id_fkey';
      columns: ['user_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}

// =============================================================================
// BINGO SESSION CELLS TABLE - Exact match to migration schema
// =============================================================================

export interface BingoSessionCellsTable {
  Row: {
    id: string;
    session_id: string | null;
    cell_position: number;
    card_id: string | null;
    marked_by: string | null;
    marked_at: string | null;
    verified: boolean | null;
    verification_data: Json | null;
  };
  Insert: {
    id?: string;
    session_id?: string | null;
    cell_position: number;
    card_id?: string | null;
    marked_by?: string | null;
    marked_at?: string | null;
    verified?: boolean | null;
    verification_data?: Json | null;
  };
  Update: {
    id?: string;
    session_id?: string | null;
    cell_position?: number;
    card_id?: string | null;
    marked_by?: string | null;
    marked_at?: string | null;
    verified?: boolean | null;
    verification_data?: Json | null;
  };
  Relationships: [
    {
      foreignKeyName: 'bingo_session_cells_session_id_fkey';
      columns: ['session_id'];
      isOneToOne: false;
      referencedRelation: 'bingo_sessions';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'bingo_session_cells_card_id_fkey';
      columns: ['card_id'];
      isOneToOne: false;
      referencedRelation: 'bingo_cards';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'bingo_session_cells_marked_by_fkey';
      columns: ['marked_by'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}
