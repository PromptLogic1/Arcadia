// =============================================================================
// COMMUNITY DOMAIN TYPES - Discussion, Tags, Comments
// =============================================================================

import type {
  Discussion,
  Comment,
  Tag,
  TagVote,
  TagReport,
  TagHistory,
  User,
  GameCategory,
  TagStatus,
  TagType,
  VoteType,
} from '../index'

// =============================================================================
// ENHANCED DISCUSSION TYPES
// =============================================================================

export interface GameDiscussion extends Discussion {
  // Relations
  author?: Pick<User, 'id' | 'username' | 'avatar_url' | 'role'>
  
  // Computed properties
  commentCount?: number
  hasUserVoted?: boolean
  userVote?: VoteType | null
  isBookmarked?: boolean
  
  // Metadata
  readTime?: number // estimated minutes
  engagement?: {
    views: number
    shares: number
    saves: number
  }
  
  // Moderation
  isFlagged?: boolean
  moderationStatus?: 'pending' | 'approved' | 'rejected'
}

export interface GameComment extends Comment {
  // Relations
  author?: Pick<User, 'id' | 'username' | 'avatar_url' | 'role'>
  replies?: GameComment[]
  
  // State
  hasUserVoted?: boolean
  userVote?: VoteType | null
  isEdited?: boolean
  
  // Hierarchy
  depth?: number
  parentId?: number | null
  
  // Moderation
  isFlagged?: boolean
  isHidden?: boolean
}

// =============================================================================
// TAG SYSTEM TYPES
// =============================================================================

export interface GameTag extends Tag {
  // Relations
  creator?: Pick<User, 'id' | 'username' | 'avatar_url'>
  
  // Computed properties
  usageFrequency?: 'low' | 'medium' | 'high'
  trendingScore?: number
  relatedTags?: string[]
  
  // User interaction
  hasUserVoted?: boolean
  userVote?: VoteType | null
  
  // Metadata
  isOfficial?: boolean
  isDeprecated?: boolean
  replacedBy?: string[]
}

export interface TagWithHistory extends GameTag {
  history?: TagHistoryEntry[]
  reports?: TagReportEntry[]
  voteCount?: number
}

export interface TagHistoryEntry extends TagHistory {
  performer?: Pick<User, 'id' | 'username' | 'avatar_url'>
}

export interface TagReportEntry extends TagReport {
  reporter?: Pick<User, 'id' | 'username'>
  moderator?: Pick<User, 'id' | 'username'>
  status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
}

// =============================================================================
// FORM TYPES
// =============================================================================

export interface CreateDiscussionForm {
  title: string
  content: string
  game: GameCategory
  challenge_type?: string
  tags?: string[]
  is_anonymous?: boolean
}

export interface CreateCommentForm {
  content: string
  discussion_id: number
  parent_id?: number
}

export interface CreateTagForm {
  name: string
  description: string
  type: TagType
  game?: GameCategory
  category_id?: string
}

export interface ReportTagForm {
  tag_id: string
  reason: string
  details?: string
}

// =============================================================================
// FILTER TYPES
// =============================================================================

export interface DiscussionFilter {
  game?: GameCategory | 'All Games'
  challenge_type?: string | 'all'
  tags?: string[]
  author_id?: string
  search?: string
  sort?: 'newest' | 'oldest' | 'popular' | 'trending' | 'unanswered'
  time_range?: 'day' | 'week' | 'month' | 'year' | 'all'
  min_upvotes?: number
  has_comments?: boolean
}

export interface TagFilter {
  type?: TagType | 'all'
  status?: TagStatus | 'all'
  game?: GameCategory | 'All Games'
  search?: string
  sort?: 'alphabetical' | 'usage' | 'newest' | 'trending' | 'controversial'
  created_by?: string
  min_usage?: number
}

// =============================================================================
// SEARCH AND DISCOVERY
// =============================================================================

export interface SearchResult {
  type: 'discussion' | 'comment' | 'tag' | 'user'
  id: string | number
  title: string
  snippet: string
  relevance: number
  metadata: Record<string, any>
}

export interface TrendingContent {
  discussions: GameDiscussion[]
  tags: GameTag[]
  users: Pick<User, 'id' | 'username' | 'avatar_url'>[]
  topics: string[]
}

// =============================================================================
// MODERATION TYPES
// =============================================================================

export interface ModerationAction {
  type: 'hide' | 'delete' | 'approve' | 'flag' | 'unflag'
  target_type: 'discussion' | 'comment' | 'tag'
  target_id: string | number
  reason?: string
  moderator_id: string
  timestamp: Date
}

export interface ContentFlags {
  spam: boolean
  inappropriate: boolean
  off_topic: boolean
  harassment: boolean
  duplicate: boolean
  misinformation: boolean
}

