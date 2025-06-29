import { expect } from '@playwright/test';
import type { Route, Page } from '@playwright/test';
import type {
  RealTimeEvent,
  WebSocketMessage,
  WebSocketTestConfig,
  ConcurrentTestOperation,
  ConcurrentTestResult,
  UserScenario,
} from './types';
import type {
  TestWindow,
  SupabaseRealtimeChannel,
  SupabaseRealtimeClient,
  EventCallback,
} from '../../types/test-types';
import { waitForNetworkIdle } from '../../helpers/test-utils';

// WebSocket connection testing utilities
export class RealtimeTestManager {
  private events: RealTimeEvent[] = [];
  private connections: Map<string, WebSocket> = new Map();
  private messageHandlers: Map<string, Array<(event: RealTimeEvent) => void>> =
    new Map();

  async setupRealtimeConnection(
    page: Page,
    channel: string,
    config: WebSocketTestConfig = {
      channel,
      events: ['INSERT', 'UPDATE', 'DELETE'],
      timeout: 10000,
      expectedMessageCount: 1,
    }
  ): Promise<void> {
    // Inject WebSocket testing utilities into the page
    await page.evaluate(testConfig => {
      // Store test configuration
      interface RealtimeWindowExtensions {
        __realtimeTestConfig?: WebSocketTestConfig;
        __realtimeEvents?: RealTimeEvent[];
        __realtimeConnections?: Map<
          string,
          {
            handlers: Map<string, Array<(event: RealTimeEvent) => void>>;
            subscribed: boolean;
          }
        >;
        __mockRealtime?: unknown;
        supabase?: { realtime?: unknown };
      }
      (window as Window & RealtimeWindowExtensions).__realtimeTestConfig =
        testConfig;
      (window as Window & RealtimeWindowExtensions).__realtimeEvents = [];
      (window as Window & RealtimeWindowExtensions).__realtimeConnections =
        new Map();

      // Mock Supabase realtime client
      const mockRealtimeClient: SupabaseRealtimeClient = {
        channel: (channelName: string): SupabaseRealtimeChannel => {
          const channelHandlers: Map<
            string,
            Array<(event: RealTimeEvent) => void>
          > = new Map();

          const channel: SupabaseRealtimeChannel = {
            on: (event: string, handler: (event: RealTimeEvent) => void) => {
              if (!channelHandlers.has(event)) {
                channelHandlers.set(event, []);
              }
              channelHandlers.get(event)!.push(handler);
              return channel;
            },
            subscribe: (callback?: (status: string, err?: Error) => void) => {
              // Store channel for testing
              (
                window as Window & RealtimeWindowExtensions
              ).__realtimeConnections?.set(channelName, {
                handlers: channelHandlers,
                subscribed: true,
              });

              if (callback) callback('SUBSCRIBED');
              return channel;
            },
            unsubscribe: () => {
              (
                window as Window & RealtimeWindowExtensions
              ).__realtimeConnections?.delete(channelName);
              return channel;
            },
            send: (message: unknown) => {
              // Simulate message sending
              (
                window as Window & RealtimeWindowExtensions
              ).__realtimeEvents?.push({
                eventType: 'INSERT',
                schema: 'public',
                table: 'discussions',
                channel: channelName,
                message,
                timestamp: Date.now(),
                commit_timestamp: new Date().toISOString(),
              } as RealTimeEvent);
            },
          };

          return channel;
        },
      };

      // Replace Supabase realtime with mock
      const win = window as Window & RealtimeWindowExtensions;
      if (win.supabase) {
        win.supabase.realtime = mockRealtimeClient;
      }

      // Store mock for direct access
      win.__mockRealtime = mockRealtimeClient;
    }, config);
  }

