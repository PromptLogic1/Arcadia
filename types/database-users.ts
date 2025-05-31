import type {
  Json,
  UserRole,
  VisibilityType,
  VoteType,
  TagCategory,
  TagAction,
  TagStatus,
  TagType,
  ActivityType,
  GameCategory,
} from './database-core';

// =============================================================================
// USERS TABLE - Exact match to migration schema
// =============================================================================

export interface UsersTable {
  Row: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    role: UserRole | null;
    experience_points: number | null;
    land: string | null;
    region: string | null;
    city: string | null;
    bio: string | null;
    last_login_at: string | null;
    created_at: string | null;
    updated_at: string | null;
    achievements_visibility: VisibilityType | null;
    auth_id: string | null;
    profile_visibility: VisibilityType | null;
    submissions_visibility: VisibilityType | null;
  };
  Insert: {
    id?: string;
    username: string;
    full_name?: string | null;
    avatar_url?: string | null;
    role?: UserRole | null;
    experience_points?: number | null;
    land?: string | null;
    region?: string | null;
    city?: string | null;
    bio?: string | null;
    last_login_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    achievements_visibility?: VisibilityType | null;
    auth_id?: string | null;
    profile_visibility?: VisibilityType | null;
    submissions_visibility?: VisibilityType | null;
  };
  Update: {
    id?: string;
    username?: string;
    full_name?: string | null;
    avatar_url?: string | null;
    role?: UserRole | null;
    experience_points?: number | null;
    land?: string | null;
    region?: string | null;
    city?: string | null;
    bio?: string | null;
    last_login_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    achievements_visibility?: VisibilityType | null;
    auth_id?: string | null;
    profile_visibility?: VisibilityType | null;
    submissions_visibility?: VisibilityType | null;
  };
  Relationships: [];
}

// =============================================================================
// USER SESSIONS TABLE - Exact match to migration schema
// =============================================================================

