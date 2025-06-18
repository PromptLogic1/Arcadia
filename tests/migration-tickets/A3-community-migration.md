# Agent A3: Community Feature Test Migration

## Overview
Extract community moderation, search, and interaction logic from E2E tests into unit and integration tests.

## Current E2E Tests to Analyze
- `/tests/features/community/discussions.spec.ts`
- `/tests/features/community/comments.spec.ts`
- `/tests/features/community/moderation.spec.ts`
- `/tests/features/community/search-filter.spec.ts`
- `/tests/features/community/user-interactions.spec.ts`
- `/tests/features/community/social-features.spec.ts`

## Business Logic to Extract

### 1. Content Moderation Rules (Unit Tests)
**From**: `moderation.spec.ts`
**Extract to**: `src/features/community/test/unit/moderation.test.ts`
- Profanity filtering
- Spam detection algorithms
- Auto-moderation rules
- User reputation calculations
- Content flagging logic

### 2. Search and Filtering (Unit Tests)
**From**: `search-filter.spec.ts`
**Extract to**: `src/features/community/test/unit/search.test.ts`
- Search query parsing
- Filter combination logic
- Relevance scoring
- Tag-based filtering
- Date range filtering

### 3. Discussion/Comment Validation (Unit Tests)
**From**: `discussions.spec.ts`, `comments.spec.ts`
**Extract to**: `src/features/community/test/unit/content-validation.test.ts`
- Title length limits
- Content length limits
- Markdown validation
- Link validation
- Media attachment rules

### 4. User Interaction Logic (Unit Tests)
**From**: `user-interactions.spec.ts`
**Extract to**: `src/features/community/test/unit/interactions.test.ts`
- Voting logic (upvote/downvote)
- Reputation calculations
- Badge awarding logic
- Notification triggers
- Following/blocking logic

### 5. Real-time Updates (Integration Tests)
**From**: `social-features.spec.ts`
**Extract to**: `src/features/community/test/integration/realtime.test.ts`
- Live comment updates
- Presence indicators
- Activity feed updates
- Notification delivery

## Test Structure to Create

```
src/features/community/test/
├── unit/
│   ├── moderation.test.ts
│   ├── search.test.ts
│   ├── content-validation.test.ts
│   ├── interactions.test.ts
│   ├── hooks/
│   │   ├── useCommunityFilters.test.ts
│   │   ├── useDiscussions.test.ts
│   │   └── useSearch.test.ts
│   └── utils/
│       ├── moderation-utils.test.ts
│       └── search-utils.test.ts
└── integration/
    ├── discussion-crud.test.ts
    ├── comment-system.test.ts
    ├── realtime.test.ts
    └── notification.test.ts
```

## Implementation Steps

1. **Extract moderation logic**
   - Test profanity filter independently
   - Test spam detection algorithms
   - Test auto-mod decision trees
2. **Extract search logic**
   - Test query parsing
   - Test filter combinations
   - Test relevance scoring
3. **Extract validation rules**
   - Test all content constraints
   - Test markdown parsing
   - Test link validation
4. **Extract interaction logic**
   - Test vote calculations
   - Test reputation updates
   - Test notification triggers
5. **Update E2E tests**
   - Keep user journey tests
   - Remove algorithm testing
   - Focus on UI interactions

## E2E Tests to Keep (Simplified)
- Create and view discussion
- Post and reply to comments
- Search and filter content
- Report inappropriate content
- Follow user and see updates

## Success Criteria
- Moderation logic fully unit tested
- Search algorithms tested in isolation
- Interaction logic has predictable outcomes
- E2E tests reduced by 65% in size
- Real-time features tested at integration level

## Priority: MEDIUM
Important for user engagement but not critical path.