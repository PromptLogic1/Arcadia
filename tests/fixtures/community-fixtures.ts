import type { Tables } from '../../types/database.types';

// ============================================================================
// TYPES FROM DATABASE SCHEMA
// ============================================================================

export type Discussion = Tables<'discussions'>;
export type Comment = Tables<'comments'>;

export interface DiscussionWithAuthor extends Discussion {
  author: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  comment_count?: number;
  user_upvoted?: boolean;
}

export interface CommentWithAuthor extends Comment {
  author: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  replies?: CommentWithAuthor[];
  user_upvoted?: boolean;
}

export interface CommentThread {
  parent: CommentWithAuthor;
  replies: CommentWithAuthor[];
  total_replies: number;
}

// ============================================================================
// TEST USER SCENARIOS
// ============================================================================

export const USER_SCENARIOS = {
  regularUser: {
    id: 'user_123',
    username: 'speedrun_master',
    email: 'speedrun@test.com',
    avatar_url: 'https://example.com/avatar1.png',
  },
  moderator: {
    id: 'mod_456',
    username: 'community_mod',
    email: 'moderator@test.com',
    role: 'moderator',
    avatar_url: 'https://example.com/mod-avatar.png',
  },
  newUser: {
    id: 'new_789',
    username: 'pokemon_newbie',
    email: 'newbie@test.com',
    created_at: new Date().toISOString(),
    avatar_url: 'https://example.com/default-avatar.png',
  },
  spammer: {
    id: 'spam_000',
    username: 'spam_account',
    email: 'spam@suspicious.com',
    flagged: true,
  },
} as const;

// ============================================================================
// CONTENT GENERATION WITH PROPER TYPES
// ============================================================================

/**
 * Generate a realistic discussion with proper database types
 */
export function generateDiscussion(overrides?: Partial<Discussion>): Omit<Discussion, 'id' | 'created_at' | 'updated_at'> {
  const templates = [
    {
      title: 'Best strategies for completing Bingo challenges quickly',
      content: 'I\'ve been working on improving my Bingo completion times. What are your favorite strategies for efficient square completion? Looking for tips on routing and time management.',
      game: 'Pokemon',
      challenge_type: 'Bingo',
      tags: ['strategy', 'help', 'bingo'],
    },
    {
      title: 'Speedrun techniques for advanced players',
      content: 'Sharing some advanced speedrun techniques I\'ve discovered. These work particularly well for sub-2 hour runs. Would love to hear what techniques others are using.',
      game: 'Sonic',
      challenge_type: 'Speedrun',
      tags: ['speedrun', 'advanced', 'techniques'],
    },
    {
      title: 'Achievement hunting: rare achievements guide',
      content: 'Created a comprehensive guide for the most difficult achievements. These require specific setups and timing. Let me know if you need clarification on any steps.',
      game: 'Mario',
      challenge_type: 'Achievement Hunt',
      tags: ['achievement', 'guide', 'rare'],
    },
    {
      title: 'Community tournament: sign-ups open',
      content: 'We\'re organizing a community tournament for next month. Multiple categories available. Registration closes in two weeks. Looking forward to seeing everyone compete!',
      game: 'Multi-Game',
      challenge_type: 'Tournament',
      tags: ['tournament', 'community', 'competition'],
    },
  ];

  const template = templates[Math.floor(Math.random() * templates.length)];
  
  if (!template) throw new Error('Failed to select discussion template');
  
  return {
    title: template.title,
    content: template.content,
    game: template.game,
    challenge_type: template.challenge_type,
    tags: template.tags,
    author_id: USER_SCENARIOS.regularUser.id,
    upvotes: Math.floor(Math.random() * 25),
    ...overrides,
  };
}

/**
 * Generate a realistic comment with proper database types
 */
export function generateComment(discussion_id: number, overrides?: Partial<Comment>): Omit<Comment, 'id' | 'created_at' | 'updated_at'> {
  const templates = [
    'Great question! I\'ve found that focusing on the easier squares first helps build momentum.',
    'Thanks for sharing this strategy. I tried it yesterday and shaved 10 minutes off my time!',
    'This is exactly what I was looking for. The routing section is particularly helpful.',
    'Have you considered using the duplication glitch for this challenge? It might save time.',
    'Excellent guide! I would add that practice mode is essential before attempting the real run.',
    'This technique works well, but be careful with the timing. It\'s easy to mess up initially.',
    'I disagree with this approach. In my experience, the alternative route is more consistent.',
    'Thanks for the detailed explanation. The screenshots really help visualize the process.',
  ];

  const content = templates[Math.floor(Math.random() * templates.length)];
  
  if (!content) throw new Error('Failed to select comment template');
  
  return {
    content,
    discussion_id,
    author_id: USER_SCENARIOS.regularUser.id,
    upvotes: Math.floor(Math.random() * 15),
    ...overrides,
  };
}

