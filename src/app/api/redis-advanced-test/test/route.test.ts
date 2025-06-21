/**
 * @jest-environment node
 */

import { GET, POST } from '../route';
import { log } from '@/lib/logger';
import { redisLocksService } from '@/services/redis-locks.service';
import { redisPresenceService } from '@/services/redis-presence.service';
import { redisPubSubService } from '@/services/redis-pubsub.service';
import { redisQueueService } from '@/services/redis-queue.service';
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies
jest.mock('@/lib/logger');
jest.mock('@/services/redis-locks.service');
jest.mock('@/services/redis-presence.service');
jest.mock('@/services/redis-pubsub.service');
jest.mock('@/services/redis-queue.service');
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
      headers: init?.headers,
    })),
  },
}));

const mockLog = log as jest.Mocked<typeof log>;
const mockRedisLocksService = redisLocksService as jest.Mocked<typeof redisLocksService>;
const mockRedisPresenceService = redisPresenceService as jest.Mocked<typeof redisPresenceService>;
const mockRedisPubSubService = redisPubSubService as jest.Mocked<typeof redisPubSubService>;
const mockRedisQueueService = redisQueueService as jest.Mocked<typeof redisQueueService>;
const mockNextResponse = NextResponse.json as jest.MockedFunction<typeof NextResponse.json>;