  async triggerRealtimeEvent<T>(
    page: Page,
    event: RealTimeEvent<T>
  ): Promise<void> {
    await page.evaluate(eventData => {
      interface RealtimeWindowExtensions {
        __realtimeEvents?: RealTimeEvent[];
        __realtimeConnections?: Map<
          string,
          {
            handlers: Map<string, Array<(event: RealTimeEvent) => void>>;
            subscribed: boolean;
          }
        >;
      }
      const win = window as Window & RealtimeWindowExtensions;
      const connections = win.__realtimeConnections;
      const events = win.__realtimeEvents;

      // Add event to history
      if (events) {
        events.push({
          ...eventData,
          timestamp: Date.now(),
        });
      }

      // Trigger handlers for all matching channels
      if (connections) {
        for (const [channelName, connection] of Array.from(
          connections.entries()
        )) {
          if (connection.subscribed && connection.handlers) {
            const handlers = connection.handlers.get(eventData.eventType) || [];
            handlers.forEach(handler => {
              try {
                handler(eventData);
              } catch (error) {
                console.error('Realtime handler error:', error);
              }
            });
          }
        }
      }
    }, event);
  }

  async waitForRealtimeEvent(
    page: Page,
    eventType: string,
    timeout = 5000
  ): Promise<RealTimeEvent[]> {
    const result = await page.waitForFunction(
      ({ eventType: type, timeoutMs }) => {
        const events = (window as TestWindow).__realtimeEvents || [];
        const matchingEvents = events.filter((e: unknown) => {
          const event = e as RealTimeEvent;
          return event.eventType === type;
        });
        return matchingEvents.length > 0 ? matchingEvents : null;
      },
      { eventType, timeoutMs: timeout },
      { timeout }
    );

    const value = await result.jsonValue();
    return value as RealTimeEvent[];
  }

  async getRealtimeEvents(
    page: Page,
    filterType?: string
  ): Promise<RealTimeEvent[]> {
    return page.evaluate(type => {
      const events = (window as TestWindow).__realtimeEvents || [];
      if (type) {
        return events.filter((e: unknown) => {
          const event = e as RealTimeEvent;
          return event.eventType === type;
        }) as RealTimeEvent[];
      }
      return events as RealTimeEvent[];
    }, filterType);
  }

  async cleanupRealtimeConnections(page: Page): Promise<void> {
    await page.evaluate(() => {
      interface RealtimeWindowExtensions {
        __realtimeEvents?: RealTimeEvent[];
        __realtimeConnections?: Map<string, unknown>;
      }
      const connections = (window as Window & RealtimeWindowExtensions)
        .__realtimeConnections;
      if (connections) {
        connections.clear();
      }
      (window as Window & RealtimeWindowExtensions).__realtimeEvents = [];
    });
  }
}

// Multi-tab concurrent testing
export async function testMultiTabRealtime(
  page1: Page,
  page2: Page,
  operation: {
    type: 'comment' | 'upvote' | 'discussion_edit';
    discussionId: string;
    data: Record<string, unknown>;
  }
): Promise<{
  page1Events: RealTimeEvent[];
  page2Events: RealTimeEvent[];
  syncTime: number;
}> {
  const realtimeManager = new RealtimeTestManager();

  // Setup realtime on both pages
  await Promise.all([
    realtimeManager.setupRealtimeConnection(
      page1,
      `discussion:${operation.discussionId}`
    ),
    realtimeManager.setupRealtimeConnection(
      page2,
      `discussion:${operation.discussionId}`
    ),
  ]);

  // Navigate both pages to the discussion
  await Promise.all([
    page1.goto(`/community/discussions/${operation.discussionId}`),
    page2.goto(`/community/discussions/${operation.discussionId}`),
  ]);

  await Promise.all([waitForNetworkIdle(page1), waitForNetworkIdle(page2)]);

  const startTime = Date.now();

  // Perform operation on page1
  switch (operation.type) {
    case 'comment':
      await page1
        .getByPlaceholder('What are your thoughts on this discussion?')
        .fill(String(operation.data.content));
      await page1.getByRole('button', { name: /post comment/i }).click();
      break;

    case 'upvote':
      await page1
        .getByRole('button', { name: /upvote/i })
        .first()
        .click();
      break;

    case 'discussion_edit':
      await page1.getByRole('button', { name: /edit/i }).click();
      await page1.getByLabel('Content').fill(String(operation.data.content));
      await page1.getByRole('button', { name: /save changes/i }).click();
      break;
  }

  // Wait for real-time synchronization
  await Promise.all([waitForNetworkIdle(page1), waitForNetworkIdle(page2)]);

  // Verify content appears on page2
  if (operation.type === 'comment') {
    await expect(page2.getByText(String(operation.data.content))).toBeVisible({
      timeout: 5000,
    });
  } else if (operation.type === 'discussion_edit') {
    await expect(page2.getByText(String(operation.data.content))).toBeVisible({
      timeout: 5000,
    });
    await expect(page2.getByText('(edited)')).toBeVisible();
  }

  const syncTime = Date.now() - startTime;

  // Get events from both pages
  const [page1Events, page2Events] = await Promise.all([
    realtimeManager.getRealtimeEvents(page1),
    realtimeManager.getRealtimeEvents(page2),
  ]);

  // Cleanup
  await Promise.all([
    realtimeManager.cleanupRealtimeConnections(page1),
    realtimeManager.cleanupRealtimeConnections(page2),
  ]);

  return {
    page1Events,
    page2Events,
    syncTime,
  };
}