/**
 * Generate a comment thread with nested replies
 */
export function generateCommentThread(
  discussion_id: number,
  replyCount = 3
): { parent: Omit<Comment, 'id' | 'created_at' | 'updated_at'>; replies: Array<Omit<Comment, 'id' | 'created_at' | 'updated_at'>> } {
  const parent = generateComment(discussion_id, {
    content: 'This is a great discussion! I have some thoughts on this topic that might be helpful.',
    author_id: USER_SCENARIOS.regularUser.id,
  });

  const replies = Array.from({ length: replyCount }, (_, i) => 
    generateComment(discussion_id, {
      content: `Reply ${i + 1}: Building on this point, I think we should also consider...`,
      author_id: i % 2 === 0 ? USER_SCENARIOS.newUser.id : USER_SCENARIOS.regularUser.id,
    })
  );

  return { parent, replies };
}

// ============================================================================
// MODERATION TEST CONTENT
// ============================================================================

export const MODERATION_TEST_CONTENT = {
  spam: {
    obvious: {
      title: 'BUY CHEAP GOLD NOW!!! BEST PRICES GUARANTEED!!!',
      content: 'Visit our website at spam-gold-site.com for the cheapest game currency! Use code SPAM50 for 50% off! Limited time offer!!! Click now!!!',
      game: 'All Games',
      tags: ['spam', 'advertisement', 'cheap'],
    },
    subtle: {
      title: 'Great strategy guide (free download)',
      content: 'I created this amazing strategy guide. You can download it from my website. Just search for "advanced gaming strategies" and you\'ll find it. Hope it helps!',
      game: 'Pokemon',
      tags: ['guide', 'free'],
    },
    repetitive: {
      title: 'Check out my stream! Check out my stream!',
      content: 'Hey everyone! Come watch my stream at twitch.tv/mygamingchannel! I\'m live right now! twitch.tv/mygamingchannel! Don\'t miss out! twitch.tv/mygamingchannel!',
      game: 'Sonic',
      tags: ['stream', 'live'],
    },
  },
  
  inappropriate: {
    harassment: {
      title: 'Response to previous discussion',
      content: 'This person is completely wrong and should stop posting. They clearly don\'t understand the game and are wasting everyone\'s time with their stupid questions.',
      game: 'Mario',
      tags: ['response'],
    },
    offensive: {
      title: 'Community guidelines discussion',
      content: 'This content contains inappropriate language and offensive material that would violate community guidelines in a real scenario.',
      game: 'Pokemon',
      tags: ['guidelines'],
    },
    personal: {
      title: 'User behavior concerns',
      content: 'I know where this user lives and I think we should all contact them directly to tell them how wrong they are about this strategy.',
      game: 'Sonic',
      tags: ['behavior'],
    },
  },
  
  copyright: {
    title: 'Amazing strategy guide (full text)',
    content: 'Here is the complete text from the official strategy guide book. I\'m copying it here word for word because I think everyone should have access to this copyrighted material.',
    game: 'Mario',
    tags: ['guide', 'strategy'],
  },
  
  offtopic: {
    title: 'Best pizza places near gaming conventions',
    content: 'I know this isn\'t about gaming challenges, but I wanted to share my favorite pizza places near major gaming conventions. Let me know if you want the full list!',
    game: 'Off-topic',
    tags: ['food', 'conventions'],
  },
} as const;

// ============================================================================
// PERFORMANCE TEST DATA
// ============================================================================

/**
 * Generate large dataset for performance testing
 */
export function generateLargeDiscussionSet(count: number): Array<Omit<Discussion, 'id' | 'created_at' | 'updated_at'>> {
  return Array.from({ length: count }, (_, i) => {
    const games = ['Pokemon', 'Sonic', 'Mario', 'Zelda', 'Metroid'];
    const challengeTypes = ['Bingo', 'Speedrun', 'Achievement Hunt', 'Tournament'];
    const game = games[i % games.length];
    const challengeType = challengeTypes[i % challengeTypes.length];
    
    if (!game || !challengeType) throw new Error('Failed to select game or challenge type');
    
    return generateDiscussion({
      title: `Performance Test Discussion ${i + 1}: ${game} ${challengeType}`,
      content: `This is discussion number ${i + 1} created for performance testing. It contains realistic content length and proper formatting to simulate real user discussions.`,
      game,
      challenge_type: challengeType,
      tags: [`test`, `performance`, game.toLowerCase()],
      upvotes: Math.floor(Math.random() * 50),
    });
  });
}