describe('Redis Advanced Test Route', () => {
  const mockRequest = {
    url: 'http://localhost:3000/api/redis-advanced-test',
  } as NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000); // Fixed timestamp
    
    // Reset all service mocks to clean state
    Object.values(mockRedisLocksService).forEach(mock => {
      if (typeof mock === 'function') {
        mock.mockReset();
      }
    });
    Object.values(mockRedisPresenceService).forEach(mock => {
      if (typeof mock === 'function') {
        mock.mockReset();
      }
    });
    Object.values(mockRedisPubSubService).forEach(mock => {
      if (typeof mock === 'function') {
        mock.mockReset();
      }
    });
    Object.values(mockRedisQueueService).forEach(mock => {
      if (typeof mock === 'function') {
        mock.mockReset();
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET - All Features Test', () => {
    it('should run all tests successfully when feature=all', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=all',
      } as NextRequest;

      // Mock all services to return successful results
      setupSuccessfulMocks();

      await GET(testRequest);

      expect(mockLog.info).toHaveBeenCalledWith(
        'Starting Redis advanced features test',
        expect.objectContaining({
          metadata: expect.objectContaining({
            feature: 'all',
          }),
        })
      );

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          feature: 'all',
          totalTests: 5,
          successfulTests: 5,
          failedTests: 0,
          results: expect.arrayContaining([
            expect.objectContaining({
              test: 'Distributed Locks',
              success: true,
            }),
            expect.objectContaining({
              test: 'Real-time Presence',
              success: true,
            }),
            expect.objectContaining({
              test: 'Pub/Sub Messaging',
              success: true,
            }),
            expect.objectContaining({
              test: 'Queue Operations',
              success: true,
            }),
            expect.objectContaining({
              test: 'Integration Test',
              success: true,
            }),
          ]),
        }),
        expect.objectContaining({
          status: 200,
        })
      );
    });

    it('should run only locks test when feature=locks', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=locks',
      } as NextRequest;

      setupSuccessfulMocks();

      await GET(testRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          feature: 'locks',
          totalTests: 1,
          successfulTests: 1,
          failedTests: 0,
          results: [
            expect.objectContaining({
              test: 'Distributed Locks',
              success: true,
            }),
          ],
        }),
        expect.objectContaining({
          status: 200,
        })
      );
    });

    it('should run only presence test when feature=presence', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=presence',
      } as NextRequest;

      setupSuccessfulMocks();

      await GET(testRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          feature: 'presence',
          totalTests: 1,
          results: [
            expect.objectContaining({
              test: 'Real-time Presence',
              success: true,
            }),
          ],
        }),
        expect.objectContaining({
          status: 200,
        })
      );
    });

    it('should return 207 status when some tests fail', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=all',
      } as NextRequest;

      setupMixedResultMocks();

      await GET(testRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          totalTests: 5,
          successfulTests: 3,
          failedTests: 2,
        }),
        expect.objectContaining({
          status: 207,
        })
      );
    });

    it('should handle service errors gracefully', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=locks',
      } as NextRequest;

      mockRedisLocksService.acquireLock.mockImplementation(() => {
        throw new Error('Redis connection failed');
      });

      await GET(testRequest);

      expect(mockLog.error).toHaveBeenCalledWith(
        'Redis advanced features test failed',
        expect.any(Error),
        expect.objectContaining({
          metadata: { feature: 'locks' },
        })
      );

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Redis advanced test failed',
          message: 'Redis connection failed',
        }),
        expect.objectContaining({
          status: 500,
        })
      );
    });

    it('should default to all features when no feature specified', async () => {
      setupSuccessfulMocks();

      await GET(mockRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          feature: 'all',
          totalTests: 5,
        }),
        expect.any(Object)
      );
    });
  });

  describe('Distributed Locks Test', () => {
    it('should test all lock operations successfully', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=locks',
      } as NextRequest;

      // Mock successful lock operations
      mockRedisLocksService.acquireLock
        .mockResolvedValueOnce({
          success: true,
          data: { acquired: true, lockId: 'test-lock-123' },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { acquired: false, reason: 'already_held' },
        });

      mockRedisLocksService.getLockStatus.mockResolvedValue({
        success: true,
        data: {
          exists: true,
          holder: 'holder-1-1640995200000',
          expiresAt: Date.now() + 5000,
        },
      });

      mockRedisLocksService.extendLock.mockResolvedValue({
        success: true,
        data: { extended: true, newExpiresAt: Date.now() + 8000 },
      });

      mockRedisLocksService.releaseLock.mockResolvedValue({
        success: true,
        data: { released: true },
      });

      mockRedisLocksService.withLock.mockResolvedValue({
        success: true,
        data: 'success',
      });

      await GET(testRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          results: [
            expect.objectContaining({
              test: 'Distributed Locks',
              success: true,
              details: expect.objectContaining({
                operations: [
                  'acquire',
                  'conflict_test',
                  'status_check',
                  'extend',
                  'release',
                  'withLock',
                ],
              }),
            }),
          ],
        }),
        expect.objectContaining({
          status: 200,
        })
      );
    });

    it('should handle lock acquisition failure', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=locks',
      } as NextRequest;

      mockRedisLocksService.acquireLock.mockResolvedValue({
        success: false,
        error: 'Failed to acquire lock',
      });

      await GET(testRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          results: [
            expect.objectContaining({
              test: 'Distributed Locks',
              success: false,
              error: 'Failed to acquire initial lock',
            }),
          ],
        }),
        expect.objectContaining({
          status: 207,
        })
      );
    });

    it('should handle lock status check failure', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=locks',
      } as NextRequest;

      mockRedisLocksService.acquireLock
        .mockResolvedValueOnce({
          success: true,
          data: { acquired: true, lockId: 'test-lock-123' },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { acquired: false },
        });

      mockRedisLocksService.getLockStatus.mockResolvedValue({
        success: false,
        error: 'Status check failed',
      });

      await GET(testRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          results: [
            expect.objectContaining({
              test: 'Distributed Locks',
              success: false,
              error: 'Lock status check failed',
            }),
          ],
        }),
        expect.objectContaining({
          status: 207,
        })
      );
    });
  });

  describe('Real-time Presence Test', () => {
    it('should test all presence operations successfully', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=presence',
      } as NextRequest;

      const mockCleanup = jest.fn().mockResolvedValue(undefined);

      mockRedisPresenceService.joinBoardPresence
        .mockResolvedValueOnce({
          success: true,
          data: { userId: 'user-1', cleanup: mockCleanup },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { userId: 'user-2', cleanup: mockCleanup },
        });

      mockRedisPresenceService.getBoardPresence
        .mockResolvedValueOnce({
          success: true,
          data: {
            'user-1-1640995200000': { displayName: 'Test User 1' },
            'user-2-1640995200000': { displayName: 'Test User 2' },
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            'user-2-1640995200000': { displayName: 'Test User 2' },
          },
        });

      mockRedisPresenceService.updateUserPresence.mockResolvedValue({
        success: true,
        data: { updated: true },
      });

      mockRedisPresenceService.leaveBoardPresence.mockResolvedValue({
        success: true,
        data: { left: true },
      });

      await GET(testRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          results: [
            expect.objectContaining({
              test: 'Real-time Presence',
              success: true,
              details: expect.objectContaining({
                operations: ['join', 'get_presence', 'update', 'leave', 'cleanup'],
                finalUserCount: 1,
              }),
            }),
          ],
        }),
        expect.objectContaining({
          status: 200,
        })
      );

      expect(mockCleanup).toHaveBeenCalled();
    });

    it('should handle presence join failure', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=presence',
      } as NextRequest;

      jest.clearAllMocks();
      mockRedisPresenceService.joinBoardPresence.mockResolvedValue({
        success: false,
        error: 'Failed to join presence',
      });

      await GET(testRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          results: [
            expect.objectContaining({
              test: 'Real-time Presence',
              success: false,
              error: 'User 1 failed to join board presence',
            }),
          ],
        }),
        expect.objectContaining({
          status: 207,
        })
      );
    });

    it('should handle presence count validation failure', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=presence',
      } as NextRequest;

      const mockCleanup = jest.fn().mockResolvedValue(undefined);

      mockRedisPresenceService.joinBoardPresence
        .mockResolvedValueOnce({
          success: true,
          data: { userId: 'user-1', cleanup: mockCleanup },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { userId: 'user-2', cleanup: mockCleanup },
        });

      // Return only 1 user instead of expected 2
      mockRedisPresenceService.getBoardPresence.mockResolvedValue({
        success: true,
        data: {
          'user-1-1640995200000': { displayName: 'Test User 1' },
        },
      });

      await GET(testRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          results: [
            expect.objectContaining({
              test: 'Real-time Presence',
              success: false,
              error: 'Expected 2 users in presence, got 1',
            }),
          ],
        }),
        expect.objectContaining({
          status: 207,
        })
      );
    });
  });

  describe('Pub/Sub Messaging Test', () => {
    it('should test all pub/sub operations successfully', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=pubsub',
      } as NextRequest;

      mockRedisPubSubService.publishGameEvent.mockResolvedValue({
        success: true,
        data: 'event-123',
      });

      mockRedisPubSubService.publishChatMessage.mockResolvedValue({
        success: true,
        data: 'msg-123',
      });

      mockRedisPubSubService.publishSystemAnnouncement.mockResolvedValue({
        success: true,
        data: 'announcement-123',
      });

      mockRedisPubSubService.getRecentEvents.mockResolvedValue({
        success: true,
        data: [
          { id: 'event-123', type: 'game_start' },
          { id: 'announcement-123', type: 'system_announcement' },
        ],
      });

      mockRedisPubSubService.getChatHistory.mockResolvedValue({
        success: true,
        data: [
          { id: 'msg-123', message: 'Hello, this is a test message!' },
        ],
      });

      mockRedisPubSubService.getChannelStats.mockResolvedValue({
        success: true,
        data: { totalEvents: 3, totalMessages: 1 },
      });

      mockRedisPubSubService.publishBulkEvents.mockResolvedValue({
        success: true,
        data: ['bulk-event-1', 'bulk-event-2'],
      });

      await GET(testRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          results: [
            expect.objectContaining({
              test: 'Pub/Sub Messaging',
              success: true,
              details: expect.objectContaining({
                eventsPublished: 4,
                chatMessagesPublished: 1,
                recentEventsCount: 2,
                chatHistoryCount: 1,
              }),
            }),
          ],
        }),
        expect.objectContaining({
          status: 200,
        })
      );
    });

    it('should handle pub/sub publishing failure', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=pubsub',
      } as NextRequest;

      mockRedisPubSubService.publishGameEvent.mockResolvedValue({
        success: false,
        error: 'Failed to publish event',
      });

      await GET(testRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          results: [
            expect.objectContaining({
              test: 'Pub/Sub Messaging',
              success: false,
              error: 'Failed to publish game event',
            }),
          ],
        }),
        expect.objectContaining({
          status: 207,
        })
      );
    });

    it('should handle insufficient recent events', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=pubsub',
      } as NextRequest;

      mockRedisPubSubService.publishGameEvent.mockResolvedValue({
        success: true,
        data: 'event-123',
      });

      mockRedisPubSubService.publishChatMessage.mockResolvedValue({
        success: true,
        data: 'msg-123',
      });

      mockRedisPubSubService.publishSystemAnnouncement.mockResolvedValue({
        success: true,
        data: 'announcement-123',
      });

      // Return only 1 event instead of expected 2+
      mockRedisPubSubService.getRecentEvents.mockResolvedValue({
        success: true,
        data: [{ id: 'event-123', type: 'game_start' }],
      });

      await GET(testRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          results: [
            expect.objectContaining({
              test: 'Pub/Sub Messaging',
              success: false,
              error: 'Expected at least 2 events, got 1',
            }),
          ],
        }),
        expect.objectContaining({
          status: 207,
        })
      );
    });
  });

  describe('Queue Operations Test', () => {
    it('should test all queue operations successfully', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=queue',
      } as NextRequest;

      // Mock job addition
      mockRedisQueueService.addJob
        .mockResolvedValueOnce({ success: true, data: 'job-1' })
        .mockResolvedValueOnce({ success: true, data: 'job-2' })
        .mockResolvedValueOnce({ success: true, data: 'job-3' })
        .mockResolvedValueOnce({ success: true, data: 'failing-job' });

      // Mock queue stats
      mockRedisQueueService.getQueueStats
        .mockResolvedValueOnce({
          success: true,
          data: { waiting: 3, active: 0, completed: 0, failed: 0 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { waiting: 0, active: 0, completed: 3, failed: 1 },
        });

      // Mock job processing
      mockRedisQueueService.getNextJob
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'job-1', payload: { task: 'high-priority-task' } },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'job-2', payload: { task: 'low-priority-task' } },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'failing-job', payload: { task: 'failing-task' } },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'job-3', payload: { task: 'delayed-task' } },
        });

      mockRedisQueueService.completeJob.mockResolvedValue({
        success: true,
        data: { completed: true },
      });

      mockRedisQueueService.failJob.mockResolvedValue({
        success: true,
        data: { failed: true },
      });

      await GET(testRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          results: [
            expect.objectContaining({
              test: 'Queue Operations',
              success: true,
              details: expect.objectContaining({
                jobsAdded: 4,
                jobsProcessed: 3,
                operations: [
                  'add_jobs',
                  'get_stats',
                  'process_jobs',
                  'handle_failure',
                  'delayed_job',
                ],
              }),
            }),
          ],
        }),
        expect.objectContaining({
          status: 200,
        })
      );
    });

    it('should handle queue job addition failure', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=queue',
      } as NextRequest;

      mockRedisQueueService.addJob.mockResolvedValue({
        success: false,
        error: 'Failed to add job',
      });

      await GET(testRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          results: [
            expect.objectContaining({
              test: 'Queue Operations',
              success: false,
              error: 'Failed to add jobs to queue',
            }),
          ],
        }),
        expect.objectContaining({
          status: 207,
        })
      );
    });

    it('should handle queue stats failure', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=queue',
      } as NextRequest;

      mockRedisQueueService.addJob.mockResolvedValue({
        success: true,
        data: 'job-1',
      });

      mockRedisQueueService.getQueueStats.mockResolvedValue({
        success: false,
        error: 'Failed to get stats',
      });

      await GET(testRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          results: [
            expect.objectContaining({
              test: 'Queue Operations',
              success: false,
              error: 'Failed to get initial queue stats',
            }),
          ],
        }),
        expect.objectContaining({
          status: 207,
        })
      );
    });
  });

  describe('Integration Test', () => {
    it('should test integration scenario successfully', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=integration',
      } as NextRequest;

      const mockCleanup = jest.fn().mockResolvedValue(undefined);

      mockRedisLocksService.withLock.mockResolvedValue({
        success: true,
        data: {
          gameId: 'integration-test-1640995200000',
          boardId: 'board-1640995200000',
          userId: 'user-1640995200000',
          gameStartEventId: 'event-123',
          backgroundJobId: 'job-123',
          presenceCleanup: mockCleanup,
        },
      });

      mockRedisPresenceService.getBoardPresence.mockResolvedValue({
        success: true,
        data: { 'user-1640995200000': { displayName: 'Integration Test User' } },
      });

      mockRedisPubSubService.getRecentEvents.mockResolvedValue({
        success: true,
        data: [{ id: 'event-123', type: 'game_start' }],
      });

      mockRedisQueueService.getQueueStats.mockResolvedValue({
        success: true,
        data: { waiting: 1, active: 0 },
      });

      await GET(testRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          results: [
            expect.objectContaining({
              test: 'Integration Test',
              success: true,
              details: expect.objectContaining({
                scenario: 'Game initialization with locks, presence, events, and background tasks',
                components: ['locks', 'presence', 'pubsub', 'queue'],
                finalState: expect.objectContaining({
                  presenceUsers: 1,
                  recentEvents: 1,
                }),
              }),
            }),
          ],
        }),
        expect.objectContaining({
          status: 200,
        })
      );

      expect(mockCleanup).toHaveBeenCalled();
    });

    it('should handle integration lock failure', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=integration',
      } as NextRequest;

      mockRedisLocksService.withLock.mockResolvedValue({
        success: false,
        error: 'Failed to acquire lock',
      });

      await GET(testRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          results: [
            expect.objectContaining({
              test: 'Integration Test',
              success: false,
              error: 'Failed to acquire initialization lock',
            }),
          ],
        }),
        expect.objectContaining({
          status: 207,
        })
      );
    });

    it('should handle integration verification failure', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=integration',
      } as NextRequest;

      const mockCleanup = jest.fn().mockResolvedValue(undefined);

      mockRedisLocksService.withLock.mockResolvedValue({
        success: true,
        data: {
          gameId: 'integration-test-1640995200000',
          presenceCleanup: mockCleanup,
        },
      });

      // Mock verification failure
      mockRedisPresenceService.getBoardPresence.mockResolvedValue({
        success: false,
        error: 'Failed to get presence',
      });

      await GET(testRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          results: [
            expect.objectContaining({
              test: 'Integration Test',
              success: false,
              error: 'Failed to verify integration setup',
            }),
          ],
        }),
        expect.objectContaining({
          status: 207,
        })
      );
    });
  });

  describe('POST Method', () => {
    it('should return 405 for POST requests', async () => {
      await POST(mockRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        {
          error: 'POST method not supported. Use GET with ?feature=locks|presence|pubsub|queue|integration|all',
        },
        { status: 405 }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle non-Error exceptions', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=locks',
      } as NextRequest;

      // Mock the locks service to throw a string error that would crash the test
      mockRedisLocksService.acquireLock.mockImplementation(() => {
        throw 'String error';
      });

      await GET(testRequest);

      expect(mockLog.error).toHaveBeenCalledWith(
        'Redis advanced features test failed',
        expect.any(Error),
        expect.objectContaining({
          metadata: { feature: 'locks' },
        })
      );

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Redis advanced test failed',
          message: 'String error',
        }),
        expect.objectContaining({
          status: 500,
        })
      );
    });

    it('should include partial results when error occurs after some tests', async () => {
      const testRequest = {
        url: 'http://localhost:3000/api/redis-advanced-test?feature=all',
      } as NextRequest;

      // Setup successful locks test
      setupSuccessfulLocksMocks();

      // But fail on presence test
      mockRedisPresenceService.joinBoardPresence.mockImplementation(() => {
        throw new Error('Presence service failed');
      });

      await GET(testRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Redis advanced test failed',
          results: [
            expect.objectContaining({
              test: 'Distributed Locks',
              success: true,
            }),
          ],
        }),
        expect.objectContaining({
          status: 500,
        })
      );
    });
  });

  // Helper functions
  function setupSuccessfulMocks() {
    setupSuccessfulLocksMocks();
    setupSuccessfulPresenceMocks();
    setupSuccessfulPubSubMocks();
    setupSuccessfulQueueMocks();
    setupSuccessfulIntegrationMocks();
  }

  function setupSuccessfulLocksMocks() {
    mockRedisLocksService.acquireLock
      .mockResolvedValueOnce({
        success: true,
        data: { acquired: true, lockId: 'test-lock-123' },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { acquired: false },
      });

    mockRedisLocksService.getLockStatus.mockResolvedValue({
      success: true,
      data: { exists: true, holder: 'holder-1-1640995200000' },
    });

    mockRedisLocksService.extendLock.mockResolvedValue({
      success: true,
      data: { extended: true },
    });

    mockRedisLocksService.releaseLock.mockResolvedValue({
      success: true,
      data: { released: true },
    });

    mockRedisLocksService.withLock.mockImplementation(async (lockId, fn, options) => {
      const result = await fn();
      return { success: true, data: result };
    });
  }

  function setupSuccessfulPresenceMocks() {
    const mockCleanup = jest.fn().mockResolvedValue(undefined);

    mockRedisPresenceService.joinBoardPresence
      .mockResolvedValueOnce({
        success: true,
        data: { userId: 'user-1', cleanup: mockCleanup },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { userId: 'user-2', cleanup: mockCleanup },
      });

    mockRedisPresenceService.getBoardPresence
      .mockResolvedValueOnce({
        success: true,
        data: { 'user-1': { displayName: 'User 1' }, 'user-2': { displayName: 'User 2' } },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { 'user-2': { displayName: 'User 2' } },
      });

    mockRedisPresenceService.updateUserPresence.mockResolvedValue({
      success: true,
      data: { updated: true },
    });

    mockRedisPresenceService.leaveBoardPresence.mockResolvedValue({
      success: true,
      data: { left: true },
    });
  }

  function setupSuccessfulPubSubMocks() {
    mockRedisPubSubService.publishGameEvent.mockResolvedValue({
      success: true,
      data: 'event-123',
    });

    mockRedisPubSubService.publishChatMessage.mockResolvedValue({
      success: true,
      data: 'msg-123',
    });

    mockRedisPubSubService.publishSystemAnnouncement.mockResolvedValue({
      success: true,
      data: 'announcement-123',
    });

    mockRedisPubSubService.getRecentEvents.mockResolvedValue({
      success: true,
      data: [
        { id: 'event-123', type: 'game_start' },
        { id: 'announcement-123', type: 'system_announcement' },
        { id: 'bulk-1', type: 'cell_marked' },
        { id: 'bulk-2', type: 'cell_marked' },
      ],
    });

    mockRedisPubSubService.getChatHistory.mockResolvedValue({
      success: true,
      data: [{ id: 'msg-123', message: 'Hello!' }],
    });

    mockRedisPubSubService.getChannelStats.mockResolvedValue({
      success: true,
      data: { totalEvents: 4, totalMessages: 1 },
    });

    mockRedisPubSubService.publishBulkEvents.mockResolvedValue({
      success: true,
      data: ['bulk-1', 'bulk-2'],
    });
  }

  function setupSuccessfulQueueMocks() {
    mockRedisQueueService.addJob.mockResolvedValue({
      success: true,
      data: 'job-123',
    });

    mockRedisQueueService.getQueueStats.mockResolvedValue({
      success: true,
      data: { waiting: 0, completed: 3 },
    });

    mockRedisQueueService.getNextJob.mockResolvedValue({
      success: true,
      data: { id: 'job-123', payload: { task: 'test' } },
    });

    mockRedisQueueService.completeJob.mockResolvedValue({
      success: true,
      data: { completed: true },
    });

    mockRedisQueueService.failJob.mockResolvedValue({
      success: true,
      data: { failed: true },
    });
  }

  function setupSuccessfulIntegrationMocks() {
    const mockCleanup = jest.fn().mockResolvedValue(undefined);

    mockRedisLocksService.withLock.mockImplementation(async (lockId, fn, options) => {
      const result = await fn();
      return { success: true, data: result };
    });

    // Mock the inner integration setup
    mockRedisPresenceService.joinBoardPresence.mockResolvedValue({
      success: true,
      data: { userId: 'user-test', cleanup: mockCleanup },
    });

    mockRedisPubSubService.publishGameEvent.mockResolvedValue({
      success: true,
      data: 'event-integration',
    });

    mockRedisQueueService.addJob.mockResolvedValue({
      success: true,
      data: 'job-integration',
    });

    // Mock the verification steps
    mockRedisPresenceService.getBoardPresence.mockResolvedValue({
      success: true,
      data: { 'user-test': { displayName: 'Integration Test User' } },
    });

    mockRedisPubSubService.getRecentEvents.mockResolvedValue({
      success: true,
      data: [{ id: 'event-integration', type: 'game_start' }],
    });

    mockRedisQueueService.getQueueStats.mockResolvedValue({
      success: true,
      data: { waiting: 1, active: 0 },
    });
  }

  function setupMixedResultMocks() {
    // Successful locks
    setupSuccessfulLocksMocks();

    // Successful presence  
    setupSuccessfulPresenceMocks();

    // Successful pubsub
    setupSuccessfulPubSubMocks();

    // Failed queue
    mockRedisQueueService.addJob.mockResolvedValue({
      success: false,
      error: 'Queue failed',
    });

    // Failed integration
    mockRedisLocksService.withLock.mockResolvedValueOnce({
      success: false,
      error: 'Integration failed',
    });
  }
});