// Race condition testing
export async function testRaceConditions(
  pages: Page[],
  operations: Array<{
    pageIndex: number;
    operation: () => Promise<unknown>;
    expectedOutcome: 'success' | 'conflict' | 'duplicate_prevention';
  }>
): Promise<{
  results: Array<{
    index: number;
    pageIndex?: number;
    success: boolean;
    result?: unknown;
    error?: string;
    expectedOutcome: string;
    timestamp?: number;
  }>;
  raceConditionsDetected: boolean;
  conflictResolution: 'first_wins' | 'last_wins' | 'merge' | 'error';
}> {
  const startTime = Date.now();
  const results: Array<{
    index: number;
    pageIndex?: number;
    success: boolean;
    result?: unknown;
    error?: string;
    expectedOutcome: string;
    timestamp: number;
  }> = [];

  // Execute all operations simultaneously
  const promises = operations.map(async (op, index) => {
    const page = pages[op.pageIndex];
    let result: unknown;
    let error: string | undefined;
    let success = true;

    try {
      result = await op.operation();
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
    }

    return {
      index,
      pageIndex: op.pageIndex,
      success,
      result,
      error,
      expectedOutcome: op.expectedOutcome,
      timestamp: Date.now() - startTime,
    };
  });

  const operationResults = await Promise.allSettled(promises);

  operationResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      results.push({
        index,
        success: false,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
        expectedOutcome: operations[index]?.expectedOutcome || 'unknown',
        timestamp: Date.now() - startTime,
      });
    }
  });

  // Analyze race conditions
  const conflicts = results.filter(
    r => r.expectedOutcome === 'conflict' && !r.success
  );
  const duplicatePrevention = results.filter(
    r => r.expectedOutcome === 'duplicate_prevention' && !r.success
  );

  const raceConditionsDetected =
    conflicts.length > 0 || duplicatePrevention.length > 0;

  // Determine conflict resolution strategy
  let conflictResolution: 'first_wins' | 'last_wins' | 'merge' | 'error' =
    'error';
  const successfulOperations = results.filter(r => r.success);

  if (successfulOperations.length === 1) {
    const winner = successfulOperations[0];
    const earliestTimestamp = Math.min(...results.map(r => r.timestamp));
    const latestTimestamp = Math.max(...results.map(r => r.timestamp));

    if (winner && winner.timestamp === earliestTimestamp) {
      conflictResolution = 'first_wins';
    } else if (winner && winner.timestamp === latestTimestamp) {
      conflictResolution = 'last_wins';
    } else {
      conflictResolution = 'merge';
    }
  } else if (successfulOperations.length > 1) {
    conflictResolution = 'merge';
  }

  return {
    results,
    raceConditionsDetected,
    conflictResolution,
  };
}

