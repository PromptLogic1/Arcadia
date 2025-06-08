/**
 * Redis Advanced Features Test API
 *
 * Comprehensive test endpoint for all advanced Redis features:
 * - Distributed locks
 * - Real-time presence
 * - Pub/Sub messaging
 * - Queue operations
 */

import { type NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { redisLocksService } from '@/services/redis-locks.service';
import { redisPresenceService } from '@/services/redis-presence.service';
import { redisPubSubService } from '@/services/redis-pubsub.service';
import {
  redisQueueService,
  type JobData,
} from '@/services/redis-queue.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TestResult {
  test: string;
  success: boolean;
  duration: number;
  details?: unknown;
  error?: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const results: TestResult[] = [];

  const { searchParams } = new URL(request.url);
  const feature = searchParams.get('feature') || 'all';

  try {
    log.info('Starting Redis advanced features test', {
      metadata: { feature, timestamp: new Date().toISOString() },
    });

    // Test 1: Distributed Locks
    if (feature === 'all' || feature === 'locks') {
      const lockTest = await testDistributedLocks();
      results.push(lockTest);
    }

    // Test 2: Real-time Presence
    if (feature === 'all' || feature === 'presence') {
      const presenceTest = await testRealTimePresence();
      results.push(presenceTest);
    }

    // Test 3: Pub/Sub Messaging
    if (feature === 'all' || feature === 'pubsub') {
      const pubsubTest = await testPubSubMessaging();
      results.push(pubsubTest);
    }

    // Test 4: Queue Operations
    if (feature === 'all' || feature === 'queue') {
      const queueTest = await testQueueOperations();
      results.push(queueTest);
    }

    // Test 5: Integration Test
    if (feature === 'all' || feature === 'integration') {
      const integrationTest = await testIntegration();
      results.push(integrationTest);
    }

    const totalDuration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;

    const summary = {
      feature,
      totalTests: results.length,
      successfulTests: successCount,
      failedTests: results.length - successCount,
      totalDuration,
      timestamp: new Date().toISOString(),
      results,
    };

    log.info('Redis advanced features test completed', {
      metadata: summary,
    });

    return NextResponse.json(summary, {
      status: successCount === results.length ? 200 : 207,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    log.error(
      'Redis advanced features test failed',
      error instanceof Error ? error : new Error(String(error)),
      {
        metadata: { feature },
      }
    );

    return NextResponse.json(
      {
        error: 'Redis advanced test failed',
        message: errorMessage,
        duration: Date.now() - startTime,
        results,
      },
      { status: 500 }
    );
  }
}

async function testDistributedLocks(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const lockId = `test-lock-${Date.now()}`;
    const holder1 = `holder-1-${Date.now()}`;
    const holder2 = `holder-2-${Date.now()}`;

    // Test 1: Acquire lock
    const acquire1 = await redisLocksService.acquireLock({
      id: lockId,
      holder: holder1,
      leaseDuration: 5000,
    });

    if (!acquire1.success || !acquire1.data || !acquire1.data.acquired) {
      throw new Error('Failed to acquire initial lock');
    }

    // Test 2: Try to acquire same lock with different holder (should fail)
    const acquire2 = await redisLocksService.acquireLock({
      id: lockId,
      holder: holder2,
      retryAttempts: 1,
      retryDelay: 100,
    });

    if (!acquire2.success || (acquire2.data && acquire2.data.acquired)) {
      throw new Error('Second holder should not acquire the same lock');
    }

    // Test 3: Check lock status
    const status = await redisLocksService.getLockStatus(lockId);
    if (
      !status.success ||
      !status.data ||
      !status.data.exists ||
      status.data.holder !== holder1
    ) {
      throw new Error('Lock status check failed');
    }

    // Test 4: Extend lock
    const extend = await redisLocksService.extendLock(lockId, holder1, {
      additionalTime: 3000,
    });

    if (!extend.success || !extend.data) {
      throw new Error('Lock extension failed');
    }

    // Test 5: Release lock
    const release = await redisLocksService.releaseLock(lockId, holder1);
    if (!release.success || !release.data) {
      throw new Error('Lock release failed');
    }

    // Test 6: Test withLock helper
    let executionResult = false;
    const withLockResult = await redisLocksService.withLock(
      `test-lock-helper-${Date.now()}`,
      async () => {
        executionResult = true;
        return 'success';
      },
      { id: `test-lock-helper-${Date.now()}`, leaseDuration: 3000 }
    );

    if (
      !withLockResult.success ||
      withLockResult.data !== 'success' ||
      !executionResult
    ) {
      throw new Error('withLock helper failed');
    }

    return {
      test: 'Distributed Locks',
      success: true,
      duration: Date.now() - startTime,
      details: {
        lockId,
        holder1,
        holder2,
        operations: [
          'acquire',
          'conflict_test',
          'status_check',
          'extend',
          'release',
          'withLock',
        ],
      },
    };
  } catch (error) {
    return {
      test: 'Distributed Locks',
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testRealTimePresence(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const boardId = `test-board-${Date.now()}`;
    const user1Id = `user-1-${Date.now()}`;
    const user2Id = `user-2-${Date.now()}`;

    // Test 1: User 1 joins board
    const join1 = await redisPresenceService.joinBoardPresence(
      boardId,
      user1Id,
      {
        displayName: 'Test User 1',
        avatar: 'https://example.com/avatar1.jpg',
      },
      {
        role: 'player',
        isHost: true,
      }
    );

    if (!join1.success || !join1.data) {
      throw new Error('User 1 failed to join board presence');
    }

    // Test 2: User 2 joins board
    const join2 = await redisPresenceService.joinBoardPresence(
      boardId,
      user2Id,
      {
        displayName: 'Test User 2',
        avatar: 'https://example.com/avatar2.jpg',
      },
      {
        role: 'player',
        isHost: false,
      }
    );

    if (!join2.success || !join2.data) {
      throw new Error('User 2 failed to join board presence');
    }

    // Test 3: Get board presence
    const presence = await redisPresenceService.getBoardPresence(boardId);
    if (!presence.success || !presence.data) {
      throw new Error('Failed to get board presence');
    }

    const presenceData = presence.data;
    if (Object.keys(presenceData).length !== 2) {
      throw new Error(
        `Expected 2 users in presence, got ${Object.keys(presenceData).length}`
      );
    }

    // Test 4: Update user status
    const updateResult = await redisPresenceService.updateUserPresence(
      boardId,
      user1Id,
      'away',
      { activity: 'editing' }
    );

    if (!updateResult.success) {
      throw new Error('Failed to update user presence');
    }

    // Test 5: User 1 leaves
    const leave1 = await redisPresenceService.leaveBoardPresence(
      boardId,
      user1Id
    );
    if (!leave1.success) {
      throw new Error('User 1 failed to leave board presence');
    }

    // Test 6: Check final presence
    const finalPresence = await redisPresenceService.getBoardPresence(boardId);
    if (
      !finalPresence.success ||
      !finalPresence.data ||
      Object.keys(finalPresence.data).length !== 1
    ) {
      throw new Error('Final presence check failed');
    }

    // Cleanup
    await join2.data.cleanup();

    return {
      test: 'Real-time Presence',
      success: true,
      duration: Date.now() - startTime,
      details: {
        boardId,
        users: [user1Id, user2Id],
        operations: ['join', 'get_presence', 'update', 'leave', 'cleanup'],
        finalUserCount: finalPresence.data
          ? Object.keys(finalPresence.data).length
          : 0,
      },
    };
  } catch (error) {
    return {
      test: 'Real-time Presence',
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testPubSubMessaging(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const gameId = `test-game-${Date.now()}`;
    const userId = `test-user-${Date.now()}`;

    // Test 1: Publish game event
    const gameEvent = await redisPubSubService.publishGameEvent({
      type: 'game_start',
      gameId,
      userId,
      data: {
        boardSize: '5x5',
        players: 2,
      },
    });

    if (!gameEvent.success || !gameEvent.data) {
      throw new Error('Failed to publish game event');
    }

    // Test 2: Publish chat message
    const chatMessage = await redisPubSubService.publishChatMessage({
      userId,
      username: 'TestUser',
      message: 'Hello, this is a test message!',
      gameId,
      type: 'user',
    });

    if (!chatMessage.success || !chatMessage.data) {
      throw new Error('Failed to publish chat message');
    }

    // Test 3: Publish system announcement
    const announcement = await redisPubSubService.publishSystemAnnouncement(
      gameId,
      'Game has started! Good luck to all players.',
      { priority: 'high' }
    );

    if (!announcement.success || !announcement.data) {
      throw new Error('Failed to publish system announcement');
    }

    // Test 4: Get recent events (polling)
    const recentEvents = await redisPubSubService.getRecentEvents(gameId);
    if (!recentEvents.success || !recentEvents.data) {
      throw new Error('Failed to get recent events');
    }

    if (recentEvents.data.length < 2) {
      throw new Error(
        `Expected at least 2 events, got ${recentEvents.data.length}`
      );
    }

    // Test 5: Get chat history
    const chatHistory = await redisPubSubService.getChatHistory(gameId);
    if (!chatHistory.success || !chatHistory.data) {
      throw new Error('Failed to get chat history');
    }

    if (chatHistory.data.length === 0) {
      throw new Error('Expected chat messages in history');
    }

    // Test 6: Get channel stats
    const stats = await redisPubSubService.getChannelStats(gameId);
    if (!stats.success || !stats.data) {
      throw new Error('Failed to get channel stats');
    }

    // Test 7: Bulk publish events
    const bulkEvents = await redisPubSubService.publishBulkEvents([
      {
        type: 'cell_marked',
        gameId,
        userId,
        data: { cellId: 'B2', value: 'marked' },
      },
      {
        type: 'cell_marked',
        gameId,
        userId,
        data: { cellId: 'I4', value: 'marked' },
      },
    ]);

    if (
      !bulkEvents.success ||
      !bulkEvents.data ||
      bulkEvents.data.length !== 2
    ) {
      throw new Error('Bulk event publishing failed');
    }

    return {
      test: 'Pub/Sub Messaging',
      success: true,
      duration: Date.now() - startTime,
      details: {
        gameId,
        userId,
        eventsPublished: 4, // game_start + system_announcement + 2 bulk events
        chatMessagesPublished: 1,
        recentEventsCount: recentEvents.data.length,
        chatHistoryCount: chatHistory.data.length,
        channelStats: stats.data,
      },
    };
  } catch (error) {
    return {
      test: 'Pub/Sub Messaging',
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testQueueOperations(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const queueName = `test-queue-${Date.now()}`;
    const jobType = 'test-job';

    // Test 1: Add jobs with different priorities
    const job1 = await redisQueueService.addJob(
      queueName,
      jobType,
      { task: 'high-priority-task' },
      { priority: 8 }
    );
    const job2 = await redisQueueService.addJob(
      queueName,
      jobType,
      { task: 'low-priority-task' },
      { priority: 2 }
    );
    const job3 = await redisQueueService.addJob(
      queueName,
      jobType,
      { task: 'delayed-task' },
      { delay: 1000, priority: 5 }
    );

    if (!job1.success || !job2.success || !job3.success) {
      throw new Error('Failed to add jobs to queue');
    }

    // Test 2: Get queue stats
    const initialStats = await redisQueueService.getQueueStats(queueName);
    if (!initialStats.success) {
      throw new Error('Failed to get initial queue stats');
    }

    // Test 3: Process jobs manually
    let processedJobs = 0;
    const processor = async (job: JobData) => {
      processedJobs++;
      return { processed: true, task: job.payload.task };
    };

    // Get and process the first job (should be high priority)
    const nextJob1 = await redisQueueService.getNextJob(queueName);
    if (!nextJob1.success || !nextJob1.data) {
      throw new Error('Failed to get first job');
    }

    const result1 = await processor(nextJob1.data);
    await redisQueueService.completeJob(nextJob1.data.id, result1);

    // Get and process the second job (should be low priority)
    const nextJob2 = await redisQueueService.getNextJob(queueName);
    if (!nextJob2.success || !nextJob2.data) {
      throw new Error('Failed to get second job');
    }

    const result2 = await processor(nextJob2.data);
    await redisQueueService.completeJob(nextJob2.data.id, result2);

    // Test 4: Test job failure and retry
    const failingJob = await redisQueueService.addJob(
      queueName,
      jobType,
      { task: 'failing-task' },
      { maxAttempts: 2 }
    );

    if (!failingJob.success) {
      throw new Error('Failed to add failing job');
    }

    const nextFailingJob = await redisQueueService.getNextJob(queueName);
    if (!nextFailingJob.success || !nextFailingJob.data) {
      throw new Error('Failed to get failing job');
    }

    // Simulate job failure
    await redisQueueService.failJob(
      nextFailingJob.data,
      'Simulated error for testing'
    );

    // Test 5: Wait for delayed job to become available
    await new Promise(resolve => setTimeout(resolve, 1200)); // Wait a bit longer than delay

    const delayedJob = await redisQueueService.getNextJob(queueName);
    if (!delayedJob.success || !delayedJob.data) {
      throw new Error('Delayed job should be available now');
    }

    await redisQueueService.completeJob(delayedJob.data.id, { delayed: true });

    // Test 6: Get final stats
    const finalStats = await redisQueueService.getQueueStats(queueName);
    if (!finalStats.success) {
      throw new Error('Failed to get final queue stats');
    }

    return {
      test: 'Queue Operations',
      success: true,
      duration: Date.now() - startTime,
      details: {
        queueName,
        jobsAdded: 4,
        jobsProcessed: processedJobs + 1, // +1 for delayed job
        initialStats: initialStats.data,
        finalStats: finalStats.data,
        operations: [
          'add_jobs',
          'get_stats',
          'process_jobs',
          'handle_failure',
          'delayed_job',
        ],
      },
    };
  } catch (error) {
    return {
      test: 'Queue Operations',
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testIntegration(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const gameId = `integration-test-${Date.now()}`;
    const boardId = `board-${Date.now()}`;
    const userId = `user-${Date.now()}`;

    // Integration scenario: User joins game, locks a resource, publishes events

    // Step 1: Acquire lock for game initialization
    const initLock = await redisLocksService.withLock(
      `game-init-${gameId}`,
      async () => {
        // Step 2: Join presence
        const presence = await redisPresenceService.joinBoardPresence(
          boardId,
          userId,
          { displayName: 'Integration Test User' },
          { boardId, role: 'host', isHost: true }
        );

        if (!presence.success) {
          throw new Error('Failed to join presence');
        }

        // Step 3: Publish game start event
        const gameStart = await redisPubSubService.publishGameEvent({
          type: 'game_start',
          gameId,
          boardId,
          userId,
          data: { integration: true },
        });

        if (!gameStart.success) {
          throw new Error('Failed to publish game start');
        }

        // Step 4: Queue background task
        const bgTask = await redisQueueService.addJob(
          'game-tasks',
          'setup-game-data',
          { gameId, boardId, userId },
          { priority: 7 }
        );

        if (!bgTask.success) {
          throw new Error('Failed to queue background task');
        }

        return {
          gameId,
          boardId,
          userId,
          gameStartEventId: gameStart.data,
          backgroundJobId: bgTask.data,
          presenceCleanup: presence.data
            ? presence.data.cleanup
            : () => Promise.resolve(),
        };
      },
      { id: `game-init-${gameId}`, leaseDuration: 10000 }
    );

    if (!initLock.success) {
      throw new Error('Failed to acquire initialization lock');
    }

    if (!initLock.data) {
      throw new Error('Lock was acquired but no data returned');
    }

    const result = initLock.data;

    // Step 5: Verify everything was set up correctly
    const finalPresence = await redisPresenceService.getBoardPresence(boardId);
    const recentEvents = await redisPubSubService.getRecentEvents(gameId);
    const queueStats = await redisQueueService.getQueueStats('game-tasks');

    if (
      !finalPresence.success ||
      !recentEvents.success ||
      !queueStats.success
    ) {
      throw new Error('Failed to verify integration setup');
    }

    // Cleanup
    if (result && result.presenceCleanup) {
      await result.presenceCleanup();
    }

    return {
      test: 'Integration Test',
      success: true,
      duration: Date.now() - startTime,
      details: {
        scenario:
          'Game initialization with locks, presence, events, and background tasks',
        gameId: result.gameId,
        components: ['locks', 'presence', 'pubsub', 'queue'],
        finalState: {
          presenceUsers: finalPresence.data
            ? Object.keys(finalPresence.data).length
            : 0,
          recentEvents: recentEvents.data ? recentEvents.data.length : 0,
          queueStats: queueStats.data,
        },
      },
    };
  } catch (error) {
    return {
      test: 'Integration Test',
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error:
        'POST method not supported. Use GET with ?feature=locks|presence|pubsub|queue|integration|all',
    },
    { status: 405 }
  );
}
