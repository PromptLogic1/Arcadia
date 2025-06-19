import { describe, test, expect } from '@jest/globals';

/**
 * useBingoGame Hook Integration Test
 *
 * This test verifies that the useBingoGame hook exports exist and can be imported.
 * More detailed integration testing should be done via E2E tests where the full
 * React Query + Component interaction can be tested in a real browser environment.
 *
 * The hook integrates multiple complex systems:
 * - TanStack Query for server state
 * - WebSocket realtime subscriptions
 * - Win detection algorithms
 * - Optimistic updates
 *
 * These integration points are better tested via E2E rather than complex mocking.
 */

describe('useBingoGame Hook', () => {
  test('should export useBingoGame hook', async () => {
    const { useBingoGame } = await import('../hooks/useBingoGame');

    expect(useBingoGame).toBeDefined();
    expect(typeof useBingoGame).toBe('function');
  });

  test('should export required types', async () => {
    // Test that the types file exists and exports work
    expect(() => {
      require('../types');
    }).not.toThrow();
  });

  test('should have win detection service dependency', async () => {
    // Test that the win detection service can be imported
    expect(() => {
      require('../services/win-detection.service');
    }).not.toThrow();
  });

  test('should have game state query dependencies', async () => {
    // Test that the required query hooks can be imported
    expect(() => {
      require('@/hooks/queries/useGameStateQueries');
    }).not.toThrow();
  });
});
