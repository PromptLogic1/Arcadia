# Jest Test Suite Audit Checklist

## Community Tests

- ✅ moderation.test.ts
- ✅ notification-triggers.test.ts
- ✅ permissions.test.ts
- ✅ search-service.test.ts

## Auth Tests

- ✅ auth.service.test.ts
- ❌ oauth.test.ts
- ✅ rate-limiting.test.ts
- ✅ session-token.test.ts
- ⚠️ useAuth.test.tsx
- ✅ validation.test.ts

## Bingo Boards Tests

- ✅ bingo-engine.test.ts
- ⚠️ card-generator.test.ts
- ✅ scoring.test.ts
- ✅ useBingoGame.test.tsx
- ✅ win-detection.test.ts

## Landing Tests

- ✅ ab-testing.test.ts
- ✅ analytics-events.test.ts
- ✅ feature-flags.test.ts
- ✅ seo-meta.test.ts

## Play Area Tests

- ✅ achievement-engine.test.ts
- ✅ progress-tracker.test.ts
- ✅ game-filters.test.ts
- ✅ recommendation.test.ts
- ✅ speedrun-timer.test.ts

## Settings Tests

- ❌ account-deletion.test.ts
- ❌ data-export.test.ts
- ❌ preference-migration.test.ts
- ✅ preference-validation.test.ts
- ✅ privacy-settings.test.ts
- ✅ settings-store.test.ts
- ❌ theme-engine.test.ts

## User Tests

- ✅ activity-tracker.test.ts
- ✅ badge-engine.test.ts
- ❌ profile-score.test.ts
- ✅ statistics-calculator.test.ts
- ✅ user-profile-integration.test.ts

## Library Tests

- ✅ api-handlers.test.ts
- ✅ date-utils.test.ts
- ✅ infrastructure.test.ts
- ✅ type-guards.test.ts
- ✅ validation-helpers.test.ts
- ✅ cache.test.ts
- ✅ config.test.ts
- ✅ validation/middleware.test.ts

## Services Tests

- ✅ service-response.test.ts
- ✅ auth.service.test.ts
- ✅ bingo-cards.service.test.ts
- ✅ bingo-generator.service.test.ts
- ✅ bingo-boards.service.test.ts
- ✅ bingo-board-edit.service.test.ts
- ✅ bingo-board-edit.service.coverage.test.ts
- ✅ board-collections.service.test.ts
- ✅ card-library.service.test.ts
- ✅ community-events.service.test.ts
- ✅ community-events.service.coverage.test.ts
- ✅ community.service.test.ts
- ✅ community.service.coverage.test.ts
- ✅ game-state.service.test.ts
- ⚠️ game-state.service.enhanced.test.ts
- ✅ game-state.service.simple-coverage.test.ts
- ✅ game-state.service.coverage.test.ts
- ✅ game-settings.service.test.ts
- ✅ presence-unified.service.test.ts
- ⚠️ queue.service.test.ts
- ✅ queue.service.coverage.test.ts
- ✅ queue.service.enhanced.test.ts
- ✅ rate-limiting.service.test.ts
- ✅ realtime-board.service.test.ts
- ⚠️ redis-locks.service.test.ts
- ⚠️ redis-presence.service.test.ts
- ⚠️ redis-presence.service.enhanced.test.ts
- ⚠️ redis-presence.service.coverage.test.ts
- ⚠️ redis-pubsub.service.test.ts
- ✅ redis-queue.service.test.ts
- ⚠️ redis-queue.service.coverage.test.ts
- ✅ redis.service.test.ts
- ✅ session-join.service.test.ts
- ✅ session-join.service.coverage.test.ts
- ✅ session-queue.service.test.ts
- ⚠️ session-queue.service.focused.test.ts
- ✅ session-state.service.test.ts
- ✅ session-state.service.coverage.test.ts
- ✅ session.service.test.ts
- ✅ sessions.service.test.ts
- ⚠️ sessions.service.client.test.ts
- ⚠️ sessions.service.client.additional.test.ts
- ✅ settings.service.test.ts
- ✅ submissions.service.test.ts
- ✅ user.service.test.ts
- ✅ user.service.coverage.test.ts

## API Route Tests

- ✅ health/route.test.ts
- ✅ bingo/sessions/route.test.ts
- ✅ discussions/route.test.ts
- ✅ submissions/route.test.ts
- ✅ revalidate/route.test.ts
- ✅ bingo/route.test.ts
- ✅ bingo/sessions/[id]/start/route.test.ts

## Component Tests

- ⚠️ auth/components/LoginForm.test.tsx
- ✅ auth/auth-provider.test.tsx
- ⚠️ error-boundaries/BaseErrorBoundary.test.tsx
- ✅ error-boundaries/RootErrorBoundary.test.tsx
- ⚠️ bingo-boards/components/BoardCard.test.tsx
- ✅ ui/NeonButton.test.tsx
- ✅ ui/CyberpunkBackground.test.tsx
- ⚠️ ui/LoadingSpinner.test.tsx
- ⚠️ ui/ThemeToggle.test.tsx
- ⚠️ analytics-wrapper.test.tsx
- ⚠️ web-vitals.test.tsx

## Styles Tests

- ✅ cyberpunk.styles.test.ts

## Utils Tests

- ✅ image-formats.test.ts

## Types Tests

- ✅ css-properties.test.ts
- ✅ index.test.ts

---
