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

// Bingo Boards Table
export interface BingoBoardsTable {
  Row: {
    board_state: BoardCell[] | null;
    bookmarked_count: number | null;
    cloned_from: string | null;
    created_at: string | null;
    creator_id: string | null;
    description: string | null;
    difficulty: DifficultyLevel;
    game_type: GameCategory;
    id: string;
    is_public: boolean | null;
    settings: BoardSettings | null;
    size: number | null;
    status: BoardStatus | null;
    title: string;
    updated_at: string | null;
    version: number | null;
    votes: number | null;
  };
  Insert: {
    board_state?: BoardCell[] | null;
    bookmarked_count?: number | null;
    cloned_from?: string | null;
    created_at?: string | null;
    creator_id?: string | null;
    description?: string | null;
    difficulty: DifficultyLevel;
    game_type: GameCategory;
    id?: string;
    is_public?: boolean | null;
    settings?: BoardSettings | null;
    size?: number | null;
    status?: BoardStatus | null;
    title: string;
    updated_at?: string | null;
    version?: number | null;
    votes?: number | null;
  };
  Update: {
    board_state?: BoardCell[] | null;
    bookmarked_count?: number | null;
    cloned_from?: string | null;
    created_at?: string | null;
    creator_id?: string | null;
    description?: string | null;
    difficulty?: DifficultyLevel;
    game_type?: GameCategory;
    id?: string;
    is_public?: boolean | null;
    settings?: BoardSettings | null;
    size?: number | null;
    status?: BoardStatus | null;
    title?: string;
    updated_at?: string | null;
    version?: number | null;
    votes?: number | null;
  };
  Relationships: [
    {
      foreignKeyName: 'bingo_boards_cloned_from_fkey';
      columns: ['cloned_from'];
      isOneToOne: false;
      referencedRelation: 'bingo_boards';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'bingo_boards_creator_id_fkey';
      columns: ['creator_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}

// Bingo Cards Table
export interface BingoCardsTable {
  Row: {
    created_at: string | null;
    creator_id: string | null;
    description: string | null;
    difficulty: DifficultyLevel;
    game_type: GameCategory;
    id: string;
    is_public: boolean | null;
    tags: string[] | null;
    title: string;
    updated_at: string | null;
    votes: number | null;
  };
  Insert: {
    created_at?: string | null;
    creator_id?: string | null;
    description?: string | null;
    difficulty: DifficultyLevel;
    game_type: GameCategory;
    id?: string;
    is_public?: boolean | null;
    tags?: string[] | null;
    title: string;
    updated_at?: string | null;
    votes?: number | null;
  };
  Update: {
    created_at?: string | null;
    creator_id?: string | null;
    description?: string | null;
    difficulty?: DifficultyLevel;
    game_type?: GameCategory;
    id?: string;
    is_public?: boolean | null;
    tags?: string[] | null;
    title?: string;
    updated_at?: string | null;
    votes?: number | null;
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

// Bingo Sessions Table
export interface BingoSessionsTable {
  Row: {
    board_id: string | null;
    created_at: string | null;
    current_state: BoardCell[] | null;
    ended_at: string | null;
    host_id: string | null;
    id: string;
    settings: SessionSettings | null;
    started_at: string | null;
    status: SessionStatus | null;
    updated_at: string | null;
    winner_id: string | null;
  };
  Insert: {
    board_id?: string | null;
    created_at?: string | null;
    current_state?: BoardCell[] | null;
    ended_at?: string | null;
    host_id?: string | null;
    id?: string;
    settings?: SessionSettings | null;
    started_at?: string | null;
    status?: SessionStatus | null;
    updated_at?: string | null;
    winner_id?: string | null;
  };
  Update: {
    board_id?: string | null;
    created_at?: string | null;
    current_state?: BoardCell[] | null;
    ended_at?: string | null;
    host_id?: string | null;
    id?: string;
    settings?: SessionSettings | null;
    started_at?: string | null;
    status?: SessionStatus | null;
    updated_at?: string | null;
    winner_id?: string | null;
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

// Bingo Session Players Table
export interface BingoSessionPlayersTable {
  Row: {
    color: string;
    created_at: string | null;
    joined_at: string | null;
    player_name: string;
    session_id: string;
    team: number | null;
    updated_at: string | null;
    user_id: string;
  };
  Insert: {
    color: string;
    created_at?: string | null;
    joined_at?: string | null;
    player_name: string;
    session_id: string;
    team?: number | null;
    updated_at?: string | null;
    user_id: string;
  };
  Update: {
    color?: string;
    created_at?: string | null;
    joined_at?: string | null;
    player_name?: string;
    session_id?: string;
    team?: number | null;
    updated_at?: string | null;
    user_id?: string;
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

// Bingo Session Events Table
export interface BingoSessionEventsTable {
  Row: {
    board_id: string | null;
    created_at: string | null;
    data: Json | null;
    event_type: string;
    id: string;
    player_id: string | null;
    session_id: string | null;
    timestamp: number;
    updated_at: string | null;
    version: number | null;
  };
  Insert: {
    board_id?: string | null;
    created_at?: string | null;
    data?: Json | null;
    event_type: string;
    id?: string;
    player_id?: string | null;
    session_id?: string | null;
    timestamp: number;
    updated_at?: string | null;
    version?: number | null;
  };
  Update: {
    board_id?: string | null;
    created_at?: string | null;
    data?: Json | null;
    event_type?: string;
    id?: string;
    player_id?: string | null;
    session_id?: string | null;
    timestamp?: number;
    updated_at?: string | null;
    version?: number | null;
  };
  Relationships: [
    {
      foreignKeyName: 'bingo_session_events_board_id_fkey';
      columns: ['board_id'];
      isOneToOne: false;
      referencedRelation: 'bingo_boards';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'bingo_session_events_player_id_fkey';
      columns: ['player_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'bingo_session_events_session_id_fkey';
      columns: ['session_id'];
      isOneToOne: false;
      referencedRelation: 'bingo_sessions';
      referencedColumns: ['id'];
    },
  ];
}

// Bingo Session Cells Table
export interface BingoSessionCellsTable {
  Row: {
    board_id: string | null;
    cell_data: BoardCell | null;
    created_at: string | null;
    id: string;
    session_id: string | null;
    updated_at: string | null;
    version: number | null;
  };
  Insert: {
    board_id?: string | null;
    cell_data?: BoardCell | null;
    created_at?: string | null;
    id?: string;
    session_id?: string | null;
    updated_at?: string | null;
    version?: number | null;
  };
  Update: {
    board_id?: string | null;
    cell_data?: BoardCell | null;
    created_at?: string | null;
    id?: string;
    session_id?: string | null;
    updated_at?: string | null;
    version?: number | null;
  };
  Relationships: [
    {
      foreignKeyName: 'bingo_session_cells_board_id_fkey';
      columns: ['board_id'];
      isOneToOne: false;
      referencedRelation: 'bingo_boards';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'bingo_session_cells_session_id_fkey';
      columns: ['session_id'];
      isOneToOne: false;
      referencedRelation: 'bingo_sessions';
      referencedColumns: ['id'];
    },
  ];
}

// Bingo Session Queue Table
export interface BingoSessionQueueTable {
  Row: {
    color: string;
    created_at: string | null;
    id: string;
    player_name: string;
    processed_at: string | null;
    requested_at: string | null;
    session_id: string | null;
    status: QueueStatus | null;
    team: number | null;
    updated_at: string | null;
    user_id: string | null;
  };
  Insert: {
    color: string;
    created_at?: string | null;
    id?: string;
    player_name: string;
    processed_at?: string | null;
    requested_at?: string | null;
    session_id?: string | null;
    status?: QueueStatus | null;
    team?: number | null;
    updated_at?: string | null;
    user_id?: string | null;
  };
  Update: {
    color?: string;
    created_at?: string | null;
    id?: string;
    player_name?: string;
    processed_at?: string | null;
    requested_at?: string | null;
    session_id?: string | null;
    status?: QueueStatus | null;
    team?: number | null;
    updated_at?: string | null;
    user_id?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'bingo_session_queue_session_id_fkey';
      columns: ['session_id'];
      isOneToOne: false;
      referencedRelation: 'bingo_sessions';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'bingo_session_queue_user_id_fkey';
      columns: ['user_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}