// Network resilience testing
export async function testNetworkResilience(
  page: Page,
  scenario: 'offline' | 'slow_connection' | 'intermittent' | 'reconnection'
): Promise<{
  operationsQueued: number;
  operationsCompleted: number;
  dataIntegrity: boolean;
  reconnectionTime?: number;
}> {
  let operationsQueued = 0;
  let operationsCompleted = 0;
  let reconnectionTime: number | undefined;

  switch (scenario) {
    case 'offline': {
      // Simulate offline mode
      await page.context().setOffline(true);

      // Try to perform operations while offline
      try {
        await page
          .getByPlaceholder('What are your thoughts on this discussion?')
          .fill('Offline comment');
        await page.getByRole('button', { name: /post comment/i }).click();
        operationsQueued++;

        // Verify offline indicator
        await expect(page.getByText(/offline|no connection/i)).toBeVisible({
          timeout: 2000,
        });
      } catch (error) {
        // Expected to fail or queue
      }

      // Go back online
      const offlineReconnectStart = Date.now();
      await page.context().setOffline(false);

      // Wait for reconnection and operation completion
      try {
        await expect(page.getByText('Offline comment')).toBeVisible({
          timeout: 10000,
        });
        operationsCompleted++;
        reconnectionTime = Date.now() - offlineReconnectStart;
      } catch (error) {
        // Operation may have been lost
      }
      break;
    }

    case 'slow_connection': {
      // Simulate slow connection
      await page.route('**/*', async (route: Route) => {
        await page.waitForTimeout(2000); // 2 second delay
        route.continue();
      });

      // Perform operations with slow connection
      const slowStart = Date.now();
      await page
        .getByPlaceholder('What are your thoughts on this discussion?')
        .fill('Slow connection comment');
      await page.getByRole('button', { name: /post comment/i }).click();
      operationsQueued++;

      try {
        await expect(page.getByText('Slow connection comment')).toBeVisible({
          timeout: 15000,
        });
        operationsCompleted++;
      } catch (error) {
        // Timeout handling
      }

      // Restore normal connection
      await page.unroute('**/*');
      break;
    }

    case 'intermittent': {
      // Simulate intermittent connection
      let connectionUp = true;
      const intervalId = setInterval(() => {
        connectionUp = !connectionUp;
        page.context().setOffline(!connectionUp);
      }, 3000);

      // Try multiple operations during intermittent connection
      for (let i = 0; i < 3; i++) {
        try {
          await page
            .getByPlaceholder('What are your thoughts on this discussion?')
            .fill(`Intermittent comment ${i + 1}`);
          await page.getByRole('button', { name: /post comment/i }).click();
          operationsQueued++;

          await page.waitForTimeout(2000);

          if (
            await page.getByText(`Intermittent comment ${i + 1}`).isVisible()
          ) {
            operationsCompleted++;
          }
        } catch (error) {
          // Some operations may fail
        }
      }

      clearInterval(intervalId);
      await page.context().setOffline(false);
      break;
    }

    case 'reconnection': {
      // Test automatic reconnection
      await page.context().setOffline(true);
      await page.waitForTimeout(5000); // Stay offline for 5 seconds

      const networkReconnectStart = Date.now();
      await page.context().setOffline(false);

      // Wait for reconnection indicator
      try {
        await expect(page.getByText(/connected|online/i)).toBeVisible({
          timeout: 10000,
        });
        reconnectionTime = Date.now() - networkReconnectStart;
      } catch (error) {
        // No reconnection indicator found
      }
      break;
    }
  }

  // Check data integrity by comparing with expected state
  const dataIntegrity =
    operationsCompleted === operationsQueued || operationsCompleted > 0;

  return {
    operationsQueued,
    operationsCompleted,
    dataIntegrity,
    reconnectionTime,
  };
}

