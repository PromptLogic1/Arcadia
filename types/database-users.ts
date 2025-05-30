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
} from './database-core';

// =====================================================================
// USERS TABLE
// =====================================================================

export interface UsersTable {
  Row: {
    achievements_visibility: VisibilityType | null;
    auth_id: string | null;
    avatar_url: string | null;
    bio: string | null;
    city: string | null;
    created_at: string | null;
    experience_points: number | null;
    full_name: string | null;
    id: string;
    land: string | null;
    last_login_at: string | null;
    profile_visibility: VisibilityType | null;
    region: string | null;
    role: UserRole | null;
    submissions_visibility: VisibilityType | null;
    updated_at: string | null;
    username: string;
  };
  Insert: {
    achievements_visibility?: VisibilityType | null;
    auth_id?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
    city?: string | null;
    created_at?: string | null;
    experience_points?: number | null;
    full_name?: string | null;
    id?: string;
    land?: string | null;
    last_login_at?: string | null;
    profile_visibility?: VisibilityType | null;
    region?: string | null;
    role?: UserRole | null;
    submissions_visibility?: VisibilityType | null;
    updated_at?: string | null;
    username: string;
  };
  Update: {
    achievements_visibility?: VisibilityType | null;
    auth_id?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
    city?: string | null;
    created_at?: string | null;
    experience_points?: number | null;
    full_name?: string | null;
    id?: string;
    land?: string | null;
    last_login_at?: string | null;
    profile_visibility?: VisibilityType | null;
    region?: string | null;
    role?: UserRole | null;
    submissions_visibility?: VisibilityType | null;
    updated_at?: string | null;
    username?: string;
  };
  Relationships: [];
}

// =====================================================================
// USER SESSIONS TABLE
// =====================================================================