// =============================================================================
// STATISTICS AND ANALYTICS
// =============================================================================

export interface CommunityStats {
  discussions: {
    total: number
    today: number
    week: number
    month: number
    trending: GameDiscussion[]
  }
  comments: {
    total: number
    today: number
    average_per_discussion: number
  }
  tags: {
    total: number
    active: number
    trending: GameTag[]
    most_used: GameTag[]
  }
  engagement: {
    active_users: number
    posts_per_user: number
    average_response_time: number
  }
}

export interface UserCommunityStats {
  discussions_created: number
  comments_posted: number
  upvotes_received: number
  tags_created: number
  reputation_score: number
  rank?: 'newcomer' | 'contributor' | 'expert' | 'moderator'
  badges?: string[]
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export type CommunityNotificationType = 
  | 'discussion_reply'
  | 'comment_reply'
  | 'discussion_upvote'
  | 'comment_upvote'
  | 'mention'
  | 'tag_suggestion'
  | 'moderation_action'

export interface CommunityNotification {
  id: string
  type: CommunityNotificationType
  title: string
  message: string
  link: string
  read: boolean
  created_at: Date
  data: {
    discussion_id?: number
    comment_id?: number
    tag_id?: string
    user_id?: string
    action?: string
  }
}

// =============================================================================
// UI COMPONENT PROPS
// =============================================================================

export interface DiscussionCardProps {
  discussion: GameDiscussion
  variant?: 'default' | 'compact' | 'detailed'
  showAuthor?: boolean
  showTags?: boolean
  showPreview?: boolean
  onVote?: (discussionId: number, vote: VoteType) => void
  onBookmark?: (discussionId: number) => void
  onSelect?: (discussion: GameDiscussion) => void
  className?: string
}

export interface CommentProps {
  comment: GameComment
  level?: number
  showReplies?: boolean
  allowReply?: boolean
  onVote?: (commentId: number, vote: VoteType) => void
  onReply?: (commentId: number, content: string) => void
  onEdit?: (commentId: number, content: string) => void
  onDelete?: (commentId: number) => void
  className?: string
}

export interface TagBadgeProps {
  tag: GameTag
  variant?: 'default' | 'compact' | 'detailed' | 'selectable'
  clickable?: boolean
  removable?: boolean
  onSelect?: (tag: GameTag) => void
  onRemove?: (tag: GameTag) => void
  className?: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DISCUSSION_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'trending', label: 'Trending' },
  { value: 'unanswered', label: 'Unanswered' },
] as const

export const TAG_TYPES = [
  { value: 'core', label: 'Core', description: 'Essential gameplay tags' },
  { value: 'game', label: 'Game', description: 'Game-specific tags' },
  { value: 'community', label: 'Community', description: 'User-created tags' },
] as const

export const REPORT_REASONS = [
  'Inappropriate content',
  'Spam or duplicate',
  'Harassment or abuse',
  'Off-topic',
  'Misleading information',
  'Copyright violation',
  'Other',
] as const

export const COMMUNITY_LIMITS = {
  MAX_TAGS_PER_DISCUSSION: 5,
  MAX_TAG_NAME_LENGTH: 30,
  MAX_DISCUSSION_TITLE_LENGTH: 200,
  MAX_COMMENT_LENGTH: 2000,
  MIN_TAG_USAGE_FOR_SUGGESTIONS: 3,
  TRENDING_CALCULATION_HOURS: 24,
} as const

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isValidTagName(name: string): boolean {
  return (
    name.length > 0 &&
    name.length <= COMMUNITY_LIMITS.MAX_TAG_NAME_LENGTH &&
    /^[a-zA-Z0-9\s-_]+$/.test(name)
  )
}

export function isGameDiscussion(obj: unknown): obj is GameDiscussion {
  return (
    obj !== null && 
    typeof obj === 'object' && 
    'id' in obj && 
    'title' in obj &&
    typeof (obj as Record<string, unknown>).id === 'number' && 
    typeof (obj as Record<string, unknown>).title === 'string'
  )
}

export function isGameComment(obj: unknown): obj is GameComment {
  return (
    obj !== null && 
    typeof obj === 'object' && 
    'id' in obj && 
    'content' in obj &&
    typeof (obj as Record<string, unknown>).id === 'number' && 
    typeof (obj as Record<string, unknown>).content === 'string'
  )
}

export function isGameTag(obj: unknown): obj is GameTag {
  return (
    obj !== null && 
    typeof obj === 'object' && 
    'id' in obj && 
    'name' in obj &&
    typeof (obj as Record<string, unknown>).id === 'string' && 
    typeof (obj as Record<string, unknown>).name === 'string'
  )
} 