export interface UserSessionsTable {
  Row: {
    id: string;
    user_id: string | null;
    session_token: string;
    refresh_token: string | null;
    expires_at: string;
    created_at: string | null;
    last_activity: string | null;
    ip_address: string | null;
    user_agent: string | null;
  };
  Insert: {
    id?: string;
    user_id?: string | null;
    session_token: string;
    refresh_token?: string | null;
    expires_at: string;
    created_at?: string | null;
    last_activity?: string | null;
    ip_address?: string | null;
    user_agent?: string | null;
  };
  Update: {
    id?: string;
    user_id?: string | null;
    session_token?: string;
    refresh_token?: string | null;
    expires_at?: string;
    created_at?: string | null;
    last_activity?: string | null;
    ip_address?: string | null;
    user_agent?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'user_sessions_user_id_fkey';
      columns: ['user_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}

// =============================================================================
// USER FRIENDS TABLE - Exact match to migration schema
// =============================================================================

export interface UserFriendsTable {
  Row: {
    id: string;
    user_id: string;
    friend_id: string;
    status: string | null; // 'pending' | 'accepted' | 'blocked'
    created_at: string | null;
    updated_at: string | null;
  };
  Insert: {
    id?: string;
    user_id: string;
    friend_id: string;
    status?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Update: {
    id?: string;
    user_id?: string;
    friend_id?: string;
    status?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'user_friends_user_id_fkey';
      columns: ['user_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'user_friends_friend_id_fkey';
      columns: ['friend_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}

// =============================================================================
// USER ACHIEVEMENTS TABLE - Exact match to migration schema
// =============================================================================

export interface UserAchievementsTable {
  Row: {
    id: string;
    user_id: string | null;
    achievement_name: string;
    achievement_data: Json | null;
    unlocked_at: string | null;
  };
  Insert: {
    id?: string;
    user_id?: string | null;
    achievement_name: string;
    achievement_data?: Json | null;
    unlocked_at?: string | null;
  };
  Update: {
    id?: string;
    user_id?: string | null;
    achievement_name?: string;
    achievement_data?: Json | null;
    unlocked_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'user_achievements_user_id_fkey';
      columns: ['user_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}

// =============================================================================
// USER ACTIVITY TABLE - Exact match to migration schema
// =============================================================================

export interface UserActivityTable {
  Row: {
    id: string;
    user_id: string | null;
    activity_type: ActivityType;
    activity_data: Json | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string | null;
  };
  Insert: {
    id?: string;
    user_id?: string | null;
    activity_type: ActivityType;
    activity_data?: Json | null;
    ip_address?: string | null;
    user_agent?: string | null;
    created_at?: string | null;
  };
  Update: {
    id?: string;
    user_id?: string | null;
    activity_type?: ActivityType;
    activity_data?: Json | null;
    ip_address?: string | null;
    user_agent?: string | null;
    created_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'user_activity_user_id_fkey';
      columns: ['user_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}

// =============================================================================
// DISCUSSIONS TABLE - Exact match to migration schema
// =============================================================================

export interface DiscussionsTable {
  Row: {
    id: string;
    title: string;
    content: string;
    author_id: string | null;
    game_type: GameCategory | null;
    challenge_type: string | null;
    tags: string[] | null;
    upvotes: number | null;
    view_count: number | null;
    is_pinned: boolean | null;
    is_locked: boolean | null;
    created_at: string | null;
    updated_at: string | null;
  };
  Insert: {
    id?: string;
    title: string;
    content: string;
    author_id?: string | null;
    game_type?: GameCategory | null;
    challenge_type?: string | null;
    tags?: string[] | null;
    upvotes?: number | null;
    view_count?: number | null;
    is_pinned?: boolean | null;
    is_locked?: boolean | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Update: {
    id?: string;
    title?: string;
    content?: string;
    author_id?: string | null;
    game_type?: GameCategory | null;
    challenge_type?: string | null;
    tags?: string[] | null;
    upvotes?: number | null;
    view_count?: number | null;
    is_pinned?: boolean | null;
    is_locked?: boolean | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'discussions_author_id_fkey';
      columns: ['author_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}

// =============================================================================
// COMMENTS TABLE - Exact match to migration schema
// =============================================================================

export interface CommentsTable {
  Row: {
    id: string;
    discussion_id: string | null;
    author_id: string | null;
    content: string;
    parent_id: string | null;
    upvotes: number | null;
    created_at: string | null;
    updated_at: string | null;
  };
  Insert: {
    id?: string;
    discussion_id?: string | null;
    author_id?: string | null;
    content: string;
    parent_id?: string | null;
    upvotes?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Update: {
    id?: string;
    discussion_id?: string | null;
    author_id?: string | null;
    content?: string;
    parent_id?: string | null;
    upvotes?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'comments_discussion_id_fkey';
      columns: ['discussion_id'];
      isOneToOne: false;
      referencedRelation: 'discussions';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'comments_author_id_fkey';
      columns: ['author_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'comments_parent_id_fkey';
      columns: ['parent_id'];
      isOneToOne: false;
      referencedRelation: 'comments';
      referencedColumns: ['id'];
    },
  ];
}

// =============================================================================
// TAGS TABLE - Exact match to migration schema
// =============================================================================

export interface TagsTable {
  Row: {
    id: string;
    name: string;
    description: string | null;
    type: TagType | null;
    category: TagCategory | null;
    color: string | null;
    creator_id: string | null;
    usage_count: number | null;
    status: TagStatus | null;
    created_at: string | null;
    updated_at: string | null;
  };
  Insert: {
    id?: string;
    name: string;
    description?: string | null;
    type?: TagType | null;
    category?: TagCategory | null;
    color?: string | null;
    creator_id?: string | null;
    usage_count?: number | null;
    status?: TagStatus | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Update: {
    id?: string;
    name?: string;
    description?: string | null;
    type?: TagType | null;
    category?: TagCategory | null;
    color?: string | null;
    creator_id?: string | null;
    usage_count?: number | null;
    status?: TagStatus | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'tags_creator_id_fkey';
      columns: ['creator_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}

// =============================================================================
// TAG VOTES TABLE - Exact match to migration schema
// =============================================================================

export interface TagVotesTable {
  Row: {
    id: string;
    tag_id: string | null;
    user_id: string | null;
    vote_type: VoteType;
    created_at: string | null;
  };
  Insert: {
    id?: string;
    tag_id?: string | null;
    user_id?: string | null;
    vote_type: VoteType;
    created_at?: string | null;
  };
  Update: {
    id?: string;
    tag_id?: string | null;
    user_id?: string | null;
    vote_type?: VoteType;
    created_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'tag_votes_tag_id_fkey';
      columns: ['tag_id'];
      isOneToOne: false;
      referencedRelation: 'tags';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'tag_votes_user_id_fkey';
      columns: ['user_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}

// =============================================================================
// TAG REPORTS TABLE - Exact match to migration schema
// =============================================================================

export interface TagReportsTable {
  Row: {
    id: string;
    tag_id: string | null;
    reporter_id: string | null;
    reason: string;
    description: string | null;
    status: string | null; // 'pending' | 'resolved' | 'dismissed'
    resolved_by: string | null;
    resolved_at: string | null;
    created_at: string | null;
  };
  Insert: {
    id?: string;
    tag_id?: string | null;
    reporter_id?: string | null;
    reason: string;
    description?: string | null;
    status?: string | null;
    resolved_by?: string | null;
    resolved_at?: string | null;
    created_at?: string | null;
  };
  Update: {
    id?: string;
    tag_id?: string | null;
    reporter_id?: string | null;
    reason?: string;
    description?: string | null;
    status?: string | null;
    resolved_by?: string | null;
    resolved_at?: string | null;
    created_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'tag_reports_tag_id_fkey';
      columns: ['tag_id'];
      isOneToOne: false;
      referencedRelation: 'tags';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'tag_reports_reporter_id_fkey';
      columns: ['reporter_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'tag_reports_resolved_by_fkey';
      columns: ['resolved_by'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}

// =============================================================================
// TAG HISTORY TABLE - Exact match to migration schema
// =============================================================================

export interface TagHistoryTable {
  Row: {
    id: string;
    tag_id: string | null;
    user_id: string | null;
    action: TagAction;
    old_data: Json | null;
    new_data: Json | null;
    created_at: string | null;
  };
  Insert: {
    id?: string;
    tag_id?: string | null;
    user_id?: string | null;
    action: TagAction;
    old_data?: Json | null;
    new_data?: Json | null;
    created_at?: string | null;
  };
  Update: {
    id?: string;
    tag_id?: string | null;
    user_id?: string | null;
    action?: TagAction;
    old_data?: Json | null;
    new_data?: Json | null;
    created_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'tag_history_tag_id_fkey';
      columns: ['tag_id'];
      isOneToOne: false;
      referencedRelation: 'tags';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'tag_history_user_id_fkey';
      columns: ['user_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}