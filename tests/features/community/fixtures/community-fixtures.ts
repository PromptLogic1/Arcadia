import type { Tables } from '../../../../types/database.types';
import type { CommentWithAuthor, DiscussionWithAuthor } from '../types';

// Mock data generation utilities (replaces faker.js)
const mockData = {
  lorem: {
    sentence: (_options?: { min: number; max: number }) => {
      const sentences = [
        'This is a great strategy for completing the challenge.',
        'I found this technique really helpful during my speedrun.',
        'The community here is amazing and very supportive.',
        'Thanks for sharing this detailed guide with everyone.',
        'I never thought about approaching it this way before.',
        'This glitch discovery will change everything for runners.',
        'The frame-perfect timing makes this trick quite difficult.',
        'Community events like this bring everyone together.',
        'Practice and persistence are key to mastering these techniques.',
        'The leaderboards show how competitive this category has become.',
      ];
      return sentences[Math.floor(Math.random() * sentences.length)];
    },
    paragraphs: (options?: { min: number; max: number }) => {
      const count = options
        ? Math.floor(Math.random() * (options.max - options.min + 1)) +
          options.min
        : 2;
      return Array.from({ length: count }, () =>
        mockData.lorem.sentence()
      ).join(' ');
    },
    paragraph: () => mockData.lorem.paragraphs({ min: 2, max: 4 }),
  },
  helpers: {
    arrayElement: <T>(array: readonly T[]): T => {
      if (array.length === 0) throw new Error('Array cannot be empty');
      const result = array[Math.floor(Math.random() * array.length)];
      if (result === undefined) throw new Error('Array element is undefined');
      return result;
    },
    arrayElements: <T>(
      array: readonly T[],
      options?: { min: number; max: number }
    ): T[] => {
      if (array.length === 0) return [];
      const min = options?.min ?? 1;
      const max = options?.max ?? array.length;
      const count = Math.floor(Math.random() * (max - min + 1)) + min;
      const shuffled = [...array].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    },
  },
  number: {
    int: (options?: { min: number; max: number }) => {
      const min = options?.min ?? 0;
      const max = options?.max ?? 100;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
  },
  date: {
    recent: (options?: { days: number }) => {
      const days = options?.days ?? 30;
      const now = new Date();
      const pastTime =
        now.getTime() - days * 24 * 60 * 60 * 1000 * Math.random();
      return new Date(pastTime);
    },
    future: (options?: { days: number }) => {
      const days = options?.days ?? 30;
      const now = new Date();
      const futureTime =
        now.getTime() + days * 24 * 60 * 60 * 1000 * Math.random();
      return new Date(futureTime);
    },
  },
  string: {
    uuid: () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  },
  internet: {
    userName: () => {
      const prefixes = [
        'gamer',
        'speedrunner',
        'player',
        'champion',
        'master',
        'legend',
      ];
      const suffixes = ['123', '456', '789', 'pro', 'xl', 'max'];
      return `${mockData.helpers.arrayElement(prefixes)}${mockData.helpers.arrayElement(suffixes)}`;
    },
  },
  image: {
    avatar: () =>
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
  },
};

// Type aliases for better readability
export type Discussion = Tables<'discussions'>;
export type Comment = Tables<'comments'>;
export type CommunityEvent = Tables<'community_events'>;

// Game and challenge type constants
export const GAMES = [
  'Pokemon',
  'Sonic',
  'Mario',
  'Zelda',
  'Metroid',
  'Kirby',
  'DK Country',
] as const;
export const CHALLENGE_TYPES = [
  'Bingo',
  'Speedrun',
  'Achievement Hunt',
  'Puzzle',
  'Co-op',
] as const;
export const DISCUSSION_TAGS = [
  'strategy',
  'help',
  'tips',
  'speedrun',
  'glitch',
  'guide',
  'tournament',
  'casual',
  'competitive',
  'showcase',
  'question',
] as const;

// User scenarios with permissions
export const USER_SCENARIOS = {
  newUser: {
    reputation: 0,
    joinedDaysAgo: 1,
    permissions: ['read', 'comment'],
    rateLimit: { comments: 5, discussions: 1 },
  },
  regularUser: {
    reputation: 100,
    joinedDaysAgo: 30,
    permissions: ['read', 'comment', 'create_discussion', 'upvote'],
    rateLimit: { comments: 20, discussions: 5 },
  },
  trustedUser: {
    reputation: 500,
    joinedDaysAgo: 180,
    permissions: [
      'read',
      'comment',
      'create_discussion',
      'upvote',
      'edit_own',
      'delete_own',
    ],
    rateLimit: { comments: 50, discussions: 10 },
  },
  moderator: {
    reputation: 1000,
    joinedDaysAgo: 365,
    permissions: [
      'read',
      'comment',
      'create_discussion',
      'upvote',
      'edit_any',
      'delete_any',
      'moderate',
    ],
    rateLimit: { comments: 100, discussions: 20 },
  },
  spammer: {
    reputation: -50,
    joinedDaysAgo: 0,
    permissions: ['read'],
    rateLimit: { comments: 0, discussions: 0 },
  },
} as const;

// Discussion generator
export function generateDiscussion(
  overrides?: Partial<DiscussionWithAuthor>
): Partial<Discussion> {
  const title = mockData.helpers.arrayElement([
    `Best strategies for ${mockData.helpers.arrayElement(GAMES)} speedruns`,
    `Need help with ${mockData.helpers.arrayElement(CHALLENGE_TYPES)} challenge`,
    `${mockData.helpers.arrayElement(GAMES)} glitch discovered!`,
    `Tips for completing ${mockData.helpers.arrayElement(GAMES)} bingo board`,
    `Tournament announcement: ${mockData.helpers.arrayElement(GAMES)} ${mockData.helpers.arrayElement(CHALLENGE_TYPES)}`,
  ]);

  return {
    title,
    content: mockData.lorem.paragraphs({ min: 1, max: 3 }),
    game: mockData.helpers.arrayElement([...GAMES]),
    challenge_type: mockData.helpers.arrayElement([...CHALLENGE_TYPES]),
    tags: mockData.helpers.arrayElements([...DISCUSSION_TAGS], {
      min: 1,
      max: 3,
    }),
    upvotes: mockData.number.int({ min: 0, max: 100 }),
    created_at: mockData.date.recent({ days: 30 }).toISOString(),
    updated_at: mockData.date.recent({ days: 30 }).toISOString(),
    ...overrides,
  };
}

// Comment generator
export function generateComment(
  discussionId: number,
  overrides?: Partial<Tables<'comments'>>
): Partial<Tables<'comments'>> {
  const commentTypes = [
    () => `Great point! I've been using this strategy and it works well.`,
    () =>
      `Have you tried ${mockData.helpers.arrayElement(['using the warp glitch', 'sequence breaking', 'the speedrun route'])}?`,
    () => `Thanks for sharing! This helped me complete the challenge.`,
    () => mockData.lorem.sentence({ min: 10, max: 20 }),
    () =>
      `Here's a video that might help: [link]. The technique at ${mockData.number.int({ min: 1, max: 10 })}:${mockData.number.int({ min: 10, max: 59 })} is key.`,
  ];

  return {
    content: mockData.helpers.arrayElement(commentTypes)(),
    discussion_id: discussionId,
    upvotes: mockData.number.int({ min: 0, max: 50 }),
    created_at: mockData.date.recent({ days: 7 }).toISOString(),
    updated_at: mockData.date.recent({ days: 7 }).toISOString(),
    ...overrides,
  };
}

// Generate comment thread with nested replies
// Using CommentWithAuthor from types.ts which already includes replies

export function generateCommentThread(
  discussionId: number,
  depth = 3,
  childrenPerLevel = 2,
  parentId?: number
): CommentWithAuthor[] {
  if (depth === 0) return [];

  const comments: CommentWithAuthor[] = [];
  const numComments = parentId
    ? childrenPerLevel
    : mockData.number.int({ min: 3, max: 8 });

  for (let i = 0; i < numComments; i++) {
    const comment: CommentWithAuthor = {
      id: mockData.number.int({ min: 1000, max: 9999 }),
      content: generateComment(discussionId).content || 'Test comment content',
      discussion_id: discussionId,
      author_id: mockData.string.uuid(),
      upvotes: mockData.number.int({ min: 0, max: 50 }),
      created_at: mockData.date.recent({ days: 7 }).toISOString(),
      updated_at: mockData.date.recent({ days: 7 }).toISOString(),
      author: {
        id: mockData.string.uuid(),
        username: mockData.internet.userName(),
        avatar_url: mockData.image.avatar(),
      },
      replies: [],
    };

    // Generate nested replies
    if (depth > 1) {
      comment.replies = generateCommentThread(
        discussionId,
        depth - 1,
        childrenPerLevel,
        comment.id
      );
    }

    comments.push(comment);
  }

  return comments;
}

// Generate bulk discussions for testing pagination
export function generateBulkDiscussions(
  count: number,
  overrides?: Partial<Discussion>
): DiscussionWithAuthor[] {
  return Array.from(
    { length: count },
    (_, i) =>
      ({
        id: i + 1,
        ...generateDiscussion(overrides),
        author: {
          id: mockData.string.uuid(),
          username: mockData.internet.userName(),
          avatar_url: mockData.image.avatar(),
        },
        comment_count: mockData.number.int({ min: 0, max: 50 }),
      }) as DiscussionWithAuthor
  );
}

// Moderation test content
export const MODERATION_TEST_CONTENT = {
  spam: {
    patterns: [
      'BUY NOW!!! LIMITED TIME OFFER!!!',
      'Click here for FREE coins: spam.scam/free',
      'CONGRATULATIONS! You are the 1000th visitor!',
      '💰💰💰 MAKE MONEY FAST 💰💰💰',
      'Visit my site: spam1.com spam2.com spam3.com',
    ],
    expectedAction: 'auto_flag' as const,
  },
  inappropriate: {
    patterns: [
      'This contains [INAPPROPRIATE CONTENT]',
      'Offensive language here [CENSORED]',
      'Hate speech example [REMOVED]',
    ],
    expectedAction: 'auto_remove' as const,
  },
  suspicious: {
    patterns: [
      'Contact me on telegram @scammer123',
      'Send payment to wallet: 0x1234567890',
      'Download hack from: sketchy-site.exe',
      'ALL CAPS MESSAGE THAT IS VERY LONG AND ANNOYING',
    ],
    expectedAction: 'require_review' as const,
  },
  safe: {
    patterns: [
      'Great strategy guide! This helped me a lot.',
      'I love this game. The speedrun community is awesome!',
      'Thanks for the tips. Got my first sub-10 minute run!',
    ],
    expectedAction: 'approve' as const,
  },
};

// Event generator for community events
export function generateCommunityEvent(
  overrides?: Partial<CommunityEvent>
): Partial<CommunityEvent> {
  const eventTypes = [
    'Tournament',
    'Speedrun Race',
    'Bingo Marathon',
    'Community Challenge',
    'Achievement Hunt',
  ];

  const startDate = mockData.date.future({ days: 30 });
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + mockData.number.int({ min: 1, max: 7 }));

  return {
    title: `${mockData.helpers.arrayElement(eventTypes)}: ${mockData.helpers.arrayElement([...GAMES])}`,
    description: mockData.lorem.paragraph(),
    game_type: mockData.helpers.arrayElement([
      'Super Mario Odyssey',
      'The Legend of Zelda: Breath of the Wild',
      'Minecraft',
      'Fortnite',
      'Among Us',
    ] as const),
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    max_participants: mockData.number.int({ min: 10, max: 100 }),
    prize_pool: mockData.helpers.arrayElement([
      '$100',
      '$250',
      '$500',
      'Game codes',
      'Merch',
    ]),
    status: 'upcoming' as const,
    created_at: mockData.date.recent({ days: 7 }).toISOString(),
    updated_at: mockData.date.recent({ days: 7 }).toISOString(),
    ...overrides,
  };
}

