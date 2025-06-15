import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { log } from '@/lib/logger';

/**
 * Session Blacklist Service
 *
 * Provides Redis-based session management to blacklist compromised sessions
 * and enable immediate session invalidation.
 */

const SESSION_BLACKLIST_PREFIX = 'session_blacklist:';
const USER_SESSION_PREFIX = 'user_sessions:';

/**
 * Blacklist a session by token hash
 * @param sessionToken - The session token to blacklist
 * @param userId - The user ID associated with the session
 * @param reason - Reason for blacklisting (optional)
 * @param expirySeconds - How long to keep the blacklist entry (default: 24 hours)
 */
export async function blacklistSession(
  sessionToken: string,
  userId: string,
  reason = 'Security policy',
  expirySeconds = 24 * 60 * 60 // 24 hours
): Promise<{ success: boolean; error?: Error }> {
  try {
    if (!isRedisConfigured()) {
      log.warn('Redis not available, session blacklisting disabled');
      return { success: false, error: new Error('Redis unavailable') };
    }

    const redis = getRedisClient();

    // Create a hash of the session token for privacy
    const crypto = await import('crypto');
    const tokenHash = crypto
      .createHash('sha256')
      .update(sessionToken)
      .digest('hex');

    const blacklistKey = `${SESSION_BLACKLIST_PREFIX}${tokenHash}`;
    const userSessionKey = `${USER_SESSION_PREFIX}${userId}`;

    // Set blacklist entry with expiry
    await redis.setex(
      blacklistKey,
      expirySeconds,
      JSON.stringify({
        userId,
        reason,
        blacklistedAt: new Date().toISOString(),
      })
    );

    // Remove from user's active sessions
    await redis.srem(userSessionKey, tokenHash);

    log.info('Session blacklisted', {
      metadata: {
        userId,
        reason,
        tokenHash: tokenHash.substring(0, 8), // Only log first 8 chars
      },
    });

    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    log.error('Failed to blacklist session', err, {
      metadata: { userId, reason },
    });
    return { success: false, error: err };
  }
}

/**
 * Check if a session is blacklisted
 * @param sessionToken - The session token to check
 */
export async function isSessionBlacklisted(
  sessionToken: string
): Promise<{ isBlacklisted: boolean; reason?: string }> {
  try {
    if (!isRedisConfigured()) {
      // If Redis is unavailable, allow the session (fail-open for availability)
      return { isBlacklisted: false };
    }

    const redis = getRedisClient();

    const crypto = await import('crypto');
    const tokenHash = crypto
      .createHash('sha256')
      .update(sessionToken)
      .digest('hex');
    const blacklistKey = `${SESSION_BLACKLIST_PREFIX}${tokenHash}`;

    const blacklistData = await redis.get(blacklistKey);

    if (blacklistData && typeof blacklistData === 'string') {
      try {
        const data = JSON.parse(blacklistData);
        return {
          isBlacklisted: true,
          reason: data?.reason || 'Unknown reason',
        };
      } catch {
        log.warn('Invalid blacklist data format', {
          metadata: { tokenHash: tokenHash.substring(0, 8) },
        });
        return { isBlacklisted: false };
      }
    }

    return { isBlacklisted: false };
  } catch (error) {
    log.error(
      'Failed to check session blacklist',
      error instanceof Error ? error : new Error('Unknown error'),
      {
        metadata: { tokenHash: sessionToken.substring(0, 8) },
      }
    );
    // Fail-open: if we can't check, allow the session
    return { isBlacklisted: false };
  }
}

/**
 * Track active session for a user
 * @param sessionToken - The session token
 * @param userId - The user ID
 */
export async function trackUserSession(
  sessionToken: string,
  userId: string
): Promise<{ success: boolean; error?: Error }> {
  try {
    if (!isRedisConfigured()) {
      return { success: false, error: new Error('Redis unavailable') };
    }

    const redis = getRedisClient();

    const crypto = await import('crypto');
    const tokenHash = crypto
      .createHash('sha256')
      .update(sessionToken)
      .digest('hex');
    const userSessionKey = `${USER_SESSION_PREFIX}${userId}`;

    // Add session to user's active sessions set
    await redis.sadd(userSessionKey, tokenHash);

    // Set expiry for the user sessions set (30 days)
    await redis.expire(userSessionKey, 30 * 24 * 60 * 60);

    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    log.error('Failed to track user session', err, {
      metadata: { userId },
    });
    return { success: false, error: err };
  }
}

/**
 * Blacklist all sessions for a user (e.g., when password is changed)
 * @param userId - The user ID
 * @param reason - Reason for blacklisting all sessions
 */
export async function blacklistAllUserSessions(
  userId: string,
  reason = 'Password changed'
): Promise<{ success: boolean; blacklistedCount: number; error?: Error }> {
  try {
    if (!isRedisConfigured()) {
      return {
        success: false,
        blacklistedCount: 0,
        error: new Error('Redis unavailable'),
      };
    }

    const redis = getRedisClient();

    const userSessionKey = `${USER_SESSION_PREFIX}${userId}`;

    // Get all active sessions for the user
    const sessionHashes = await redis.smembers(userSessionKey);

    if (sessionHashes.length === 0) {
      return { success: true, blacklistedCount: 0 };
    }

    // Blacklist each session
    const blacklistPromises = sessionHashes.map(async (tokenHash: string) => {
      const blacklistKey = `${SESSION_BLACKLIST_PREFIX}${tokenHash}`;
      return await redis.setex(
        blacklistKey,
        24 * 60 * 60,
        JSON.stringify({
          userId,
          reason,
          blacklistedAt: new Date().toISOString(),
        })
      );
    });

    await Promise.all(blacklistPromises);

    // Clear user's active sessions
    await redis.del(userSessionKey);

    log.info('All user sessions blacklisted', {
      metadata: {
        userId,
        reason,
        blacklistedCount: sessionHashes.length,
      },
    });

    return { success: true, blacklistedCount: sessionHashes.length };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    log.error('Failed to blacklist all user sessions', err, {
      metadata: { userId, reason },
    });
    return { success: false, blacklistedCount: 0, error: err };
  }
}

/**
 * Clean up expired blacklist entries (for maintenance)
 * This is handled automatically by Redis TTL, but this function
 * can be used for manual cleanup or monitoring
 */
export async function cleanupExpiredBlacklist(): Promise<{
  success: boolean;
  error?: Error;
}> {
  try {
    if (!isRedisConfigured()) {
      return { success: false, error: new Error('Redis unavailable') };
    }

    const _redis = getRedisClient();

    // Redis automatically handles TTL cleanup, so this is mainly for logging
    log.info('Blacklist cleanup completed (handled by Redis TTL)');

    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    log.error('Failed to cleanup blacklist', err);
    return { success: false, error: err };
  }
}
