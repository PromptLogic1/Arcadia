/**
 * @jest-environment node
 */

import {
  blacklistSession,
  isSessionBlacklisted,
  trackUserSession,
  blacklistAllUserSessions,
  cleanupExpiredBlacklist,
} from '../session-blacklist';
import { isRedisConfigured, getRedisClient } from '../redis';
import { log } from '../logger';

// Mock dependencies
jest.mock('../redis', () => ({
  getRedisClient: jest.fn(),
  isRedisConfigured: jest.fn(),
}));

jest.mock('../logger', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock crypto module
const mockDigest = jest.fn(() => 'mock-hash-digest');
const mockUpdate = jest.fn().mockReturnValue({ digest: mockDigest });
const mockCreateHash = jest.fn(() => ({ update: mockUpdate }));

jest.mock('crypto', () => ({
  createHash: mockCreateHash,
}));

describe('Session Blacklist Service', () => {
  let mockRedisClient: {
    setex: jest.Mock;
    get: jest.Mock;
    srem: jest.Mock;
    sadd: jest.Mock;
    expire: jest.Mock;
    smembers: jest.Mock;
    del: jest.Mock;
  };

  let mockIsRedisConfigured: jest.Mock;
  let mockGetRedisClient: jest.Mock;
  let mockLog: typeof log;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Redis mocks
    mockRedisClient = {
      setex: jest.fn(),
      get: jest.fn(),
      srem: jest.fn(),
      sadd: jest.fn(),
      expire: jest.fn(),
      smembers: jest.fn(),
      del: jest.fn(),
    };

    mockIsRedisConfigured = isRedisConfigured as jest.Mock;
    mockGetRedisClient = getRedisClient as jest.Mock;
    mockLog = log as jest.Mocked<typeof log>;

    mockIsRedisConfigured.mockReturnValue(true);
    mockGetRedisClient.mockReturnValue(mockRedisClient);
  });

  describe('blacklistSession', () => {
    it('should successfully blacklist a session', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.srem.mockResolvedValue(1);

      const result = await blacklistSession(
        'test-session-token',
        'user-123',
        'Suspicious activity'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'session_blacklist:mock-hash-digest',
        24 * 60 * 60,
        expect.stringContaining('"userId":"user-123"')
      );

      expect(mockRedisClient.srem).toHaveBeenCalledWith(
        'user_sessions:user-123',
        'mock-hash-digest'
      );

      expect(mockLog.info).toHaveBeenCalledWith(
        'Session blacklisted',
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: 'user-123',
            reason: 'Suspicious activity',
          }),
        })
      );
    });

    it('should use default reason and expiry when not provided', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.srem.mockResolvedValue(1);

      const result = await blacklistSession('test-token', 'user-123');

      expect(result.success).toBe(true);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'session_blacklist:mock-hash-digest',
        24 * 60 * 60,
        expect.stringContaining('"reason":"Security policy"')
      );
    });

    it('should handle Redis unavailable', async () => {
      mockIsRedisConfigured.mockReturnValue(false);

      const result = await blacklistSession('test-token', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Redis unavailable');

      expect(mockLog.warn).toHaveBeenCalledWith(
        'Redis not available, session blacklisting disabled'
      );
    });

    it('should handle Redis errors', async () => {
      const redisError = new Error('Redis connection failed');
      mockRedisClient.setex.mockRejectedValue(redisError);

      const result = await blacklistSession('test-token', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe(redisError);

      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to blacklist session',
        redisError,
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: 'user-123',
          }),
        })
      );
    });

    it('should handle custom expiry time', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.srem.mockResolvedValue(1);

      const customExpiry = 3600; // 1 hour
      await blacklistSession('test-token', 'user-123', 'Test', customExpiry);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'session_blacklist:mock-hash-digest',
        customExpiry,
        expect.any(String)
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockRedisClient.setex.mockRejectedValue('String error');

      const result = await blacklistSession('test-token', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Unknown error');
    });
  });

  describe('isSessionBlacklisted', () => {
    it('should return true for blacklisted session', async () => {
      const blacklistData = JSON.stringify({
        userId: 'user-123',
        reason: 'Compromised',
        blacklistedAt: '2023-01-01T00:00:00.000Z',
      });

      mockRedisClient.get.mockResolvedValue(blacklistData);

      const result = await isSessionBlacklisted('test-token');

      expect(result.isBlacklisted).toBe(true);
      expect(result.reason).toBe('Compromised');

      expect(mockRedisClient.get).toHaveBeenCalledWith(
        'session_blacklist:mock-hash-digest'
      );
    });

    it('should return false for non-blacklisted session', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await isSessionBlacklisted('test-token');

      expect(result.isBlacklisted).toBe(false);
      expect(result.reason).toBeUndefined();
    });

    it('should return false when Redis is unavailable', async () => {
      mockIsRedisConfigured.mockReturnValue(false);

      const result = await isSessionBlacklisted('test-token');

      expect(result.isBlacklisted).toBe(false);
    });

    it('should handle invalid JSON in blacklist data', async () => {
      mockRedisClient.get.mockResolvedValue('invalid-json');

      const result = await isSessionBlacklisted('test-token');

      expect(result.isBlacklisted).toBe(false);

      expect(mockLog.warn).toHaveBeenCalledWith(
        'Invalid blacklist data format',
        expect.objectContaining({
          metadata: expect.objectContaining({
            tokenHash: 'mock-has',
          }),
        })
      );
    });

    it('should handle missing reason in blacklist data', async () => {
      const blacklistData = JSON.stringify({
        userId: 'user-123',
        blacklistedAt: '2023-01-01T00:00:00.000Z',
      });

      mockRedisClient.get.mockResolvedValue(blacklistData);

      const result = await isSessionBlacklisted('test-token');

      expect(result.isBlacklisted).toBe(true);
      expect(result.reason).toBe('Unknown reason');
    });

    it('should handle Redis errors gracefully (fail-open)', async () => {
      const redisError = new Error('Redis connection failed');
      mockRedisClient.get.mockRejectedValue(redisError);

      const result = await isSessionBlacklisted('test-token');

      expect(result.isBlacklisted).toBe(false);

      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to check session blacklist',
        redisError,
        expect.objectContaining({
          metadata: expect.objectContaining({
            tokenHash: 'test-tok',
          }),
        })
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockRedisClient.get.mockRejectedValue('String error');

      const result = await isSessionBlacklisted('test-token');

      expect(result.isBlacklisted).toBe(false);

      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to check session blacklist',
        expect.objectContaining({ message: 'Unknown error' }),
        expect.any(Object)
      );
    });

    it('should handle non-string blacklist data', async () => {
      mockRedisClient.get.mockResolvedValue(123); // number instead of string

      const result = await isSessionBlacklisted('test-token');

      expect(result.isBlacklisted).toBe(false);
    });
  });

  describe('trackUserSession', () => {
    it('should successfully track a user session', async () => {
      mockRedisClient.sadd.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      const result = await trackUserSession('test-token', 'user-123');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      expect(mockRedisClient.sadd).toHaveBeenCalledWith(
        'user_sessions:user-123',
        'mock-hash-digest'
      );

      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        'user_sessions:user-123',
        30 * 24 * 60 * 60
      );
    });

    it('should handle Redis unavailable', async () => {
      mockIsRedisConfigured.mockReturnValue(false);

      const result = await trackUserSession('test-token', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Redis unavailable');
    });

    it('should handle Redis errors', async () => {
      const redisError = new Error('Redis operation failed');
      mockRedisClient.sadd.mockRejectedValue(redisError);

      const result = await trackUserSession('test-token', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe(redisError);

      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to track user session',
        redisError,
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: 'user-123',
          }),
        })
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockRedisClient.sadd.mockRejectedValue('String error');

      const result = await trackUserSession('test-token', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Unknown error');
    });
  });

  describe('blacklistAllUserSessions', () => {
    it('should successfully blacklist all user sessions', async () => {
      const sessionHashes = ['hash1', 'hash2', 'hash3'];
      mockRedisClient.smembers.mockResolvedValue(sessionHashes);
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.del.mockResolvedValue(1);

      const result = await blacklistAllUserSessions(
        'user-123',
        'Password changed'
      );

      expect(result.success).toBe(true);
      expect(result.blacklistedCount).toBe(3);
      expect(result.error).toBeUndefined();

      expect(mockRedisClient.smembers).toHaveBeenCalledWith(
        'user_sessions:user-123'
      );

      expect(mockRedisClient.setex).toHaveBeenCalledTimes(3);
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'session_blacklist:hash1',
        24 * 60 * 60,
        expect.stringContaining('"reason":"Password changed"')
      );

      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'user_sessions:user-123'
      );

      expect(mockLog.info).toHaveBeenCalledWith(
        'All user sessions blacklisted',
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: 'user-123',
            reason: 'Password changed',
            blacklistedCount: 3,
          }),
        })
      );
    });

    it('should handle no active sessions', async () => {
      mockRedisClient.smembers.mockResolvedValue([]);

      const result = await blacklistAllUserSessions('user-123');

      expect(result.success).toBe(true);
      expect(result.blacklistedCount).toBe(0);

      expect(mockRedisClient.setex).not.toHaveBeenCalled();
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should use default reason when not provided', async () => {
      const sessionHashes = ['hash1'];
      mockRedisClient.smembers.mockResolvedValue(sessionHashes);
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.del.mockResolvedValue(1);

      const result = await blacklistAllUserSessions('user-123');

      expect(result.success).toBe(true);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'session_blacklist:hash1',
        24 * 60 * 60,
        expect.stringContaining('"reason":"Password changed"')
      );
    });

    it('should handle Redis unavailable', async () => {
      mockIsRedisConfigured.mockReturnValue(false);

      const result = await blacklistAllUserSessions('user-123');

      expect(result.success).toBe(false);
      expect(result.blacklistedCount).toBe(0);
      expect(result.error?.message).toBe('Redis unavailable');
    });

    it('should handle Redis errors', async () => {
      const redisError = new Error('Redis operation failed');
      mockRedisClient.smembers.mockRejectedValue(redisError);

      const result = await blacklistAllUserSessions('user-123');

      expect(result.success).toBe(false);
      expect(result.blacklistedCount).toBe(0);
      expect(result.error).toBe(redisError);

      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to blacklist all user sessions',
        redisError,
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: 'user-123',
          }),
        })
      );
    });

    it('should handle partial failures in blacklisting sessions', async () => {
      const sessionHashes = ['hash1', 'hash2'];
      mockRedisClient.smembers.mockResolvedValue(sessionHashes);
      mockRedisClient.setex
        .mockResolvedValueOnce('OK')
        .mockRejectedValueOnce(new Error('Failed'));
      mockRedisClient.del.mockResolvedValue(1);

      const result = await blacklistAllUserSessions('user-123');

      expect(result.success).toBe(false);
      expect(result.blacklistedCount).toBe(0);
      expect(result.error?.message).toBe('Failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockRedisClient.smembers.mockRejectedValue('String error');

      const result = await blacklistAllUserSessions('user-123');

      expect(result.success).toBe(false);
      expect(result.blacklistedCount).toBe(0);
      expect(result.error?.message).toBe('Unknown error');
    });
  });

  describe('cleanupExpiredBlacklist', () => {
    it('should complete successfully when Redis is available', async () => {
      const result = await cleanupExpiredBlacklist();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      expect(mockLog.info).toHaveBeenCalledWith(
        'Blacklist cleanup completed (handled by Redis TTL)'
      );
    });

    it('should handle Redis unavailable', async () => {
      mockIsRedisConfigured.mockReturnValue(false);

      const result = await cleanupExpiredBlacklist();

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Redis unavailable');
    });

    it('should handle errors during cleanup', async () => {
      const cleanupError = new Error('Cleanup failed');
      mockGetRedisClient.mockImplementation(() => {
        throw cleanupError;
      });

      const result = await cleanupExpiredBlacklist();

      expect(result.success).toBe(false);
      expect(result.error).toBe(cleanupError);

      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to cleanup blacklist',
        cleanupError
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockGetRedisClient.mockImplementation(() => {
        throw 'String error';
      });

      const result = await cleanupExpiredBlacklist();

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Unknown error');
    });
  });

  describe('Crypto Integration', () => {
    it('should use crypto module correctly for hashing', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.srem.mockResolvedValue(1);

      await blacklistSession('test-token', 'user-123');

      expect(mockCreateHash).toHaveBeenCalledWith('sha256');
      expect(mockUpdate).toHaveBeenCalledWith('test-token');
      expect(mockDigest).toHaveBeenCalledWith('hex');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long session tokens', async () => {
      const longToken = 'a'.repeat(10000);
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.srem.mockResolvedValue(1);

      const result = await blacklistSession(longToken, 'user-123');

      expect(result.success).toBe(true);
    });

    it('should handle special characters in session tokens', async () => {
      const specialToken = 'token!@#$%^&*()_+{}|:"<>?[];\'./,';
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.srem.mockResolvedValue(1);

      const result = await blacklistSession(specialToken, 'user-123');

      expect(result.success).toBe(true);
    });

    it('should handle empty session tokens', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.srem.mockResolvedValue(1);

      const result = await blacklistSession('', 'user-123');

      expect(result.success).toBe(true);
    });

    it('should handle very long user IDs', async () => {
      const longUserId = 'user-' + 'x'.repeat(1000);
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.srem.mockResolvedValue(1);

      const result = await blacklistSession('test-token', longUserId);

      expect(result.success).toBe(true);
    });

    it('should handle very long blacklist reasons', async () => {
      const longReason = 'Reason: ' + 'x'.repeat(10000);
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.srem.mockResolvedValue(1);

      const result = await blacklistSession('test-token', 'user-123', longReason);

      expect(result.success).toBe(true);
    });
  });
});