// Search/filter test scenarios
export interface FilterScenario {
  name: string;
  filters: {
    game?: string | null;
    challengeType?: string | null;
    tags?: string[];
    searchTerm?: string;
    sortBy?: 'newest' | 'oldest' | 'most_upvoted' | 'most_comments';
  };
  expectedResults: {
    minCount: number;
    maxCount?: number;
    mustInclude?: string[];
    mustExclude?: string[];
  };
}

export const FILTER_SCENARIOS: FilterScenario[] = [
  {
    name: 'Filter by Pokemon game',
    filters: { game: 'Pokemon' },
    expectedResults: { minCount: 1, mustInclude: ['Pokemon'] },
  },
  {
    name: 'Filter by Speedrun challenge type',
    filters: { challengeType: 'Speedrun' },
    expectedResults: { minCount: 1, mustInclude: ['Speedrun'] },
  },
  {
    name: 'Search for glitch content',
    filters: { searchTerm: 'glitch' },
    expectedResults: { minCount: 1, mustInclude: ['glitch'] },
  },
  {
    name: 'Combined filters',
    filters: {
      game: 'Sonic',
      challengeType: 'Speedrun',
      tags: ['speedrun', 'guide'],
    },
    expectedResults: {
      minCount: 0,
      mustInclude: ['Sonic', 'Speedrun'],
    },
  },
  {
    name: 'Sort by most upvoted',
    filters: { sortBy: 'most_upvoted' },
    expectedResults: { minCount: 1 },
  },
];

// Rate limiting test configuration
export interface RateLimitTestCase {
  action: 'create_comment' | 'create_discussion' | 'upvote';
  userType: keyof typeof USER_SCENARIOS;
  expectedLimit: number;
  windowSeconds: number;
}

export const RATE_LIMIT_TESTS: RateLimitTestCase[] = [
  {
    action: 'create_comment',
    userType: 'newUser',
    expectedLimit: 5,
    windowSeconds: 3600,
  },
  {
    action: 'create_comment',
    userType: 'regularUser',
    expectedLimit: 20,
    windowSeconds: 3600,
  },
  {
    action: 'create_discussion',
    userType: 'newUser',
    expectedLimit: 1,
    windowSeconds: 86400,
  },
  {
    action: 'upvote',
    userType: 'regularUser',
    expectedLimit: 100,
    windowSeconds: 3600,
  },
  {
    action: 'create_comment',
    userType: 'spammer',
    expectedLimit: 0,
    windowSeconds: 3600,
  },
];