/**
 * Generate large comment set for pagination testing
 */
export function generateLargeCommentSet(
  discussion_id: number, 
  count: number
): Array<Omit<Comment, 'id' | 'created_at' | 'updated_at'>> {
  return Array.from({ length: count }, (_, i) => {
    const users = Object.values(USER_SCENARIOS);
    const author = users[i % users.length];
    
    if (!author) throw new Error('Failed to select author');
    
    return generateComment(discussion_id, {
      content: `Performance test comment ${i + 1}. This comment has realistic length and content to properly test pagination and scrolling performance. It includes enough text to make the testing meaningful.`,
      author_id: author.id,
      upvotes: Math.floor(Math.random() * 10),
    });
  });
}

// ============================================================================
// SEARCH AND FILTER TEST DATA
// ============================================================================

export const SEARCH_TEST_DATA = {
  discussions: [
    {
      title: 'Shiny hunting tips for competitive players',
      content: 'Advanced shiny hunting strategies including chain methods and probability calculations.',
      game: 'Pokemon',
      challenge_type: 'Achievement Hunt',
      tags: ['shiny', 'hunting', 'competitive'],
    },
    {
      title: 'Speed strategies for any% runs',
      content: 'Comprehensive guide to speed running techniques for completing challenges faster.',
      game: 'Sonic',
      challenge_type: 'Speedrun',
      tags: ['speed', 'any%', 'fast'],
    },
    {
      title: 'Bingo completion optimization guide',
      content: 'Mathematical approach to optimal bingo square completion order and routing.',
      game: 'Mario',
      challenge_type: 'Bingo',
      tags: ['bingo', 'optimization', 'math'],
    },
    {
      title: 'Community tournament results and analysis',
      content: 'Detailed analysis of recent tournament results with statistical breakdowns.',
      game: 'Multi-Game',
      challenge_type: 'Tournament',
      tags: ['tournament', 'results', 'analysis'],
    },
  ],
  
  searchTerms: [
    { term: 'shiny', expectedResults: 1 },
    { term: 'speed', expectedResults: 2 },
    { term: 'bingo', expectedResults: 1 },
    { term: 'tournament', expectedResults: 1 },
    { term: 'optimization', expectedResults: 1 },
    { term: 'nonexistent', expectedResults: 0 },
  ],
  
  filters: [
    { game: 'Pokemon', expectedResults: 1 },
    { game: 'Sonic', expectedResults: 1 },
    { challenge_type: 'Speedrun', expectedResults: 1 },
    { challenge_type: 'Bingo', expectedResults: 1 },
    { game: 'Pokemon', challenge_type: 'Achievement Hunt', expectedResults: 1 },
    { game: 'Sonic', challenge_type: 'Bingo', expectedResults: 0 },
  ],
} as const;

// ============================================================================
// ACCESSIBILITY TEST SCENARIOS
// ============================================================================

export const ACCESSIBILITY_TEST_SCENARIOS = {
  keyboardNavigation: [
    'Tab to navigate between discussions',
    'Enter to open discussion details',
    'Tab to navigate comment form',
    'Enter to submit comment',
    'Escape to close modals',
  ],
  
  screenReader: [
    'Discussion cards have proper heading structure',
    'Comments have author and timestamp information',
    'Form fields have proper labels',
    'Error messages are announced',
    'Success messages are announced',
  ],
  
  colorBlindness: [
    'Upvote states visible without color',
    'Tag categories distinguishable',
    'Error states clearly marked',
    'Focus indicators visible',
  ],
  
  reducedMotion: [
    'Animations can be disabled',
    'Scrolling works without animations',
    'Modal transitions respect preferences',
  ],
} as const;

// ============================================================================
// REAL-TIME TEST SCENARIOS
// ============================================================================

export const REALTIME_TEST_SCENARIOS = {
  commentUpdates: {
    scenario: 'User adds comment, other users see it immediately',
    timeout: 5000,
    expectedElements: ['new comment text', 'updated comment count'],
  },
  
  upvoteUpdates: {
    scenario: 'User upvotes discussion, count updates for all users',
    timeout: 3000,
    expectedElements: ['updated upvote count', 'visual upvote state'],
  },
  
  newDiscussions: {
    scenario: 'New discussion appears in community feed',
    timeout: 10000,
    expectedElements: ['new discussion card', 'updated discussion count'],
  },
  
  moderationUpdates: {
    scenario: 'Content moderation actions update in real-time',
    timeout: 15000,
    expectedElements: ['moderation status', 'content visibility'],
  },
} as const;