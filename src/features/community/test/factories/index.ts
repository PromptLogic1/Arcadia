import type { Tables } from '@/types/database.types';

// Factory counters for unique IDs
let discussionCounter = 1;
let commentCounter = 1;
let userCounter = 1;
let reportCounter = 1;
let notificationCounter = 1;

// Discussion Factory
export const createMockDiscussion = (
  overrides: Partial<Tables<'discussions'>> = {}
): Tables<'discussions'> => {
  const id = discussionCounter++;

  return {
    id,
    title: `Test Discussion ${id}`,
    content: `This is test discussion content for discussion ${id}. It contains enough text to be meaningful for testing purposes.`,
    author_id: `user-${id}`,
    game: 'Pokemon',
    challenge_type: 'Bingo',
    tags: ['test', 'strategy'],
    created_at: new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
    updated_at: new Date().toISOString(),
    upvotes: Math.floor(Math.random() * 50),
    // Note: downvotes, comment_count, is_pinned, is_locked not in current schema
    ...overrides,
  };
};

// Comment Factory
export const createMockComment = (
  overrides: Partial<Tables<'comments'>> = {}
): Tables<'comments'> => {
  const id = commentCounter++;

  return {
    id,
    content: `This is test comment ${id}. It provides valuable insight into the discussion topic.`,
    author_id: `user-${id}`,
    discussion_id: 1,
    created_at: new Date(
      Date.now() - Math.random() * 24 * 60 * 60 * 1000
    ).toISOString(),
    updated_at: new Date().toISOString(),
    upvotes: Math.floor(Math.random() * 20),
    // Note: parent_id, downvotes, is_deleted not in current schema
    ...overrides,
  };
};

// User Profile Factory
export const createMockUser = (
  overrides: Partial<Tables<'users'>> = {}
): Tables<'users'> => {
  const id = `user-${userCounter++}`;

  return {
    id,
    username: `testuser${userCounter}`,
    auth_id: null,
    created_at: new Date(
      Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
    ).toISOString(),
    updated_at: new Date().toISOString(),
    role: 'user',
    bio: null,
    full_name: null,
    avatar_url: null,
    city: null,
    land: null,
    region: null,
    experience_points: Math.floor(Math.random() * 1000),
    last_login_at: null,
    achievements_visibility: 'public',
    profile_visibility: 'public',
    submissions_visibility: 'public',
    // Note: email, reputation, violations, is_banned, banned_until not in current schema
    ...overrides,
  };
};

