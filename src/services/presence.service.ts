/**
 * Main Presence Service - Redis-based implementation
 *
 * This service now uses Redis for presence tracking instead of Supabase.
 * Maintains backward compatibility with the existing interface.
 */

export * from './presence-unified.service';
