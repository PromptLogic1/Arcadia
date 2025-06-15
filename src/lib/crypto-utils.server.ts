/**
 * Server-side cryptographic utilities for secure password hashing
 * Uses Node.js built-in crypto module for security
 *
 * IMPORTANT: This file should only be imported in server-side code
 */

import { createHash, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { log } from '@/lib/logger';

const scryptAsync = promisify(scrypt);

// Secure password hashing configuration
const SALT_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Hash a password securely using scrypt
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.trim().length === 0) {
    throw new Error('Password cannot be empty');
  }

  const salt = randomBytes(SALT_LENGTH);
  const key = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

  // Format: salt:key (both base64 encoded)
  return `${salt.toString('base64')}:${key.toString('base64')}`;
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  try {
    const [saltBase64, keyBase64] = hash.split(':');
    if (!saltBase64 || !keyBase64) {
      return false;
    }

    const salt = Buffer.from(saltBase64, 'base64');
    const storedKey = Buffer.from(keyBase64, 'base64');

    const derivedKey = (await scryptAsync(
      password,
      salt,
      KEY_LENGTH
    )) as Buffer;

    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(storedKey, derivedKey);
  } catch (error) {
    // Log error without exposing hash details
    log.error('Password verification failed', error, {
      metadata: { service: 'crypto-utils', operation: 'verifyPassword' },
    });
    return false;
  }
}

/**
 * Generate a secure random session code
 */
export function generateSessionCode(length = 6): string {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const bytes = randomBytes(length);

  return Array.from(bytes, byte => charset[byte % charset.length]).join('');
}

/**
 * Hash a string using SHA-256 (for non-password data like session tokens)
 */
export function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