// Content Report Factory
export const createMockReport = (
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> => {
  const id = `report-${reportCounter++}`;

  return {
    id,
    content_id: '1',
    content_type: 'discussion',
    reporter_id: `user-${reportCounter}`,
    reason: 'spam',
    additional_info: 'This content appears to be promotional spam.',
    status: 'pending',
    created_at: new Date().toISOString(),
    reviewed_at: null,
    reviewed_by: null,
    resolution: null,
    ...overrides,
  };
};

// Notification Factory
export const createMockNotification = (
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> => {
  const id = `notification-${notificationCounter++}`;

  return {
    id,
    type: 'comment_reply',
    recipient_id: `user-${notificationCounter}`,
    actor_id: `user-${notificationCounter + 1}`,
    resource_type: 'comment',
    resource_id: '1',
    title: 'New comment reply',
    body: 'Someone replied to your comment',
    read_at: null,
    created_at: new Date().toISOString(),
    metadata: {},
    ...overrides,
  };
};

// Batch Factories
export const createMockDiscussions = (
  count: number,
  overrides?: Partial<Tables<'discussions'>>
): Tables<'discussions'>[] => {
  return Array.from({ length: count }, () => createMockDiscussion(overrides));
};

export const createMockComments = (
  count: number,
  discussionId?: number,
  overrides?: Partial<Tables<'comments'>>
): Tables<'comments'>[] => {
  return Array.from({ length: count }, () =>
    createMockComment({
      discussion_id: discussionId || 1,
      ...overrides,
    })
  );
};

export const createMockUsers = (
  count: number,
  overrides?: Partial<Tables<'users'>>
): Tables<'users'>[] => {
  return Array.from({ length: count }, () => createMockUser(overrides));
};

// Nested Comment Thread Factory
export const createMockCommentThread = (
  discussionId: number,
  depth = 3,
  childrenPerLevel = 2
): Tables<'comments'>[] => {
  const comments: Tables<'comments'>[] = [];

  const createNestedComments = (
    parentId: number | null,
    currentDepth: number
  ): void => {
    if (currentDepth <= 0) return;

    for (let i = 0; i < childrenPerLevel; i++) {
      const comment = createMockComment({
        discussion_id: discussionId,
        // parent_id not available in current schema
        content: `Nested comment at depth ${depth - currentDepth + 1}, child ${i + 1}`,
      });

      comments.push(comment);

      // Recursively create children
      createNestedComments(comment.id, currentDepth - 1);
    }
  };

  // Start with root comments
  createNestedComments(null, depth);

  return comments;
};

// Factory for specific test scenarios
export const createTestScenario = {
  // Discussion with many comments
  popularDiscussion: () => {
    const discussion = createMockDiscussion({
      title: 'Popular Discussion',
      upvotes: 100,
      // Note: comment_count and is_pinned not in current schema
    });

    const comments = createMockComments(50, discussion.id);

    return { discussion, comments };
  },

  // Controversial discussion
  controversialDiscussion: () => {
    const discussion = createMockDiscussion({
      title: 'Controversial Topic',
      upvotes: 30,
      // Note: downvotes, comment_count not in current schema
    });

    const comments = createMockComments(80, discussion.id);

    return { discussion, comments };
  },

  // Spam content
  spamContent: () => {
    const discussion = createMockDiscussion({
      title: 'BUY NOW!!! CHEAP GOLD HERE!!!',
      content:
        'CLICK HERE FOR AMAZING DEALS!!! FREE MONEY!!! WORK FROM HOME!!!',
      tags: ['spam', 'promotional'],
    });

    return { discussion };
  },

  // Moderated content
  moderatedContent: () => {
    const discussion = createMockDiscussion({
      title: 'Moderated Discussion',
      content: 'This content was flagged and reviewed by moderators.',
    });

    const report = createMockReport({
      content_id: discussion.id.toString(),
      content_type: 'discussion',
      reason: 'inappropriate',
      status: 'resolved',
      reviewed_by: 'moderator-1',
      resolution: 'content_approved',
    });

    return { discussion, report };
  },

  // User with different trust levels
  userTrustLevels: () => {
    const newUser = createMockUser({
      created_at: new Date().toISOString(),
      // Note: reputation, violations not in current schema
    });

    const basicUser = createMockUser({
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      // Note: reputation, violations not in current schema
    });

    const regularUser = createMockUser({
      created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      // Note: reputation, violations not in current schema
    });

    const trustedUser = createMockUser({
      created_at: new Date(
        Date.now() - 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      // Note: reputation, violations not in current schema
    });

    const moderator = createMockUser({
      role: 'moderator',
      // Note: reputation, violations not in current schema
    });

    return {
      newUser,
      basicUser,
      regularUser,
      trustedUser,
      moderator,
    };
  },

  // Complex search scenario
  searchScenario: () => {
    const discussions = [
      createMockDiscussion({
        title: 'Pokemon Red Speedrun Guide',
        content: 'Comprehensive guide for Pokemon Red speedrunning techniques',
        game: 'Pokemon',
        challenge_type: 'Speedrun',
        tags: ['guide', 'speedrun', 'pokemon'],
      }),
      createMockDiscussion({
        title: 'Sonic Any% World Record',
        content: 'Discussion about the latest Sonic speedrun world record',
        game: 'Sonic',
        challenge_type: 'Speedrun',
        tags: ['world-record', 'speedrun', 'sonic'],
      }),
      createMockDiscussion({
        title: 'Pokemon Bingo Strategies',
        content: 'Best strategies for Pokemon Bingo challenges',
        game: 'Pokemon',
        challenge_type: 'Bingo',
        tags: ['strategy', 'bingo', 'pokemon'],
      }),
    ];

    return { discussions };
  },

  // Notification scenarios
  notificationScenario: () => {
    const notifications = [
      createMockNotification({
        type: 'comment_reply',
        title: 'New reply from user123',
        body: 'user123 replied to your comment',
      }),
      createMockNotification({
        type: 'upvote',
        title: 'Your comment was upvoted',
        body: '5 users upvoted your comment',
      }),
      createMockNotification({
        type: 'mention',
        title: 'You were mentioned',
        body: 'user456 mentioned you in a discussion',
      }),
    ];

    return { notifications };
  },
};

// Reset factory counters (useful for tests)
export const resetFactoryCounters = () => {
  discussionCounter = 1;
  commentCounter = 1;
  userCounter = 1;
  reportCounter = 1;
  notificationCounter = 1;
};
