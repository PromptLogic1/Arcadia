/**
 * Client-safe cryptographic utilities
 * Uses Web Crypto API for browser compatibility
 *
 * For server-side Node.js crypto operations, use crypto-utils.server.ts
 */

/**
 * Generate a secure random session code using Web Crypto API
 */
export function generateSessionCode(length = 6): string {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // Use Web Crypto API for browser compatibility
  if (
    typeof window !== 'undefined' &&
    window.crypto &&
    window.crypto.getRandomValues
  ) {
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => charset[byte % charset.length]).join('');
  }

  // Fallback for server-side or environments without Web Crypto API
  // This is less secure but prevents webpack errors
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, byte => charset[byte % charset.length]).join('');
}

/**
 * Hash a string using Web Crypto API SubtleCrypto
 */
export async function hashString(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Simple fallback hash for server-side (not cryptographically secure)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Password hashing and verification should be done server-side only
 * These functions throw errors to prevent client-side usage
 */
export async function hashPassword(_password: string): Promise<string> {
  throw new Error(
    'Password hashing must be done server-side. Use API routes for password operations.'
  );
}

export async function verifyPassword(
  _password: string,
  _hash: string
): Promise<boolean> {
  throw new Error(
    'Password verification must be done server-side. Use API routes for password operations.'
  );
}
