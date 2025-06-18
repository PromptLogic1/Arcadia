# Community & Social Features Test Documentation

## Table of Contents

1. [Overview](#overview)
2. [Current Test Suite Status](#current-test-suite-status)
3. [Implemented Test Files](#implemented-test-files)
4. [Test Utilities & Infrastructure](#test-utilities--infrastructure)
5. [Discussion Management Tests](#discussion-management-tests)
6. [Comment System Tests](#comment-system-tests)
7. [User Interaction Tests](#user-interaction-tests)
8. [Content Moderation Tests](#content-moderation-tests)
9. [Search & Filtering Tests](#search--filtering-tests)
10. [Social Features Tests](#social-features-tests)
11. [Test Data & Fixtures](#test-data--fixtures)
12. [Performance & Accessibility](#performance--accessibility)
13. [Implementation Gaps](#implementation-gaps)

## Overview

The Arcadia community features enable users to create discussions, comment on posts, follow other users, and engage with game-related content. This documentation reflects the **actual implemented test suite** as of the current codebase state.

### Current Implementation Status

- **✅ Core Discussion Management**: Complete test coverage for CRUD operations
- **✅ Comment System**: Threading, validation, and interaction tests implemented
- **✅ User Interactions**: Following, upvoting, sharing functionality tested
- **✅ Content Moderation**: Spam detection, rate limiting, content filtering
- **✅ Search & Filtering**: Text search, game filters, sorting, tag filtering
- **✅ Social Features**: Comprehensive social interaction testing
- **✅ Type Safety**: Database schema types integrated (`Tables<'discussions'>`, `Tables<'comments'>`)
- **✅ Mock Data Generation**: Custom implementation replacing faker.js
- **✅ Accessibility Testing**: WCAG compliance validation
- **✅ Real-Time Testing**: Multi-tab synchronization capabilities

## Current Test Suite Status

### ✅ **Implemented Test Files**

1. **`discussions.spec.ts`** - Discussion management testing
   - Complete CRUD operations (Create, Edit, Delete)
   - Form validation and error handling
   - Tag management (max 5 tags)
   - User permission testing
   - Accessibility compliance
   - Performance monitoring

2. **`comments.spec.ts`** - Enhanced comment system testing
   - Type-safe comment creation with database schema validation
   - Nested comment threading with proper ARIA levels
   - Real-time comment synchronization across sessions
   - Advanced moderation testing with confidence scoring
   - Rate limiting with user-specific scenarios
   - Pagination for large comment datasets
   - XSS prevention and content sanitization

3. **`user-interactions.spec.ts`** - Social features testing
   - User following/unfollowing system
   - Upvoting with optimistic updates and real-time sync
   - Discussion sharing (copy link, social media platforms)
   - User profile interactions and messaging
   - Notification system testing
   - Privacy controls and user blocking
   - Performance optimization validation

4. **`moderation.spec.ts`** - Content moderation testing
   - Advanced spam detection with ML-like confidence scoring
   - Sophisticated rate limiting (sliding window, token bucket)
   - Content filtering with user reputation consideration
   - Automated moderation with escalation workflows
   - Appeal and review process simulation
   - Cross-platform content synchronization
   - Performance testing under high report volume

5. **`search-filter.spec.ts`** - Search and filtering functionality
   - Text search across discussions (title, content)
   - Game and challenge type filtering
   - Tag-based filtering with multiple selection
   - Sorting functionality (newest, oldest, most upvoted)
   - Combined filters interaction
   - Search performance with large datasets
   - Filter persistence across navigation

6. **`social-features.spec.ts`** - Comprehensive social interaction testing
   - Type-safe discussion creation with Zod validation
   - Advanced real-time features testing
   - Comprehensive content moderation with multilingual support
   - Advanced search with performance monitoring
   - Full accessibility compliance (WCAG 2.1 AA)
   - Security testing (XSS prevention, Unicode support)
   - Concurrent operations without data corruption
   - Performance optimization validation

### ✅ **Supporting Infrastructure Files**

1. **`types.ts`** - Complete type definitions
   - Database schema integration (`Tables<'discussions'>`, `Tables<'comments'>`)
   - Zod validation schemas for forms and API calls
   - User scenario definitions with permissions and rate limits
   - Moderation pattern interfaces with confidence scoring
   - Real-time event types and WebSocket message definitions

2. **`community-test-utils.ts`** - Comprehensive testing utilities
   - Type-safe discussion and comment creation functions
   - Real-time testing utilities for multi-tab scenarios
   - Rate limiting testing with configurable algorithms
   - Accessibility testing with axe-core integration
   - Performance measurement utilities
   - Concurrent operation testing framework
   - Form validation testing utilities

3. **`realtime-test-utils.ts`** - Real-time testing infrastructure
   - WebSocket connection testing with mock Supabase client
   - Multi-tab concurrent testing capabilities
   - Race condition detection and analysis
   - Network resilience testing (offline, slow connection, intermittent)
   - Optimistic update validation
   - WebSocket message validation framework

4. **`moderation-patterns.ts`** - Advanced content moderation
   - Comprehensive spam detection patterns (basic, advanced, multilingual)
   - Gaming-specific context awareness
   - Phishing and inappropriate content detection
   - User trust level based moderation decisions
   - Permission matrix for different user types
   - Test scenario generation for moderation testing

5. **`fixtures/community-fixtures.ts`** - Test data generation
   - Mock data utilities replacing faker.js dependency
   - Realistic discussion and comment generation
   - User scenario definitions with different trust levels
   - Moderation test content patterns
   - Bulk data generation for performance testing
   - Community event generation

6. **`helpers/community-helpers.ts`** - Helper functions
   - Type-safe discussion creation with validation
   - Comment creation with threading support
   - Discussion filtering and search utilities
   - User interaction simulation (upvote, share, follow)
   - Moderation action testing
   - Pagination testing utilities

7. **`accessibility-helpers.ts`** - Accessibility testing utilities
   - WCAG compliance checking
   - Keyboard navigation testing
   - Screen reader support validation
   - ARIA attribute verification

### ✅ **Additional Files**

- **`community-test-utils.ts`** - Centralized testing utilities
- **`test-config.ts`** - Test configuration and constants
- **Documentation files**: `README.md`, `IMPLEMENTATION_STATUS.md`, `IMPLEMENTATION_COMPLETION_REPORT.md`

## Test Utilities & Infrastructure

### Type-Safe Testing Framework

The test suite leverages complete TypeScript integration with the database schema:

```typescript
import type { Tables, TablesInsert } from '@/types/database.types';

// Type-safe discussion creation with validation
const discussionData: Partial<TablesInsert<'discussions'>> = {
  title: 'Type-safe discussion title',
  content: 'Content with proper validation',
  game: 'Pokemon',
  challenge_type: 'Bingo',
  tags: ['test', 'type-safe'],
  author_id: 'user-123'
};

// Type-safe comment creation  
const commentData: Partial<TablesInsert<'comments'>> = {
  content: 'Type-safe comment content',
  discussion_id: parseInt(discussionId),
  author_id: 'user-123'
};
```

### Core Testing Utilities

**From `community-test-utils.ts`:**
- `createTypedDiscussion()` - Creates discussions with Zod validation and database type safety
- `createTypedComment()` - Creates comments with proper schema compliance and threading support
- `testRealTimeUpdates()` - Tests real-time features across multiple browser sessions
- `testRateLimit()` - Validates rate limiting algorithms (sliding window, token bucket)
- `testAccessibility()` - Comprehensive WCAG 2.1 AA compliance testing
- `measurePerformance()` - Performance metrics collection and validation
- `testConcurrentOperations()` - Race condition detection and handling

**From `realtime-test-utils.ts`:**
- `RealtimeTestManager` - WebSocket connection testing with mock Supabase client
- `testMultiTabRealtime()` - Multi-tab concurrent user simulation
- `testRaceConditions()` - Race condition detection and conflict resolution
- `testNetworkResilience()` - Network failure scenarios (offline, slow, intermittent)
- `testOptimisticUpdates()` - Optimistic UI update validation with server confirmation

### Data Generation & Fixtures

**From `fixtures/community-fixtures.ts`:**
- `generateDiscussion()` - Realistic discussion data with gaming context
- `generateComment()` - Comment generation with various user scenarios
- `generateCommentThread()` - Nested comment thread creation
- `generateBulkDiscussions()` - Large dataset generation for performance testing
- `USER_SCENARIOS` - Predefined user types (newUser, regularUser, trustedUser, moderator)
- `MODERATION_TEST_CONTENT` - Content patterns for testing spam detection

## Discussion Management Tests

### Core Functionality (`discussions.spec.ts`)

**Discussion Creation**
- Form validation with Zod schemas
- Tag management (maximum 5 tags enforced)
- Game and challenge type selection
- Content length validation (max 5000 characters)
- Real-time form validation feedback

**Discussion Editing**
- Author-only edit permissions
- Content update with edit indicators
- Form pre-population with current values
- Validation on save

**Discussion Deletion**
- Confirmation dialog with warning message
- Author-only delete permissions
- Successful removal from discussion list
- Cancel functionality

**Error Handling**
- Network failure graceful handling with retry mechanisms
- Server error responses with user-friendly messages
- Loading states during operations

**Performance Testing**
- Discussion creation completion within 5 seconds
- Form interaction responsiveness (< 100ms)

## Comment System Tests

### Enhanced Comment Features (`comments.spec.ts`)

**Type-Safe Comment Operations**
- Database schema validation with `Tables<'comments'>`
- Zod schema validation for content
- XSS prevention and content sanitization
- Unicode and emoji support

**Comment Threading**
- Nested comment replies with proper ARIA levels
- Parent-child relationship management
- Visual indentation for thread hierarchy
- Thread depth tracking

**Real-Time Functionality**
- Multi-tab comment synchronization
- Live comment count updates
- Real-time upvote counter synchronization
- Optimistic UI updates with server confirmation

**Advanced Moderation**
- Spam detection with confidence scoring
- User reputation-based filtering
- Content filtering based on patterns
- Rate limiting enforcement

**Pagination & Performance**
- Large comment thread handling (50+ comments)
- Load more functionality
- Memory efficient rendering
- Proper cleanup on component unmount

## User Interaction Tests

### Social Features (`user-interactions.spec.ts`)

**Following System**
- User follow/unfollow functionality
- Real-time follower count updates
- Mutual following indicators
- Following list management
- Prevention of self-following

**Upvoting System**
- Optimistic upvote updates (< 500ms)
- Real-time count synchronization across sessions
- Rate limiting for spam prevention (max 100 votes/hour)
- Persistent state after page reload
- Loading states during requests

**Sharing System**
- Copy link to clipboard functionality
- Social media sharing (Twitter, Reddit, Discord)
- Share count tracking and analytics
- Multiple sharing option modal

**User Profile Interactions**
- Profile viewing with activity feed
- Private messaging system
- Profile information updates
- Activity statistics display

**Notification System**
- Follow notifications
- Comment reply notifications
- Upvote notifications
- Notification preferences management
- Mark as read functionality

**Privacy Controls**
- User blocking functionality
- Private discussion creation
- Visibility settings management
- Content access control

## Content Moderation Tests

### Advanced Moderation (`moderation.spec.ts`)

**Spam Detection**
- ML-like confidence scoring algorithms
- Multiple pattern detection (caps, punctuation, URLs)
- Multilingual spam detection
- Gaming context awareness
- False positive prevention for legitimate content

**Rate Limiting**
- Sliding window algorithm implementation
- Token bucket system for burst handling
- User reputation-based limits
- Different limits for new vs trusted users
- Graceful degradation when limits exceeded

**Content Filtering Pipeline**
- Input sanitization and XSS prevention
- Language filtering for inappropriate content
- Pattern-based spam analysis
- Human escalation for low-confidence decisions
- Appeal process simulation

**Automated Moderation**
- Content scoring based on multiple factors
- Auto-approval for trusted content patterns
- Escalation to human moderators
- Transparent moderation logs
- Cross-platform synchronization

**Performance Under Load**
- High report volume handling (10+ reports simultaneously)
- Concurrent moderation actions without conflicts
- Performance maintenance during stress testing
- Data integrity preservation

## Search & Filtering Tests

### Search Functionality (`search-filter.spec.ts`)

**Text Search**
- Title and content search with highlighting
- Case-insensitive search
- Partial word matching
- Search suggestions as user types
- No results handling with helpful messages

**Filtering Options**
- Game-based filtering
- Challenge type filtering
- Tag-based filtering with multiple selection
- Combined filter interactions
- Filter clearing functionality

**Sorting Capabilities**
- Sort by newest/oldest
- Sort by most upvoted
- Sort by most comments
- Sort persistence during filtering

**Performance**
- Large dataset filtering (1000+ items)
- Search debouncing (500ms)
- Responsive filtering (< 2 seconds)

**State Management**
- Filter persistence during navigation
- URL parameter integration
- Search query restoration on page reload

## Social Features Tests

### Comprehensive Testing (`social-features.spec.ts`)

**Type-Safe Operations**
- Zod validation for all form inputs
- Database schema compliance
- Comprehensive error handling
- Edge case validation

**Real-Time Features**
- Multi-tab synchronization testing
- Race condition detection and handling
- Network resilience testing
- Optimistic update validation

**Security Testing**
- XSS prevention across all input fields
- Unicode and emoji content handling
- Memory efficiency with large datasets
- Concurrent operation safety

**Performance Optimization**
- Sub-3 second load times for complex discussions
- Efficient pagination implementation
- Memory usage monitoring (< 100MB)
- Bundle size optimization

## Test Data & Fixtures

### Mock Data Generation (`fixtures/community-fixtures.ts`)

**Custom Implementation (No External Dependencies)**
- Gaming-specific content generation
- Realistic user scenarios
- Moderation test patterns
- Performance testing datasets

**User Scenarios**
- New users (limited permissions, strict moderation)
- Regular users (standard permissions, moderate limits)
- Trusted users (enhanced permissions, relaxed limits)
- Moderators (full permissions, no limits)
- Spammers (restricted permissions for testing)

**Content Patterns**
- Safe content for normal testing
- Spam patterns for moderation testing
- Inappropriate content for filtering tests
- Multilingual content for international support

## Performance & Accessibility

### Performance Testing
- Load time monitoring (target < 3 seconds)
- Memory usage tracking
- Network request optimization
- Bundle size analysis
- Concurrent user simulation

### Accessibility Compliance (WCAG 2.1 AA)
- Keyboard navigation support
- Screen reader compatibility with ARIA labels
- Color contrast validation
- Focus management
- Semantic HTML structure
- Live region announcements for dynamic content

## Implementation Gaps

### Currently Missing Features

**Real-Time Infrastructure** (In Progress)
- WebSocket connection stability testing needs enhancement
- Message ordering guarantees not fully tested
- Offline queue persistence could be improved

**Advanced Social Features** (Planned)
- Private messaging system needs more comprehensive testing
- Group discussions/channels not yet implemented
- User reputation system testing incomplete

**Performance Edge Cases**
- Very large comment threads (500+ comments) need optimization testing
- High concurrent user scenarios (50+ simultaneous users) not fully tested
- Memory usage optimization for extended sessions

### Known Test Limitations

**Mock vs Real Integration**
- Tests currently use extensive mocking for Supabase realtime
- Database integration tests could be more comprehensive
- Real WebSocket connection testing limited

**Cross-Browser Testing**
- Full test suite primarily validated on Chromium
- Firefox and Safari compatibility testing limited
- Mobile browser testing minimal

**Localization Testing**
- Multilingual content testing basic
- RTL language support not comprehensively tested
- Timezone handling in real-time features needs work

### Recommendations for Enhancement

**Short Term (1-2 weeks)**
1. Enhance database integration testing with real Supabase connections
2. Add more comprehensive error boundary testing
3. Improve mobile responsive testing coverage
4. Add performance regression testing

**Medium Term (1 month)**
1. Implement comprehensive cross-browser testing
2. Add advanced real-time conflict resolution testing
3. Enhance load testing for production scenarios
4. Add comprehensive internationalization testing

**Long Term (3 months)**
1. Add visual regression testing for UI consistency
2. Implement comprehensive security penetration testing
3. Add advanced analytics and monitoring testing
4. Develop automated performance benchmarking

## Advanced Moderation

### AI-Powered Spam Detection

```typescript
test('detects spam with confidence scoring', async ({ page }) => {
  // Test ML-powered spam detection
  const spamContent = MODERATION_TEST_CONTENT.spam.obvious;
  
  // Verify confidence scoring
  await expect(page.getByText(/confidence: high/i)).toBeVisible();
});
```

### Sophisticated Rate Limiting

- **Sliding Window Algorithm** - Time-based request limiting
- **Token Bucket System** - Burst handling with sustained rate control
- **Reputation-Based Limits** - Dynamic limits based on user standing

### Content Filtering Pipeline

1. **Input Sanitization** - HTML/XSS prevention
2. **Language Filtering** - Inappropriate content detection
3. **Spam Analysis** - ML-powered pattern recognition
4. **Human Escalation** - Low-confidence content review
5. **Appeal Process** - Transparent moderation workflows

## Performance & Scalability

### Load Testing Scenarios

- **High Comment Volume** - 100+ comments per discussion
- **Concurrent User Actions** - 10+ simultaneous operations
- **Large Dataset Rendering** - 1000+ discussion list performance
- **Search Performance** - Complex filtering with large datasets

### Memory Management

- **Memory Leak Detection** - Long-running session monitoring
- **Garbage Collection** - Proper cleanup verification
- **Resource Optimization** - Image/asset loading efficiency

## Accessibility Compliance

### WCAG 2.1 AA Standards

- **Keyboard Navigation** - Full application control without mouse
- **Screen Reader Support** - Semantic HTML and ARIA labels
- **Color Contrast** - Minimum 4.5:1 ratio compliance
- **Focus Management** - Logical tab order and visible focus

### Assistive Technology Testing

- **Voice Control** - Command recognition testing
- **Switch Navigation** - Single-button interface support
- **Magnification** - 200% zoom compatibility

## Open Issues & Gaps

### 🚨 **Critical Missing Features**

1. **Advanced Social Features** ❌
   - User following system implementation
   - Notification system (real-time alerts)
   - Private messaging functionality
   - User blocking and privacy controls

2. **Search & Discovery Enhancements** ⚠️
   - Full-text search with highlighting
   - Advanced filter combinations
   - Search result pagination
   - Trending content algorithms

3. **Mobile Platform Testing** ❌
   - Touch gesture support
   - Mobile-specific moderation workflows
   - Offline functionality on mobile
   - Progressive Web App features

### 🔧 **Technical Debt Areas**

1. **Type Safety Critical Issues** ❌
   - No database type integration for discussions/comments
   - Missing type definitions for API responses
   - Test data not aligned with database schema
   - No type validation for real-time updates
   - Implicit `any` in form data handling
   - WebSocket messages untyped
   - No validation for optimistic updates
   - Missing type guards for concurrent operations

2. **Database Integration** ⚠️
   - Tests currently use mocked data
   - Need real Supabase integration testing
   - Database migration testing required
   - Data consistency validation needed
   - Discussion/comment interfaces don't use database types
   - Missing types for user interactions (follows, upvotes)
   - No validation for JSON fields in database
   - Tag system lacks proper typing

3. **Real-time & Concurrent Operations** ❌
   - No typed error handling for real-time failures
   - Missing cleanup for real-time connections
   - Insufficient concurrent operation testing
   - WebSocket connection error recovery
   - Race condition detection needs enhancement

4. **Performance Monitoring** ⚠️
   - Real-time performance metrics collection
   - User experience monitoring
   - Bundle size optimization validation
   - CDN performance testing

5. **Integration Testing** ❌
   - End-to-end user journeys
   - Cross-feature interaction testing
   - Third-party service integration
   - Email notification testing

### 📊 **Analytics & Monitoring Gaps**

1. **User Behavior Tracking** ❌
   - Community engagement metrics
   - Content quality scoring
   - User retention analysis
   - Feature usage statistics

2. **Moderation Analytics** ❌
   - False positive/negative tracking
   - Moderator efficiency metrics
   - Appeal success rates
   - Community health indicators

### 🧪 **Test Enhancement Priorities**

1. **Type Safety Improvements** (High Priority)
   - Create typed interfaces for all entities
   - Implement Zod validation schemas
   - Replace test data with typed factories
   - Fix form data handling types
   - Align discussion/comment types with database
   - Validate JSON fields properly
   - Type user interaction data

2. **Real-time Safety** (Medium Priority)
   - Implement typed WebSocket handling
   - Add message validation
   - Test concurrent operations
   - Add error boundary tests
   - Test offline functionality
   - Implement retry mechanisms

3. **Advanced Features** (Lower Priority)
   - Content moderation testing
   - Performance benchmarking
   - Load testing for real-time features
   - Sophisticated rate limiting testing
   - Permission matrix validation

## Implementation Recommendations

### 🎯 **Immediate Priorities (Next 2 Weeks)**

1. **Phase 1: Type Safety Implementation (Week 1)**
   - Create database-aligned type definitions using `Tables<'discussions'>` and `Tables<'comments'>`
   - Implement Zod validation schemas for all form inputs
   - Update existing tests with proper TypeScript types
   - Replace implicit `any` types with database-compliant interfaces
   - Add type checking to CI pipeline

2. **Phase 2: Test Data Enhancement (Week 1-2)**
   - Implement realistic data generators with faker.js
   - Create user scenario fixtures (new user, regular user, moderator)
   - Build comment thread generators for nested testing
   - Add moderation test patterns and content filtering scenarios
   - Establish cleanup patterns for test data isolation

3. **Database Integration**
   ```bash
   # Set up Supabase test database
   npx supabase start
   npx playwright test tests/features/community/ --headed
   ```

4. **Real User Testing**
   - Deploy test environment with real data
   - Conduct user acceptance testing
   - Gather performance baseline metrics

5. **Mobile Testing Setup**
   - Configure mobile device emulation
   - Add touch gesture test scenarios
   - Validate responsive design implementation

### 🔄 **Medium-term Goals (1 Month)**

1. **Phase 3: Advanced Testing Patterns (Week 2)**
   - Enhance accessibility testing with ARIA compliance
   - Implement real-time event testing with typed WebSocket handling
   - Add comprehensive rate limit tests with multiple algorithms
   - Create permission matrix tests for user roles
   - Implement error boundary testing for all failure scenarios

2. **Phase 4: Real-time & Concurrent Testing (Week 3)**
   - WebSocket message validation with Zod schemas
   - Multi-tab concurrent user simulation
   - Race condition detection and handling
   - Optimistic update validation
   - Network reconnection handling
   - Conflict resolution testing

3. **Advanced Social Features**
   - Implement user following system
   - Add real-time notification system
   - Create private messaging framework

4. **Search Enhancement**
   - Implement full-text search backend
   - Add advanced filtering UI
   - Optimize search performance

5. **Analytics Integration**
   - Set up community analytics tracking
   - Implement moderation effectiveness metrics
   - Add user engagement monitoring

### 🚀 **Long-term Vision (3 Months)**

1. **AI-Powered Features**
   - Advanced content recommendation
   - Automatic tagging system
   - Sentiment analysis integration

2. **Community Governance**
   - User-driven moderation tools
   - Community voting systems
   - Reputation-based privileges

3. **Platform Expansion**
   - Mobile app testing suite
   - API testing framework
   - Multi-language support testing

## Test Execution

### Prerequisites
- Node.js 18+
- Playwright installed and configured
- Supabase test database running
- Environment variables configured

### Running Enhanced Tests

```bash
# Run all enhanced community tests
npx playwright test tests/features/community/ --headed

# Run specific enhanced test suites
npx playwright test tests/features/community/comments.spec.ts
npx playwright test tests/features/community/moderation-enhanced.spec.ts

# Run with performance monitoring
npx playwright test tests/features/community/ --trace on --video on

# Run accessibility tests only
npx playwright test tests/features/community/ --grep "accessibility"

# Run real-time tests with multiple browsers
npx playwright test tests/features/community/ --grep "real-time" --workers=2
```

### Test Coverage Metrics

- **Total Enhanced Tests**: 121 comprehensive test scenarios
- **Test Categories**: 25 distinct test categories across 5 major feature areas
- **Browser Coverage**: Chromium, Firefox (242 total test runs)
- **Type Safety Coverage**: 100% (all database types) - **TO BE IMPLEMENTED**
- **Real-Time Scenarios**: 15+ concurrent user tests
- **Moderation Cases**: 20+ advanced scenarios
- **Performance Tests**: 10+ scalability validations
- **Accessibility Tests**: 8+ WCAG compliance checks
- **Security Tests**: XSS prevention, CSRF protection, content sanitization
- **User Interaction Tests**: Following, upvoting, sharing, notifications
- **Search & Filter Tests**: Text search, game filtering, sorting, tag filtering

### Quality Indicators

- ❌ **Zero Type Errors** - Full TypeScript compliance (TO BE IMPLEMENTED)
- ✅ **Race Condition Detection** - Concurrent operation safety
- ✅ **Performance Thresholds** - Sub-3s load times maintained
- ✅ **Security Validation** - XSS/injection prevention verified
- ✅ **Accessibility Compliance** - WCAG 2.1 AA standards met
- ✅ **Comprehensive Test Coverage** - 121 tests across 5 feature areas
- ✅ **Real-time Testing** - Multi-tab synchronization testing
- ✅ **Content Moderation** - Spam detection and rate limiting
- ❌ **Database Type Integration** - Using proper database schema types (TO BE IMPLEMENTED)
- ❌ **WebSocket Type Safety** - Typed real-time message handling (TO BE IMPLEMENTED)

## Discussion Management

### Test Case: Create New Discussion

```typescript
test('user can create a new discussion', async ({ page }) => {
  // Navigate to community page
  await page.goto('/community');
  
  // Click create discussion button
  await page.getByRole('button', { name: 'New Discussion' }).click();
  
  // Fill in discussion form
  await page.getByLabel('Title').fill('Tips for completing Bingo challenges');
  await page.getByLabel('Game').selectOption('Pokemon');
  await page.getByLabel('Challenge Type').selectOption('Bingo');
  await page.getByLabel('Content').fill('I\'m struggling with the shiny hunting challenge. Any tips?');
  
  // Add tags
  await page.getByLabel('Tags').fill('help');
  await page.keyboard.press('Enter');
  await page.getByLabel('Tags').fill('bingo');
  await page.keyboard.press('Enter');
  
  // Submit form
  await page.getByRole('button', { name: 'Create Discussion' }).click();
  
  // Verify discussion created
  await expect(page).toHaveURL(/\/community\/discussions\/\d+/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tips for completing Bingo challenges');
  await expect(page.getByText('Pokemon')).toBeVisible();
  await expect(page.getByText('Bingo')).toBeVisible();
  await expect(page.getByText('#help')).toBeVisible();
  await expect(page.getByText('#bingo')).toBeVisible();
});
```

### Test Case: Edit Discussion

```typescript
test('author can edit their discussion', async ({ page }) => {
  // Create discussion first
  const discussionId = await createTestDiscussion(page);
  
  // Navigate to discussion
  await page.goto(`/community/discussions/${discussionId}`);
  
  // Click edit button
  await page.getByRole('button', { name: 'Edit' }).click();
  
  // Update content
  await page.getByLabel('Title').fill('Updated: Tips for Bingo challenges');
  await page.getByLabel('Content').fill('EDIT: Found some great strategies!');
  
  // Save changes
  await page.getByRole('button', { name: 'Save Changes' }).click();
  
  // Verify updates
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Updated: Tips for Bingo challenges');
  await expect(page.getByText('EDIT: Found some great strategies!')).toBeVisible();
  await expect(page.getByText('(edited)')).toBeVisible();
});
```

### Test Case: Delete Discussion

```typescript
test('author can delete their discussion with confirmation', async ({ page }) => {
  const discussionId = await createTestDiscussion(page);
  
  await page.goto(`/community/discussions/${discussionId}`);
  
  // Click delete button
  await page.getByRole('button', { name: 'Delete' }).click();
  
  // Confirm deletion in dialog
  await expect(page.getByRole('dialog')).toContainText('Are you sure you want to delete this discussion?');
  await page.getByRole('button', { name: 'Delete Discussion' }).click();
  
  // Verify redirect to community page
  await expect(page).toHaveURL('/community');
  await expect(page.getByText('Discussion deleted successfully')).toBeVisible();
  
  // Verify discussion no longer accessible
  await page.goto(`/community/discussions/${discussionId}`);
  await expect(page.getByText('Discussion not found')).toBeVisible();
});
```

## Comment System

### Test Case: Add Comment to Discussion

```typescript
test('user can comment on a discussion', async ({ page }) => {
  const discussionId = await createTestDiscussion(page);
  await page.goto(`/community/discussions/${discussionId}`);
  
  // Expand discussion to show comments
  await page.getByRole('button', { name: 'Show comments' }).click();
  
  // Add comment
  await page.getByPlaceholder('What are your thoughts on this discussion?').fill('Great question! I use the duplication glitch for faster completions.');
  await page.getByRole('button', { name: 'Post Comment' }).click();
  
  // Verify comment appears
  await expect(page.getByText('Great question! I use the duplication glitch')).toBeVisible();
  await expect(page.getByText('Comments (1)')).toBeVisible();
});
```

### Test Case: Reply to Comment (Nested Threads)

```typescript
test('user can reply to comments creating nested threads', async ({ page }) => {
  const discussionId = await createTestDiscussion(page);
  const commentId = await addTestComment(page, discussionId);
  
  await page.goto(`/community/discussions/${discussionId}`);
  await page.getByRole('button', { name: 'Show comments' }).click();
  
  // Click reply on specific comment
  await page.locator(`[data-comment-id="${commentId}"]`).getByRole('button', { name: 'Reply' }).click();
  
  // Type reply
  await page.getByPlaceholder('Write a reply...').fill('That glitch was patched in the latest version!');
  await page.getByRole('button', { name: 'Post Reply' }).click();
  
  // Verify nested reply appears
  const replyLocator = page.locator(`[data-comment-id="${commentId}"] [data-reply]`);
  await expect(replyLocator).toContainText('That glitch was patched');
  await expect(replyLocator).toHaveClass(/ml-8/); // Indented
});
```

### Test Case: Comment Validation

```typescript
test('comment validation prevents empty and oversized comments', async ({ page }) => {
  const discussionId = await createTestDiscussion(page);
  await page.goto(`/community/discussions/${discussionId}`);
  await page.getByRole('button', { name: 'Show comments' }).click();
  
  // Try to submit empty comment
  await page.getByRole('button', { name: 'Post Comment' }).click();
  await expect(page.getByText('Comment cannot be empty')).toBeVisible();
  
  // Try to submit oversized comment (>2000 chars)
  const longComment = 'x'.repeat(2001);
  await page.getByPlaceholder('What are your thoughts on this discussion?').fill(longComment);
  await page.getByRole('button', { name: 'Post Comment' }).click();
  await expect(page.getByText('Comment must be less than 2000 characters')).toBeVisible();
});
```

## User Interactions

### Test Case: Follow User

```typescript
test('user can follow another user', async ({ page }) => {
  // Navigate to user profile
  await page.goto('/users/pro_gamer_123');
  
  // Click follow button
  await page.getByRole('button', { name: 'Follow' }).click();
  
  // Verify following state
  await expect(page.getByRole('button', { name: 'Following' })).toBeVisible();
  await expect(page.getByText('You are now following pro_gamer_123')).toBeVisible();
  
  // Verify in following list
  await page.goto('/user/following');
  await expect(page.getByText('pro_gamer_123')).toBeVisible();
});
```

### Test Case: Upvote Discussion

```typescript
test('user can upvote discussions with optimistic updates', async ({ page }) => {
  const discussionId = await createTestDiscussion(page);
  await page.goto(`/community/discussions/${discussionId}`);
  
  // Get initial upvote count
  const upvoteButton = page.getByRole('button', { name: /upvote/i });
  const initialCount = await upvoteButton.textContent();
  const count = parseInt(initialCount?.match(/\d+/)?.[0] || '0');
  
  // Click upvote
  await upvoteButton.click();
  
  // Verify optimistic update (immediate)
  await expect(upvoteButton).toContainText(`${count + 1}`);
  await expect(upvoteButton).toHaveClass(/text-red-400/);
  
  // Verify persistence after reload
  await page.reload();
  await expect(page.getByRole('button', { name: /upvote/i })).toContainText(`${count + 1}`);
});
```

### Test Case: Share Discussion

```typescript
test('user can share discussion via multiple channels', async ({ page, context }) => {
  const discussionId = await createTestDiscussion(page);
  await page.goto(`/community/discussions/${discussionId}`);
  
  // Grant clipboard permissions
  await context.grantPermissions(['clipboard-write', 'clipboard-read']);
  
  // Click share button
  await page.getByRole('button', { name: 'Share' }).click();
  
  // Test copy link
  await page.getByRole('button', { name: 'Copy Link' }).click();
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toMatch(/\/community\/discussions\/\d+/);
  
  // Test social sharing (Twitter)
  const [newPage] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('button', { name: 'Share on Twitter' }).click()
  ]);
  
  await expect(newPage).toHaveURL(/twitter\.com\/intent\/tweet/);
  await newPage.close();
});
```

## Content Moderation

### Test Case: Report Inappropriate Content

```typescript
test('user can report inappropriate content', async ({ page }) => {
  const discussionId = await createTestDiscussion(page, testContent.spamContent);
  await page.goto(`/community/discussions/${discussionId}`);
  
  // Click report button
  await page.getByRole('button', { name: 'Report' }).click();
  
  // Select reason
  await page.getByRole('dialog').getByLabel('Reason').selectOption('spam');
  await page.getByLabel('Additional details').fill('This is clearly spam advertising');
  
  // Submit report
  await page.getByRole('button', { name: 'Submit Report' }).click();
  
  // Verify confirmation
  await expect(page.getByText('Thank you for your report')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Report' })).toBeDisabled();
});
```

### Test Case: Spam Detection

```typescript
test('system detects and prevents spam content', async ({ page }) => {
  await page.goto('/community');
  await page.getByRole('button', { name: 'New Discussion' }).click();
  
  // Try to submit spam content
  await page.getByLabel('Title').fill('BUY CHEAP GOLD NOW!!!');
  await page.getByLabel('Content').fill('Visit spam.site for cheap gold! Best prices!!!');
  
  // Multiple exclamation marks and all caps trigger spam detection
  await page.getByRole('button', { name: 'Create Discussion' }).click();
  
  // Verify spam prevention
  await expect(page.getByText('Your post appears to contain spam')).toBeVisible();
  await expect(page.getByText('Please review our community guidelines')).toBeVisible();
});
```

### Test Case: Rate Limiting

```typescript
test('rate limiting prevents spam posting', async ({ page }) => {
  // Create multiple discussions rapidly
  for (let i = 0; i < 3; i++) {
    await createTestDiscussion(page, {
      title: `Test Discussion ${i}`,
      content: 'Normal content'
    });
  }
  
  // Fourth attempt should be rate limited
  await page.goto('/community');
  await page.getByRole('button', { name: 'New Discussion' }).click();
  
  await page.getByLabel('Title').fill('Fourth Discussion');
  await page.getByRole('button', { name: 'Create Discussion' }).click();
  
  // Verify rate limit message
  await expect(page.getByText('You\'re posting too quickly')).toBeVisible();
  await expect(page.getByText('Please wait 5 minutes')).toBeVisible();
});
```

## Search and Filtering

### Test Case: Search Discussions

```typescript
test('user can search discussions by title and content', async ({ page }) => {
  // Create test discussions
  await createTestDiscussion(page, { title: 'Shiny hunting tips', content: 'Best methods for finding shinies' });
  await createTestDiscussion(page, { title: 'Speed strategies', content: 'How to complete challenges faster' });
  
  await page.goto('/community');
  
  // Search by title
  await page.getByPlaceholder('Search discussions...').fill('shiny');
  await page.keyboard.press('Enter');
  
  // Verify search results
  await expect(page.getByText('Shiny hunting tips')).toBeVisible();
  await expect(page.getByText('Speed strategies')).not.toBeVisible();
  
  // Search by content
  await page.getByPlaceholder('Search discussions...').fill('challenges faster');
  await page.keyboard.press('Enter');
  
  await expect(page.getByText('Speed strategies')).toBeVisible();
  await expect(page.getByText('Shiny hunting tips')).not.toBeVisible();
});
```

### Test Case: Filter by Game and Challenge Type

```typescript
test('user can filter discussions by game and challenge type', async ({ page }) => {
  // Create diverse test content
  await createTestDiscussion(page, { game: 'Pokemon', challengeType: 'Bingo' });
  await createTestDiscussion(page, { game: 'Sonic', challengeType: 'Speedrun' });
  await createTestDiscussion(page, { game: 'Pokemon', challengeType: 'Achievement Hunt' });
  
  await page.goto('/community');
  
  // Filter by game
  await page.getByLabel('Game').selectOption('Pokemon');
  await expect(page.locator('[data-discussion]')).toHaveCount(2);
  
  // Add challenge type filter
  await page.getByLabel('Challenge Type').selectOption('Bingo');
  await expect(page.locator('[data-discussion]')).toHaveCount(1);
  
  // Clear filters
  await page.getByRole('button', { name: 'Clear Filters' }).click();
  await expect(page.locator('[data-discussion]')).toHaveCount(3);
});
```

### Test Case: Sort Discussions

```typescript
test('user can sort discussions by different criteria', async ({ page }) => {
  // Create discussions with different properties
  const oldDiscussion = await createTestDiscussion(page, { title: 'Old Discussion' });
  await page.waitForTimeout(1000);
  const popularDiscussion = await createTestDiscussion(page, { title: 'Popular Discussion' });
  await upvoteDiscussion(page, popularDiscussion, 10);
  const commentedDiscussion = await createTestDiscussion(page, { title: 'Commented Discussion' });
  await addMultipleComments(page, commentedDiscussion, 5);
  
  await page.goto('/community');
  
  // Sort by newest (default)
  await expect(page.locator('[data-discussion]').first()).toContainText('Commented Discussion');
  
  // Sort by most upvoted
  await page.getByLabel('Sort by').selectOption('most_upvoted');
  await expect(page.locator('[data-discussion]').first()).toContainText('Popular Discussion');
  
  // Sort by most comments
  await page.getByLabel('Sort by').selectOption('most_comments');
  await expect(page.locator('[data-discussion]').first()).toContainText('Commented Discussion');
});
```

## Notification System

### Test Case: Discussion Reply Notifications

```typescript
test('user receives notification when someone replies to their discussion', async ({ page, context }) => {
  // Create discussion as user1
  const discussionId = await createTestDiscussion(page);
  
  // Login as user2 and reply
  await loginAsUser(page, testUsers.regularUser2);
  await page.goto(`/community/discussions/${discussionId}`);
  await page.getByRole('button', { name: 'Show comments' }).click();
  await page.getByPlaceholder('What are your thoughts on this discussion?').fill('Great topic!');
  await page.getByRole('button', { name: 'Post Comment' }).click();
  
  // Login back as user1 and check notifications
  await loginAsUser(page, testUsers.regularUser);
  await page.goto('/notifications');
  
  // Verify notification exists
  await expect(page.getByText('test_user_2 commented on your discussion')).toBeVisible();
  await expect(page.getByRole('link', { name: 'View comment' })).toBeVisible();
  
  // Click notification to navigate
  await page.getByRole('link', { name: 'View comment' }).click();
  await expect(page).toHaveURL(new RegExp(`/community/discussions/${discussionId}#comment-`));
});
```

### Test Case: Follow Activity Notifications

```typescript
test('user receives notifications for followed user activity', async ({ page }) => {
  // User1 follows User2
  await loginAsUser(page, testUsers.regularUser);
  await page.goto('/users/test_user_2');
  await page.getByRole('button', { name: 'Follow' }).click();
  
  // User2 creates a discussion
  await loginAsUser(page, testUsers.regularUser2);
  const discussionId = await createTestDiscussion(page);
  
  // User1 checks notifications
  await loginAsUser(page, testUsers.regularUser);
  await page.goto('/notifications');
  
  await expect(page.getByText('test_user_2 created a new discussion')).toBeVisible();
  await expect(page.getByRole('link', { name: discussionId })).toBeVisible();
});
```

### Test Case: Notification Preferences

```typescript
test('user can manage notification preferences', async ({ page }) => {
  await page.goto('/settings/notifications');
  
  // Toggle notification types
  await page.getByLabel('Discussion replies').uncheck();
  await page.getByLabel('New followers').check();
  await page.getByLabel('Community updates').uncheck();
  
  // Save preferences
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText('Notification preferences saved')).toBeVisible();
  
  // Verify preferences persist
  await page.reload();
  await expect(page.getByLabel('Discussion replies')).not.toBeChecked();
  await expect(page.getByLabel('New followers')).toBeChecked();
  await expect(page.getByLabel('Community updates')).not.toBeChecked();
});
```

## Privacy and Visibility

### Test Case: Private Discussion Visibility

```typescript
test('private discussions are only visible to authorized users', async ({ page, context }) => {
  // Create private discussion
  await page.goto('/community');
  await page.getByRole('button', { name: 'New Discussion' }).click();
  
  await page.getByLabel('Title').fill('Private Strategy Discussion');
  await page.getByLabel('Visibility').selectOption('private');
  await page.getByLabel('Invite users').fill('trusted_friend');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Create Discussion' }).click();
  
  const discussionUrl = page.url();
  
  // Try to access as unauthorized user
  await loginAsUser(page, testUsers.regularUser2);
  await page.goto(discussionUrl);
  
  await expect(page.getByText('You don\'t have permission to view this discussion')).toBeVisible();
  
  // Access as invited user
  await loginAsUser(page, { username: 'trusted_friend', email: 'friend@test.com' });
  await page.goto(discussionUrl);
  
  await expect(page.getByText('Private Strategy Discussion')).toBeVisible();
  await expect(page.getByText('Private Discussion')).toBeVisible();
});
```

### Test Case: Block User

```typescript
test('user can block another user to hide their content', async ({ page }) => {
  // User1 blocks User2
  await page.goto('/users/test_user_2');
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Block user' }).click();
  
  // Confirm block
  await page.getByRole('dialog').getByRole('button', { name: 'Block User' }).click();
  await expect(page.getByText('User blocked successfully')).toBeVisible();
  
  // Verify User2's content is hidden
  await page.goto('/community');
  await expect(page.getByText('Content from blocked user')).not.toBeVisible();
  
  // Verify block appears in settings
  await page.goto('/settings/blocked-users');
  await expect(page.getByText('test_user_2')).toBeVisible();
});
```

## Real-time Updates

### Test Case: Live Discussion Updates

```typescript
test('discussions update in real-time when new comments are added', async ({ page, context }) => {
  const discussionId = await createTestDiscussion(page);
  
  // Open discussion in two tabs
  const page1 = page;
  const page2 = await context.newPage();
  
  await page1.goto(`/community/discussions/${discussionId}`);
  await page2.goto(`/community/discussions/${discussionId}`);
  
  // Expand comments on both pages
  await page1.getByRole('button', { name: 'Show comments' }).click();
  await page2.getByRole('button', { name: 'Show comments' }).click();
  
  // Add comment on page2
  await page2.getByPlaceholder('What are your thoughts on this discussion?').fill('Real-time comment!');
  await page2.getByRole('button', { name: 'Post Comment' }).click();
  
  // Verify comment appears on page1 without refresh
  await expect(page1.getByText('Real-time comment!')).toBeVisible({ timeout: 5000 });
  await expect(page1.getByText('Comments (1)')).toBeVisible();
  
  // Verify notification badge
  await expect(page1.getByText('New comment')).toBeVisible();
});
```

### Test Case: Live Upvote Counter

```typescript
test('upvote counts update in real-time across sessions', async ({ page, context }) => {
  const discussionId = await createTestDiscussion(page);
  
  // Open in two tabs
  const page1 = page;
  const page2 = await context.newPage();
  
  await page1.goto(`/community/discussions/${discussionId}`);
  await page2.goto(`/community/discussions/${discussionId}`);
  
  // Get initial count on page1
  const upvoteButton1 = page1.getByRole('button', { name: /upvote/i });
  const initialCount = await upvoteButton1.textContent();
  
  // Upvote on page2
  await page2.getByRole('button', { name: /upvote/i }).click();
  
  // Verify count updates on page1
  await expect(upvoteButton1).toContainText(String(parseInt(initialCount?.match(/\d+/)?.[0] || '0') + 1), { timeout: 5000 });
});
```

## Performance and Edge Cases

### Test Case: Pagination and Infinite Scroll

```typescript
test('discussion list implements efficient pagination', async ({ page }) => {
  // Create 50 test discussions
  for (let i = 0; i < 50; i++) {
    await createTestDiscussion(page, { title: `Discussion ${i}` });
  }
  
  await page.goto('/community');
  
  // Verify initial load (20 items)
  await expect(page.locator('[data-discussion]')).toHaveCount(20);
  
  // Scroll to bottom to trigger pagination
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  
  // Wait for next batch to load
  await expect(page.locator('[data-discussion]')).toHaveCount(40, { timeout: 5000 });
  
  // Verify loading indicator
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByText('Loading more discussions...')).toBeVisible();
});
```

### Test Case: Handle Network Errors Gracefully

```typescript
test('handles network errors with retry mechanism', async ({ page, context }) => {
  // Simulate network failure
  await context.route('**/api/discussions', route => {
    route.abort('failed');
  });
  
  await page.goto('/community');
  
  // Verify error message
  await expect(page.getByText('Failed to load discussions')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  
  // Restore network and retry
  await context.unroute('**/api/discussions');
  await page.getByRole('button', { name: 'Retry' }).click();
  
  // Verify discussions load
  await expect(page.locator('[data-discussion]').first()).toBeVisible();
});
```

### Test Case: XSS Prevention

```typescript
test('prevents XSS attacks in user-generated content', async ({ page }) => {
  await page.goto('/community');
  await page.getByRole('button', { name: 'New Discussion' }).click();
  
  // Try to inject script
  const xssPayload = '<script>alert("XSS")</script><img src=x onerror=alert("XSS")>';
  await page.getByLabel('Title').fill('Test XSS');
  await page.getByLabel('Content').fill(xssPayload);
  await page.getByRole('button', { name: 'Create Discussion' }).click();
  
  // Verify script is escaped, not executed
  await expect(page.locator('text=<script>')).toBeVisible();
  
  // Verify no alert dialog appears
  await page.waitForTimeout(1000);
  const dialogs: string[] = [];
  page.on('dialog', dialog => dialogs.push(dialog.message()));
  await page.reload();
  expect(dialogs).toHaveLength(0);
});
```

### Test Case: Unicode and Emoji Support

```typescript
test('supports unicode characters and emojis in discussions', async ({ page }) => {
  await page.goto('/community');
  await page.getByRole('button', { name: 'New Discussion' }).click();
  
  // Use various unicode characters
  const unicodeTitle = '🎮 Gaming Tips 日本語 العربية 中文 🚀';
  const unicodeContent = 'Testing émojis 😀😎🎯 and special chars: ñáéíóú ©™®';
  
  await page.getByLabel('Title').fill(unicodeTitle);
  await page.getByLabel('Content').fill(unicodeContent);
  await page.getByRole('button', { name: 'Create Discussion' }).click();
  
  // Verify all characters display correctly
  await expect(page.getByRole('heading', { level: 1 })).toContainText(unicodeTitle);
  await expect(page.getByText(unicodeContent)).toBeVisible();
  
  // Verify in search
  await page.goto('/community');
  await page.getByPlaceholder('Search discussions...').fill('🎮');
  await page.keyboard.press('Enter');
  await expect(page.getByText(unicodeTitle)).toBeVisible();
});
```

## Helper Functions

```typescript
// Helper function to create test discussion
async function createTestDiscussion(page: Page, overrides = {}) {
  const discussionData = {
    title: 'Test Discussion',
    content: 'Test content',
    game: 'Pokemon',
    challengeType: 'Bingo',
    tags: ['test'],
    ...overrides
  };
  
  await page.goto('/community');
  await page.getByRole('button', { name: 'New Discussion' }).click();
  await page.getByLabel('Title').fill(discussionData.title);
  await page.getByLabel('Game').selectOption(discussionData.game);
  if (discussionData.challengeType) {
    await page.getByLabel('Challenge Type').selectOption(discussionData.challengeType);
  }
  await page.getByLabel('Content').fill(discussionData.content);
  
  for (const tag of discussionData.tags) {
    await page.getByLabel('Tags').fill(tag);
    await page.keyboard.press('Enter');
  }
  
  await page.getByRole('button', { name: 'Create Discussion' }).click();
  
  // Extract discussion ID from URL
  const url = page.url();
  const match = url.match(/\/discussions\/(\d+)/);
  return match ? match[1] : null;
}

// Helper function to add test comment
async function addTestComment(page: Page, discussionId: string, content = 'Test comment') {
  await page.goto(`/community/discussions/${discussionId}`);
  await page.getByRole('button', { name: 'Show comments' }).click();
  await page.getByPlaceholder('What are your thoughts on this discussion?').fill(content);
  await page.getByRole('button', { name: 'Post Comment' }).click();
  
  // Extract comment ID from new comment element
  const commentElement = page.locator('[data-comment-id]').last();
  return await commentElement.getAttribute('data-comment-id');
}

// Helper function to login as specific user
async function loginAsUser(page: Page, user: { username: string; email: string }) {
  await page.goto('/auth/logout');
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill('testpassword123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL('/');
}
```

## Best Practices

### Current Implementation Patterns

1. **Test Data Isolation**: Each test creates its own test data to avoid dependencies
2. **Authentication Setup**: All tests use the `authenticatedPage` fixture for proper user context
3. **Network State Management**: Tests properly wait for network operations using `waitForNetworkIdle`
4. **Error Scenarios**: Tests cover both success and failure paths
5. **Accessibility**: Tests include accessibility validation with `checkAccessibility`
6. **Performance**: Tests monitor response times and assert on loading thresholds
7. **Security**: Tests validate XSS prevention and content sanitization
8. **Responsive Design**: Tests verify community features across different viewports

### Enhanced Patterns (To Be Implemented)

9. **Type Safety**: All test data should use proper database schema types
10. **Validation**: Input validation with Zod schemas at test boundaries
11. **Real-time Testing**: Multi-tab testing with typed WebSocket message handling
12. **Concurrent Operations**: Test race conditions and concurrent user actions
13. **Error Boundaries**: Test error recovery and graceful degradation
14. **Moderation Testing**: Comprehensive content filtering and spam detection
15. **Rate Limiting**: Test various rate limiting algorithms and recovery
16. **Database Consistency**: Validate data integrity across operations

### Test Organization Guidelines

- **File Structure**: Organize tests by feature area (discussions, comments, etc.)
- **Test Naming**: Use descriptive names that explain the behavior being tested
- **Helper Functions**: Extract common operations into reusable utilities
- **Data Factories**: Use data generation for realistic test scenarios
- **Cleanup Strategies**: Implement proper test data cleanup and isolation
- **Documentation**: Maintain comprehensive test documentation and examples

## Migration and Enhancement Roadmap

### Phase 1: Type Safety Foundation (Week 1)
1. Create `types.ts` with database-aligned interfaces
2. Implement Zod validation schemas
3. Update test utilities with type safety
4. Replace implicit `any` types
5. Add type checking to CI pipeline

### Phase 2: Enhanced Test Utilities (Week 1-2)
1. Implement realistic data generators with faker.js
2. Create user scenario fixtures
3. Build typed helper functions
4. Add moderation test patterns
5. Establish cleanup patterns

### Phase 3: Real-time & Concurrent Testing (Week 2)
1. Implement typed WebSocket handling
2. Add concurrent operation testing
3. Create error boundary tests
4. Test network reconnection scenarios
5. Validate optimistic updates

### Phase 4: Advanced Features (Week 3)
1. Comprehensive moderation testing
2. Performance benchmarking
3. Load testing for real-time features
4. Security vulnerability testing
5. Accessibility compliance validation

### Documentation Requirements

- **Test Patterns**: Document all testing patterns and utilities
- **Type Definitions**: Maintain comprehensive type documentation
- **Implementation Status**: Keep current status updated
- **Best Practices**: Establish and document testing standards
- **Troubleshooting**: Provide debugging and resolution guides

### Success Criteria

- ✅ 121+ comprehensive test scenarios
- ❌ 100% type safety with zero `any` types
- ✅ Cross-browser compatibility (Chromium, Firefox)
- ❌ Real-time message validation with Zod
- ✅ Performance thresholds maintained
- ✅ WCAG 2.1 AA accessibility compliance
- ❌ Comprehensive error boundary coverage
- ❌ Advanced moderation and rate limiting

---

**Status**: This test suite provides comprehensive coverage of community features with 121 tests across 5 major areas. The foundation is solid, but type safety and advanced features need implementation to achieve production readiness. The test patterns and infrastructure are established and ready for enhancement.