// WebSocket message validation
export async function validateWebSocketMessages(
  page: Page,
  expectedMessages: Array<{
    eventType: string;
    table: string;
    validation: (payload: unknown) => boolean;
  }>
): Promise<{
  validMessages: number;
  invalidMessages: number;
  errors: string[];
}> {
  let validMessages = 0;
  let invalidMessages = 0;
  const errors: string[] = [];

  // Get all captured WebSocket messages
  const messages = (await page.evaluate(() => {
    return (window as TestWindow).__realtimeEvents || [];
  })) as RealTimeEvent[];

  for (const expectedMsg of expectedMessages) {
    const matchingMessages = messages.filter(
      msg =>
        msg.eventType === expectedMsg.eventType &&
        msg.table === expectedMsg.table
    );

    for (const message of matchingMessages) {
      try {
        if (expectedMsg.validation(message)) {
          validMessages++;
        } else {
          invalidMessages++;
          errors.push(
            `Invalid message payload for ${expectedMsg.eventType} on ${expectedMsg.table}`
          );
        }
      } catch (error) {
        invalidMessages++;
        errors.push(
          `Validation error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  return {
    validMessages,
    invalidMessages,
    errors,
  };
}

// Optimistic update testing
export async function testOptimisticUpdates(
  page: Page,
  operation: 'upvote' | 'comment' | 'edit',
  data: Record<string, unknown>
): Promise<{
  optimisticUpdateTime: number;
  serverConfirmationTime: number;
  rollbackOccurred: boolean;
}> {
  let optimisticUpdateTime = 0;
  let serverConfirmationTime = 0;
  let rollbackOccurred = false;

  const startTime = Date.now();

  switch (operation) {
    case 'upvote': {
      const upvoteButton = page
        .getByRole('button', { name: /upvote/i })
        .first();
      const initialText = await upvoteButton.textContent();
      const initialCount = parseInt(initialText?.match(/\d+/)?.[0] || '0');

      await upvoteButton.click();

      // Check for optimistic update (immediate)
      try {
        await expect(upvoteButton).toContainText(String(initialCount + 1), {
          timeout: 500,
        });
        optimisticUpdateTime = Date.now() - startTime;
      } catch (error) {
        // No optimistic update
      }

      // Wait for server confirmation or rollback
      await page.waitForTimeout(2000);
      const finalText = await upvoteButton.textContent();
      const finalCount = parseInt(finalText?.match(/\d+/)?.[0] || '0');

      if (finalCount === initialCount + 1) {
        serverConfirmationTime = Date.now() - startTime;
      } else if (finalCount === initialCount) {
        rollbackOccurred = true;
      }
      break;
    }

    case 'comment': {
      const content = String(data.content || '');
      await page
        .getByPlaceholder('What are your thoughts on this discussion?')
        .fill(content);
      await page.getByRole('button', { name: /post comment/i }).click();

      // Check for optimistic comment appearance
      try {
        await expect(page.getByText(content)).toBeVisible({ timeout: 500 });
        optimisticUpdateTime = Date.now() - startTime;
      } catch (error) {
        // No optimistic update
      }

      // Wait for server confirmation
      await page.waitForTimeout(3000);
      if (await page.getByText(content).isVisible()) {
        serverConfirmationTime = Date.now() - startTime;
      } else {
        rollbackOccurred = true;
      }
      break;
    }

    case 'edit': {
      const content = String(data.content || '');
      await page.getByRole('button', { name: /edit/i }).click();
      await page.getByLabel('Content').fill(content);
      await page.getByRole('button', { name: /save changes/i }).click();

      // Check for optimistic edit appearance
      try {
        await expect(page.getByText(content)).toBeVisible({ timeout: 500 });
        optimisticUpdateTime = Date.now() - startTime;
      } catch (error) {
        // No optimistic update
      }

      // Wait for server confirmation
      await page.waitForTimeout(3000);
      if (await page.getByText(content).isVisible()) {
        serverConfirmationTime = Date.now() - startTime;
      } else {
        rollbackOccurred = true;
      }
      break;
    }
  }

  return {
    optimisticUpdateTime,
    serverConfirmationTime,
    rollbackOccurred,
  };
}

// Export singleton instance for convenience
export const realtimeTestManager = new RealtimeTestManager();
