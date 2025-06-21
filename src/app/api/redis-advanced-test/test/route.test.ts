/**
 * @jest-environment node
 */

import { GET, POST } from '../route';
import { log } from '@/lib/logger';
import { redisLocksService } from '@/services/redis-locks.service';
import { redisPresenceService } from '@/services/redis-presence.service';
import { redisPubSubService } from '@/services/redis-pubsub.service';
import { redisQueueService } from '@/services/redis-queue.service';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

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

      mockRedisLocksService.acquireLock.mockRejectedValue(new Error('Redis connection failed'));

      await GET(testRequest);

      // The service error should be caught by testDistributedLocks and returned as a failed result
      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          totalTests: 1,
          successfulTests: 0,
          failedTests: 1,
          results: [
            expect.objectContaining({
              test: 'Distributed Locks',
              success: false,
              error: 'Redis connection failed',
            }),
          ],
        }),
        expect.objectContaining({
          status: 207,
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
          error: null,
        })
        .mockResolvedValueOnce({
          success: true,
          data: { acquired: false, lockId: 'test-lock-123' },
          error: null,
        });

      mockRedisLocksService.getLockStatus.mockResolvedValue({
        success: true,
        data: {
          exists: true,
          holder: 'holder-1-1640995200000',
          expiresAt: Date.now() + 5000,
        },
        error: null,
      });

      mockRedisLocksService.extendLock.mockResolvedValue({
        success: true,
        data: true,
        error: null,
      });

      mockRedisLocksService.releaseLock.mockResolvedValue({
        success: true,
        data: true,
        error: null,
      });

      mockRedisLocksService.withLock.mockImplementation(async (lockId, fn, _options) => {
        try {
          const result = await fn();
          return { success: true, data: result, error: null };
        } catch (error) {
          return { 
            success: false, 
            data: null, 
            error: error instanceof Error ? error.message : String(error) 
          };
        }
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
        data: null,
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
          error: null,
        })
        .mockResolvedValueOnce({
          success: true,
          data: { acquired: false, lockId: 'test-lock-123' },
          error: null,
        });

      mockRedisLocksService.getLockStatus.mockResolvedValue({
        success: false,
        error: 'Status check failed',
        data: null,
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
          data: { 
            cleanup: mockCleanup,
            updatePresence: jest.fn().mockResolvedValue({ success: true, data: undefined, error: null }),
            getCurrentState: jest.fn().mockResolvedValue({ success: true, data: {}, error: null })
          },
          error: null,
        })
        .mockResolvedValueOnce({
          success: true,
          data: { 
            cleanup: mockCleanup,
            updatePresence: jest.fn().mockResolvedValue({ success: true, data: undefined, error: null }),
            getCurrentState: jest.fn().mockResolvedValue({ success: true, data: {}, error: null })
          },
          error: null,
        });

      mockRedisPresenceService.getBoardPresence
        .mockResolvedValueOnce({
          success: true,
          data: {
            'user-1-1640995200000': { 
              userId: 'user-1',
              displayName: 'Test User 1',
              status: 'online' as const,
              lastSeen: Date.now(),
              joinedAt: Date.now()
            },
            'user-2-1640995200000': { 
              userId: 'user-2',
              displayName: 'Test User 2',
              status: 'online' as const,
              lastSeen: Date.now(),
              joinedAt: Date.now()
            },
          },
          error: null,
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            'user-2-1640995200000': { 
              userId: 'user-2',
              displayName: 'Test User 2',
              status: 'online' as const,
              lastSeen: Date.now(),
              joinedAt: Date.now()
            },
          },
          error: null,
        });

      mockRedisPresenceService.updateUserPresence.mockResolvedValue({
        success: true,
        data: undefined,
        error: null,
      });

      mockRedisPresenceService.leaveBoardPresence.mockResolvedValue({
        success: true,
        data: undefined,
        error: null,
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
        data: null,
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
          data: { 
            cleanup: mockCleanup,
            updatePresence: jest.fn().mockResolvedValue({ success: true, data: undefined, error: null }),
            getCurrentState: jest.fn().mockResolvedValue({ success: true, data: {}, error: null })
          },
          error: null,
        })
        .mockResolvedValueOnce({
          success: true,
          data: { 
            cleanup: mockCleanup,
            updatePresence: jest.fn().mockResolvedValue({ success: true, data: undefined, error: null }),
            getCurrentState: jest.fn().mockResolvedValue({ success: true, data: {}, error: null })
          },
          error: null,
        });

      // Return only 1 user instead of expected 2
      mockRedisPresenceService.getBoardPresence.mockResolvedValue({
        success: true,
        data: {
          'user-1-1640995200000': { 
            userId: 'user-1',
            displayName: 'Test User 1',
            status: 'online' as const,
            lastSeen: Date.now(),
            joinedAt: Date.now()
          },
        },
        error: null,
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
        error: null,
      });

      mockRedisPubSubService.publishChatMessage.mockResolvedValue({
        success: true,
        data: 'msg-123',
        error: null,
      });

      mockRedisPubSubService.publishSystemAnnouncement.mockResolvedValue({
        success: true,
        data: 'announcement-123',
        error: null,
      });

      mockRedisPubSubService.getRecentEvents.mockResolvedValue({
        success: true,
        data: [
          { 
            eventId: 'event-123', 
            type: 'game_start', 
            gameId: 'test-game',
            userId: 'user-1',
            timestamp: Date.now()
          },
          { 
            eventId: 'announcement-123', 
            type: 'system_announcement',
            gameId: 'test-game',
            userId: 'system',
            timestamp: Date.now()
          },
        ],
        error: null,
      });

      mockRedisPubSubService.getChatHistory.mockResolvedValue({
        success: true,
        data: [
          { 
            id: 'msg-123', 
            message: 'Hello, this is a test message!',
            userId: 'user-1',
            username: 'Test User',
            timestamp: Date.now(),
            gameId: 'test-game',
            type: 'user' as const
          },
        ],
        error: null,
      });

      mockRedisPubSubService.getChannelStats.mockResolvedValue({
        success: true,
        data: { eventCount: 3, chatMessageCount: 1 },
        error: null,
      });

      mockRedisPubSubService.publishBulkEvents.mockResolvedValue({
        success: true,
        data: ['bulk-event-1', 'bulk-event-2'],
        error: null,
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
        data: null,
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
        error: null,
      });

      mockRedisPubSubService.publishChatMessage.mockResolvedValue({
        success: true,
        data: 'msg-123',
        error: null,
      });

      mockRedisPubSubService.publishSystemAnnouncement.mockResolvedValue({
        success: true,
        data: 'announcement-123',
        error: null,
      });

      // Return only 1 event instead of expected 2+
      mockRedisPubSubService.getRecentEvents.mockResolvedValue({
        success: true,
        data: [{ 
          eventId: 'event-123', 
          type: 'game_start', 
          gameId: 'test-game', 
          userId: 'test-user', 
          timestamp: Date.now() 
        }],
        error: null,
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
        .mockResolvedValueOnce({ success: true, data: 'job-1', error: null })
        .mockResolvedValueOnce({ success: true, data: 'job-2', error: null })
        .mockResolvedValueOnce({ success: true, data: 'job-3', error: null })
        .mockResolvedValueOnce({ success: true, data: 'failing-job', error: null });

      // Mock queue stats
      mockRedisQueueService.getQueueStats
        .mockResolvedValueOnce({
          success: true,
          data: { pending: 3, processing: 0, delayed: 0, completed: 0, failed: 0 },
          error: null,
        })
        .mockResolvedValueOnce({
          success: true,
          data: { pending: 0, processing: 0, delayed: 0, completed: 3, failed: 1 },
          error: null,
        });

      // Mock job processing
      mockRedisQueueService.getNextJob
        .mockResolvedValueOnce({
          success: true,
          data: { 
            id: 'job-1', 
            type: 'test-task',
            payload: { task: 'high-priority-task' },
            priority: 5,
            attempts: 0,
            maxAttempts: 3,
            delay: 0,
            createdAt: Date.now()
          },
          error: null,
        })
        .mockResolvedValueOnce({
          success: true,
          data: { 
            id: 'job-2', 
            type: 'test-task',
            payload: { task: 'low-priority-task' },
            priority: 5,
            attempts: 0,
            maxAttempts: 3,
            delay: 0,
            createdAt: Date.now()
          },
          error: null,
        })
        .mockResolvedValueOnce({
          success: true,
          data: { 
            id: 'failing-job', 
            type: 'test-task',
            payload: { task: 'failing-task' },
            priority: 5,
            attempts: 0,
            maxAttempts: 3,
            delay: 0,
            createdAt: Date.now()
          },
          error: null,
        })
        .mockResolvedValueOnce({
          success: true,
          data: { 
            id: 'job-3', 
            type: 'test-task',
            payload: { task: 'delayed-task' },
            priority: 5,
            attempts: 0,
            maxAttempts: 3,
            delay: 0,
            createdAt: Date.now()
          },
          error: null,
        });

      mockRedisQueueService.completeJob.mockResolvedValue({
        success: true,
        data: undefined,
        error: null,
      });

      mockRedisQueueService.failJob.mockResolvedValue({
        success: true,
        data: undefined,
        error: null,
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
        data: null,
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
        error: null,
      });

      mockRedisQueueService.getQueueStats.mockResolvedValue({
        success: false,
        data: null,
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
        error: null,
      });

      mockRedisPresenceService.getBoardPresence.mockResolvedValue({
        success: true,
        data: { 
          'user-1640995200000': { 
            userId: 'user-1640995200000',
            displayName: 'Integration Test User',
            status: 'online',
            lastSeen: Date.now(),
            joinedAt: Date.now()
          } 
        },
        error: null,
      });

      mockRedisPubSubService.getRecentEvents.mockResolvedValue({
        success: true,
        data: [{ 
          eventId: 'event-123', 
          type: 'game_start', 
          gameId: 'integration-test-1640995200000',
          userId: 'user-1640995200000',
          timestamp: Date.now()
        }],
        error: null,
      });

      mockRedisQueueService.getQueueStats.mockResolvedValue({
        success: true,
        data: { pending: 1, processing: 0, delayed: 0, completed: 0, failed: 0 },
        error: null,
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
        data: null,
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
        error: null,
      });

      // Mock verification failure
      mockRedisPresenceService.getBoardPresence.mockResolvedValue({
        success: false,
        error: 'Failed to get presence',
        data: null,
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
      mockRedisLocksService.acquireLock.mockRejectedValue('String error');

      await GET(testRequest);

      // The service error should be caught by testDistributedLocks and returned as a failed result
      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          totalTests: 1,
          successfulTests: 0,
          failedTests: 1,
          results: [
            expect.objectContaining({
              test: 'Distributed Locks',
              success: false,
              error: 'String error',
            }),
          ],
        }),
        expect.objectContaining({
          status: 207,
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
      mockRedisPresenceService.joinBoardPresence.mockRejectedValue(new Error('Presence service failed'));

      await GET(testRequest);

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          totalTests: 5,
          successfulTests: 1,
          failedTests: 4,
          results: expect.arrayContaining([
            expect.objectContaining({
              test: 'Distributed Locks',
              success: true,
            }),
            expect.objectContaining({
              test: 'Real-time Presence',
              success: false,
              error: 'Presence service failed',
            }),
          ]),
        }),
        expect.objectContaining({
          status: 207,
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
        error: null,
      })
      .mockResolvedValueOnce({
        success: true,
        data: { acquired: false, lockId: 'test-lock-123' },
        error: null,
      });

    mockRedisLocksService.getLockStatus.mockResolvedValue({
      success: true,
      data: { exists: true, holder: 'holder-1-1640995200000' },
      error: null,
    });

    mockRedisLocksService.extendLock.mockResolvedValue({
      success: true,
      data: true,
      error: null,
    });

    mockRedisLocksService.releaseLock.mockResolvedValue({
      success: true,
      data: true,
      error: null,
    });

    mockRedisLocksService.withLock.mockImplementation(async (lockId, fn, _options) => {
      try {
        const result = await fn();
        return { success: true, data: result, error: null };
      } catch (error) {
        return { 
          success: false, 
          data: null, 
          error: error instanceof Error ? error.message : String(error) 
        };
      }
    });
  }

  function setupSuccessfulPresenceMocks() {
    const mockCleanup = jest.fn().mockResolvedValue(undefined);

    mockRedisPresenceService.joinBoardPresence
      .mockResolvedValueOnce({
        success: true,
        data: { userId: 'user-1', cleanup: mockCleanup } as any,
        error: null,
      })
      .mockResolvedValueOnce({
        success: true,
        data: { userId: 'user-2', cleanup: mockCleanup } as any,
        error: null,
      });

    mockRedisPresenceService.getBoardPresence
      .mockResolvedValueOnce({
        success: true,
        data: { 'user-1': { displayName: 'User 1' }, 'user-2': { displayName: 'User 2' } } as any,
        error: null,
      })
      .mockResolvedValueOnce({
        success: true,
        data: { 'user-2': { displayName: 'User 2' } } as any,
        error: null,
      });

    mockRedisPresenceService.updateUserPresence.mockResolvedValue({
      success: true,
      data: undefined,
      error: null,
    });

    mockRedisPresenceService.leaveBoardPresence.mockResolvedValue({
      success: true,
      data: undefined,
      error: null,
    });
  }

  function setupSuccessfulPubSubMocks() {
    mockRedisPubSubService.publishGameEvent.mockResolvedValue({
      success: true,
      data: 'event-123',
      error: null,
    });

    mockRedisPubSubService.publishChatMessage.mockResolvedValue({
      success: true,
      data: 'msg-123',
      error: null,
    });

    mockRedisPubSubService.publishSystemAnnouncement.mockResolvedValue({
      success: true,
      data: 'announcement-123',
      error: null,
    });

    // Use mockResolvedValueOnce for pubsub test, then fallback for integration
    mockRedisPubSubService.getRecentEvents
      .mockResolvedValueOnce({
        success: true,
        data: [
          { eventId: 'event-123', type: 'game_start', gameId: 'test-game', userId: 'user-1', timestamp: Date.now() },
          { eventId: 'announcement-123', type: 'system_announcement', gameId: 'test-game', userId: 'system', timestamp: Date.now() },
          { eventId: 'bulk-1', type: 'cell_marked', gameId: 'test-game', userId: 'user-1', timestamp: Date.now() },
          { eventId: 'bulk-2', type: 'cell_marked', gameId: 'test-game', userId: 'user-2', timestamp: Date.now() },
        ] as any,
        error: null,
      })
      .mockResolvedValue({
        success: true,
        data: [{ eventId: 'event-integration', type: 'game_start', gameId: 'integration-test', userId: 'user-test', timestamp: Date.now() }] as any,
        error: null,
      });

    mockRedisPubSubService.getChatHistory.mockResolvedValue({
      success: true,
      data: [{ 
        id: 'msg-123', 
        message: 'Hello!', 
        type: 'user' as const, 
        userId: 'user-1', 
        gameId: 'test-game', 
        timestamp: Date.now(), 
        username: 'TestUser' 
      }],
      error: null,
    });

    mockRedisPubSubService.getChannelStats.mockResolvedValue({
      success: true,
      data: { eventCount: 4, chatMessageCount: 1 },
      error: null,
    });

    mockRedisPubSubService.publishBulkEvents.mockResolvedValue({
      success: true,
      data: ['bulk-1', 'bulk-2'],
      error: null,
    });
  }

  function setupSuccessfulQueueMocks() {
    mockRedisQueueService.addJob.mockResolvedValue({
      success: true,
      data: 'job-123',
      error: null,
    });

    mockRedisQueueService.getQueueStats.mockResolvedValue({
      success: true,
      data: { pending: 0, processing: 0, delayed: 0, completed: 3, failed: 0 },
      error: null,
    });

    mockRedisQueueService.getNextJob.mockResolvedValue({
      success: true,
      data: { 
        id: 'job-123', 
        type: 'test-job',
        payload: { task: 'test' }, 
        priority: 5,
        attempts: 0,
        maxAttempts: 3,
        delay: 0,
        createdAt: Date.now()
      },
      error: null,
    });

    mockRedisQueueService.completeJob.mockResolvedValue({
      success: true,
      data: undefined,
      error: null,
    });

    mockRedisQueueService.failJob.mockResolvedValue({
      success: true,
      data: undefined,
      error: null,
    });
  }

  function setupSuccessfulIntegrationMocks() {
    const mockCleanup = jest.fn().mockResolvedValue(undefined);

    mockRedisLocksService.withLock.mockImplementation(async (lockId, fn, _options) => {
      try {
        const result = await fn();
        return { success: true, data: result, error: null };
      } catch (error) {
        return { 
          success: false, 
          data: null, 
          error: error instanceof Error ? error.message : String(error) 
        };
      }
    });

    // Mock the inner integration setup
    mockRedisPresenceService.joinBoardPresence.mockResolvedValue({
      success: true,
      data: { userId: 'user-test', cleanup: mockCleanup } as any,
      error: null,
    });

    mockRedisPubSubService.publishGameEvent.mockResolvedValue({
      success: true,
      data: 'event-integration',
      error: null,
    });

    mockRedisQueueService.addJob.mockResolvedValue({
      success: true,
      data: 'job-integration',
      error: null,
    });

    // Mock the verification steps
    mockRedisPresenceService.getBoardPresence.mockResolvedValue({
      success: true,
      data: { 'user-test': { displayName: 'Integration Test User' } } as any,
      error: null,
    });

    // getRecentEvents is already handled in setupSuccessfulPubSubMocks

    mockRedisQueueService.getQueueStats.mockResolvedValue({
      success: true,
      data: { pending: 1, processing: 0, delayed: 0, completed: 0, failed: 0 },
      error: null,
    });
  }

  function setupMixedResultMocks() {
    // Setup successful mocks for locks, presence, and pubsub
    setupSuccessfulLocksMocks();
    setupSuccessfulPresenceMocks();
    setupSuccessfulPubSubMocks();

    // Setup queue mocks that will fail on the 4th addJob call (for failing job test)
    mockRedisQueueService.addJob
      .mockResolvedValueOnce({
        success: true,
        data: 'job-123',
        error: null,
      })
      .mockResolvedValueOnce({
        success: true,
        data: 'job-456',
        error: null,
      })
      .mockResolvedValueOnce({
        success: true,
        data: 'job-789',
        error: null,
      })
      .mockResolvedValue({
        success: false,
        error: 'Queue service failed',
        data: null,
      });

    // Setup other queue mocks for successful operations
    mockRedisQueueService.getQueueStats.mockResolvedValue({
      success: true,
      data: { pending: 3, processing: 0, delayed: 1, completed: 0, failed: 0 },
      error: null,
    });

    mockRedisQueueService.getNextJob
      .mockResolvedValueOnce({
        success: true,
        data: { 
          id: 'job-123', 
          type: 'test-job',
          payload: { task: 'high-priority-task' }, 
          priority: 8,
          attempts: 0,
          maxAttempts: 3,
          delay: 0,
          createdAt: Date.now()
        },
        error: null,
      })
      .mockResolvedValueOnce({
        success: true,
        data: { 
          id: 'job-456', 
          type: 'test-job',
          payload: { task: 'low-priority-task' }, 
          priority: 2,
          attempts: 0,
          maxAttempts: 3,
          delay: 0,
          createdAt: Date.now()
        },
        error: null,
      })
      .mockResolvedValueOnce({
        success: true,
        data: { 
          id: 'job-failing', 
          type: 'test-job',
          payload: { task: 'failing-task' }, 
          priority: 5,
          attempts: 0,
          maxAttempts: 2,
          delay: 0,
          createdAt: Date.now()
        },
        error: null,
      })
      .mockResolvedValueOnce({
        success: true,
        data: { 
          id: 'job-789', 
          type: 'test-job',
          payload: { task: 'delayed-task' }, 
          priority: 5,
          attempts: 0,
          maxAttempts: 3,
          delay: 1000,
          createdAt: Date.now()
        },
        error: null,
      });

    mockRedisQueueService.completeJob.mockResolvedValue({
      success: true,
      data: undefined,
      error: null,
    });

    mockRedisQueueService.failJob.mockResolvedValue({
      success: true,
      data: undefined,
      error: null,
    });

    // For integration test failure, we'll mock the withLock to fail specifically for integration
    // The locks test calls withLock with a different lockId pattern
    mockRedisLocksService.withLock.mockImplementation(async (lockId, fn, _options) => {
      // If this is the integration test (lockId starts with 'game-init-')
      if (lockId.startsWith('game-init-')) {
        return {
          success: false,
          error: 'Failed to acquire initialization lock',
          data: null,
        };
      }
      // Otherwise (locks test), run normally
      try {
        const result = await fn();
        return { success: true, data: result, error: null };
      } catch (error) {
        return { 
          success: false, 
          data: null, 
          error: error instanceof Error ? error.message : String(error) 
        };
      }
    });
  }
});