export interface UserSessionsTable {
  Row: {
    created_at: string | null;
    device_info: Json | null;
    expires_at: string;
    id: string;
    ip_address: string | null;
    last_activity: string | null;
    session_token: string;
    user_id: string | null;
  };
  Insert: {
    created_at?: string | null;
    device_info?: Json | null;
    expires_at: string;
    id?: string;
    ip_address?: string | null;
    last_activity?: string | null;
    session_token: string;
    user_id?: string | null;
  };
  Update: {
    created_at?: string | null;
    device_info?: Json | null;
    expires_at?: string;
    id?: string;
    ip_address?: string | null;
    last_activity?: string | null;
    session_token?: string;
    user_id?: string | null;
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

// =====================================================================
// USER FRIENDS TABLE
// =====================================================================

export interface UserFriendsTable {
  Row: {
    created_at: string | null;
    friend_id: string;
    status: string | null;
    updated_at: string | null;
    user_id: string;
  };
  Insert: {
    created_at?: string | null;
    friend_id: string;
    status?: string | null;
    updated_at?: string | null;
    user_id: string;
  };
  Update: {
    created_at?: string | null;
    friend_id?: string;
    status?: string | null;
    updated_at?: string | null;
    user_id?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'user_friends_friend_id_fkey';
      columns: ['friend_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'user_friends_user_id_fkey';
      columns: ['user_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}

// =====================================================================
// USER ACHIEVEMENTS TABLE
// =====================================================================

export interface UserAchievementsTable {
  Row: {
    achievement_name: string;
    achievement_type: string;
    created_at: string | null;
    description: string | null;
    id: string;
    metadata: Json | null;
    points: number | null;
    unlocked_at: string | null;
    user_id: string | null;
  };
  Insert: {
    achievement_name: string;
    achievement_type: string;
    created_at?: string | null;
    description?: string | null;
    id?: string;
    metadata?: Json | null;
    points?: number | null;
    unlocked_at?: string | null;
    user_id?: string | null;
  };
  Update: {
    achievement_name?: string;
    achievement_type?: string;
    created_at?: string | null;
    description?: string | null;
    id?: string;
    metadata?: Json | null;
    points?: number | null;
    unlocked_at?: string | null;
    user_id?: string | null;
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

// =====================================================================
// DISCUSSIONS TABLE
// =====================================================================

export interface DiscussionsTable {
  Row: {
    author_id: string | null;
    challenge_type: string | null;
    content: string;
    created_at: string | null;
    game: string;
    id: number;
    tags: string[] | null;
    title: string;
    updated_at: string | null;
    upvotes: number | null;
  };
  Insert: {
    author_id?: string | null;
    challenge_type?: string | null;
    content: string;
    created_at?: string | null;
    game: string;
    id?: number;
    tags?: string[] | null;
    title: string;
    updated_at?: string | null;
    upvotes?: number | null;
  };
  Update: {
    author_id?: string | null;
    challenge_type?: string | null;
    content?: string;
    created_at?: string | null;
    game?: string;
    id?: number;
    tags?: string[] | null;
    title?: string;
    updated_at?: string | null;
    upvotes?: number | null;
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

// =====================================================================
// COMMENTS TABLE
// =====================================================================

export interface CommentsTable {
  Row: {
    author_id: string | null;
    content: string;
    created_at: string | null;
    discussion_id: number | null;
    id: number;
    updated_at: string | null;
    upvotes: number | null;
  };
  Insert: {
    author_id?: string | null;
    content: string;
    created_at?: string | null;
    discussion_id?: number | null;
    id?: number;
    updated_at?: string | null;
    upvotes?: number | null;
  };
  Update: {
    author_id?: string | null;
    content?: string;
    created_at?: string | null;
    discussion_id?: number | null;
    id?: number;
    updated_at?: string | null;
    upvotes?: number | null;
  };
  Relationships: [
    {
      foreignKeyName: 'comments_author_id_fkey';
      columns: ['author_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'comments_discussion_id_fkey';
      columns: ['discussion_id'];
      isOneToOne: false;
      referencedRelation: 'discussions';
      referencedColumns: ['id'];
    },
  ];
}

// =====================================================================
// TAGS TABLE
// =====================================================================

export interface TagsTable {
  Row: {
    category: TagCategory | null;
    created_at: string | null;
    created_by: string | null;
    description: string;
    game: string | null;
    id: string;
    name: string;
    status: TagStatus | null;
    type: TagType;
    updated_at: string | null;
    usage_count: number | null;
    votes: number | null;
  };
  Insert: {
    category?: TagCategory | null;
    created_at?: string | null;
    created_by?: string | null;
    description: string;
    game?: string | null;
    id?: string;
    name: string;
    status?: TagStatus | null;
    type: TagType;
    updated_at?: string | null;
    usage_count?: number | null;
    votes?: number | null;
  };
  Update: {
    category?: TagCategory | null;
    created_at?: string | null;
    created_by?: string | null;
    description?: string;
    game?: string | null;
    id?: string;
    name?: string;
    status?: TagStatus | null;
    type?: TagType;
    updated_at?: string | null;
    usage_count?: number | null;
    votes?: number | null;
  };
  Relationships: [
    {
      foreignKeyName: 'tags_created_by_fkey';
      columns: ['created_by'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}

// =====================================================================
// TAG VOTES TABLE
// =====================================================================

export interface TagVotesTable {
  Row: {
    id: string;
    tag_id: string | null;
    timestamp: string | null;
    user_id: string | null;
    vote: VoteType;
  };
  Insert: {
    id?: string;
    tag_id?: string | null;
    timestamp?: string | null;
    user_id?: string | null;
    vote: VoteType;
  };
  Update: {
    id?: string;
    tag_id?: string | null;
    timestamp?: string | null;
    user_id?: string | null;
    vote?: VoteType;
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

// =====================================================================
// TAG REPORTS TABLE
// =====================================================================

export interface TagReportsTable {
  Row: {
    id: string;
    reason: string;
    tag_id: string | null;
    timestamp: string | null;
    user_id: string | null;
  };
  Insert: {
    id?: string;
    reason: string;
    tag_id?: string | null;
    timestamp?: string | null;
    user_id?: string | null;
  };
  Update: {
    id?: string;
    reason?: string;
    tag_id?: string | null;
    timestamp?: string | null;
    user_id?: string | null;
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
      foreignKeyName: 'tag_reports_user_id_fkey';
      columns: ['user_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}

// =====================================================================
// USER ACTIVITY TABLE
// =====================================================================

export interface UserActivityTable {
  Row: {
    id: string;
    user_id: string | null;
    activity_type: ActivityType;
    data: Json | null;
    timestamp: string | null;
    created_at: string | null;
  };
  Insert: {
    id?: string;
    user_id?: string | null;
    activity_type: ActivityType;
    data?: Json | null;
    timestamp?: string | null;
    created_at?: string | null;
  };
  Update: {
    id?: string;
    user_id?: string | null;
    activity_type?: ActivityType;
    data?: Json | null;
    timestamp?: string | null;
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

// =====================================================================
// TAG HISTORY TABLE
// =====================================================================

export interface TagHistoryTable {
  Row: {
    action: TagAction;
    changes: Json | null;
    created_at: string | null;
    id: string;
    performed_by: string | null;
    tag_id: string | null;
  };
  Insert: {
    action: TagAction;
    changes?: Json | null;
    created_at?: string | null;
    id?: string;
    performed_by?: string | null;
    tag_id?: string | null;
  };
  Update: {
    action?: TagAction;
    changes?: Json | null;
    created_at?: string | null;
    id?: string;
    performed_by?: string | null;
    tag_id?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'tag_history_performed_by_fkey';
      columns: ['performed_by'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'tag_history_tag_id_fkey';
      columns: ['tag_id'];
      isOneToOne: false;
      referencedRelation: 'tags';
      referencedColumns: ['id'];
    },
  ];
}
